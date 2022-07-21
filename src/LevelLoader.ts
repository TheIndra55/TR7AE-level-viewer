import { BufferGeometry, FileLoader, Float32BufferAttribute, Group, Int16BufferAttribute, Loader, LoadingManager, Mesh, MeshBasicMaterial, Object3D, Vector3 } from "three"
import { BufferReader } from "./BufferReader"
import { Intro } from "./Instance"
import { SectionList, TextureStore } from "./Section"
import { applyTPageFlags } from "./Util"

class LevelLoader extends Loader
{
    constructor(manager?: LoadingManager)
    {
        super(manager)
    }

    load(url, onLoad, onProgress?, onError?)
    {
        const self = this

        const loader = new FileLoader(this.manager)
        loader.setPath(this.path)
        loader.setRequestHeader(this.requestHeader)
        loader.setWithCredentials(this.withCredentials)
        loader.setResponseType("arraybuffer")

        loader.load(url, function(data: ArrayBuffer) {
            onLoad(self.parse(data))
        }, onProgress, onError)
    }

    parse(data: ArrayBuffer): LoadedTerrain
    {
        const object = new SectionList(data)
        object.LoadTextures()
        const buffer = object.buffer

        // seek to first section
        buffer.seek(object.loadData)

        const terrain = this.readTerrain(buffer, buffer.readUInt32LE())

        // read unit name
        buffer.seek(object.loadData + 128)
        buffer.seek(buffer.readUInt32LE())

        const name = buffer.readString()

        const container = new Group()

        for (let terrainGroup of terrain.terrainGroups)
        {
            // ignore skydome terraingroups
            if ((terrainGroup.flags & 0x200000) > 0)
            {
                continue
            }

            const group = new Group()
            group.position.set(-(terrainGroup.x) / 10, terrainGroup.z / 10, terrainGroup.y / 10)

            const positions = new Int16BufferAttribute(terrain.vertices, 3)
            const uvs = new Float32BufferAttribute(terrain.uvs, 2)

            // this code currently can make the renderer take really
            // long to generate the boundingspheres for large levels, might need to
            // bring al indices to the top and use groups with start:, end:, materialIndex:
            for (let strip of terrainGroup.strips)
            {
                const geometry = new BufferGeometry()

                geometry.setAttribute("position", positions)
                geometry.setAttribute("uv", uvs)

                geometry.setIndex([...strip.indices])
                
                const texture = TextureStore.textures.find(x => x.section.id == strip.texture)

                const material = new MeshBasicMaterial({map: texture?.texture})
                applyTPageFlags(material, strip.tpageid)

                const mesh = new Mesh(geometry, material)
                mesh.scale.divide(new Vector3(10, 10, 10))

                group.add(mesh)
            }

            container.add(group)
        }

        return { container, intros: terrain.intros, portals: terrain.portals, name }
    }

    private readTerrain(buffer: BufferReader, offset: number): Terrain
    {
        const terrain = new Terrain()

        buffer.seek(offset)

        buffer.skip(4)
        const numIntros = buffer.readInt32LE()
        const intros = buffer.readUInt32LE()

        const numStreamUnitPortals = buffer.readInt32LE()
        const streamUnitPortals = buffer.readUInt32LE()

        const numTerrainGroups = buffer.readInt32LE()
        const terrainGroups = buffer.readUInt32LE()

        buffer.skip(40)
        const xboxPcVertexBuffer = buffer.readUInt32LE()
        buffer.skip(12)
        const numTerrainVertices = buffer.readInt32LE()

        buffer.seek(xboxPcVertexBuffer)
        for (let i = 0; i < numTerrainVertices; i++)
        {
            const x = buffer.readInt16LE()
            const y = buffer.readInt16LE()
            const z = buffer.readInt16LE()

            buffer.skip(2)

            const color = buffer.readInt32LE()

            const u = buffer.readInt16LE()
            const v = buffer.readInt16LE()

            buffer.skip(4)

            terrain.addVertex({ x, y, z, u, v, color })
        }

        // read terraingroups
        for (let i = 0; i < numTerrainGroups; i++)
        {
            const terrainGroup = this.readTerrainGroup(buffer, terrainGroups + (i * 176))

            terrain.addTerrainGroup(terrainGroup)
        }

        // read intros
        buffer.seek(intros)
        for (let i = 0; i < numIntros; i++)
        {
            const rotation = buffer.readVector3LE()
            buffer.skip(4)
            const position = buffer.readVector3LE()

            buffer.skip(52)
            const object = buffer.readInt16LE()

            buffer.skip(2)
            const id = buffer.readInt32LE()

            var intro: Intro = { position, rotation, object, id }
            terrain.intros.push(intro)

            buffer.skip(24)
        }

        // read portals
        buffer.seek(streamUnitPortals)
        for (let i = 0; i < numStreamUnitPortals; i++)
        {
            const destination = buffer.readString(30)

            buffer.skip(18)

            const min = buffer.readVector3LE()

            buffer.skip(4)
            const max = buffer.readVector3LE()

            terrain.portals.push({ destination, min, max })

            buffer.skip(84)
        }

        return terrain
    }

    private readTerrainGroup(buffer: BufferReader, offset: number): TerrainGroup
    {
        const terrainGroup = new TerrainGroup()

        buffer.seek(offset)

        terrainGroup.x = buffer.readFloatLE()
        terrainGroup.y = buffer.readFloatLE()
        terrainGroup.z = buffer.readFloatLE()

        buffer.skip(20)
        terrainGroup.flags = buffer.readInt32LE()

        buffer.skip(32)
        const octree = buffer.readUInt32LE()

        buffer.skip(72)
        const xboxPcMaterialList = buffer.readUInt32LE()

        buffer.seek(xboxPcMaterialList)
        const numMaterials = buffer.readInt32LE()

        for (let i = 0; i < numMaterials; i++)
        {
            const tpageid = buffer.readUInt32LE()
            const flags = buffer.readUInt32LE()
            const vertexBaseOffset = buffer.readUInt32LE()

            // create a strip for each material
            const strip = new Strip(tpageid, vertexBaseOffset, flags)

            terrainGroup.addStrip(strip)

            buffer.skip(8)
        }

        if (octree != 0)
        {
            // go trough entire octree
            this.readOctree(buffer, octree, terrainGroup)
        }

        return terrainGroup
    }

    private readOctree(buffer: BufferReader, offset: number, terrainGroup: TerrainGroup)
    {
        buffer.seek(offset + 16)

        let strip = buffer.readUInt32LE()
        const numSpheres = buffer.readInt32LE()

        if (numSpheres > 8)
        {
            throw "OctreeSphere has more than 8 spheres, did we seek wrong?"
        }

        for (let i = 0; i < numSpheres; i++)
        {
            const sphere = buffer.readUInt32LE()
            const cursor = buffer.position

            if (sphere == 0) continue

            this.readOctree(buffer, sphere, terrainGroup)
            buffer.seek(cursor)
        }

        // read all texture strips for this sphere
        while (strip != 0)
        {
            buffer.seek(strip)

            const vertexCount = buffer.readInt32LE()
            if (vertexCount == 0) break
            
            buffer.skip(16)
            const matIdx = buffer.readInt32LE()

            buffer.skip(16)
            strip = buffer.readUInt32LE()
            
            const material = terrainGroup.strips[matIdx]

            // skip vmo strips until these are implemented
            if ((material.flags & 0x1C) != 0)
            {
                continue
            }

            for (let i = 0; i < vertexCount; i++)
            {
                const indice = buffer.readInt16LE()

                material.addIndice(indice)
            }
        }
    }
}

class Terrain
{
    vertices: number[]
    uvs: number[]
    terrainGroups: TerrainGroup[]
    intros: Intro[]
    portals: StreamPortal[]

    constructor()
    {
        this.vertices = []
        this.uvs = []
        this.terrainGroups = []
        this.intros = []
        this.portals = []
    }

    addVertex(vertex: TerrainVertex)
    {
        // this functions is kinda a transition from game to Three.js
        // the other functions only read the game values and here we somewhat
        // convert it to right units and put it all in a single buffer to easily
        // pass it to Three.js
        this.vertices.push(-vertex.x, vertex.z, vertex.y)
        this.uvs.push(vertex.u * 0.00024414062, vertex.v * 0.00024414062)
    }

    addTerrainGroup(terrainGroup: TerrainGroup)
    {
        this.terrainGroups.push(terrainGroup)
    }
}

class TerrainGroup
{
    x: number
    y: number
    z: number
    flags: number

    strips: Strip[]

    constructor()
    {
        this.strips = []
    }

    addStrip(strip: Strip)
    {
        this.strips.push(strip)
    }
}

class Strip
{
    indices: number[]
    tpageid: number
    texture: number
    baseOffset: number
    flags: number

    constructor(tpageid: number, baseOffset: number, flags: number)
    {
        this.indices = []

        this.tpageid = tpageid
        this.baseOffset = baseOffset
        this.flags = flags
        this.texture = tpageid & 0x1FFF
    }

    addIndice(indice: number)
    {
        this.indices.push(this.baseOffset + indice)
    }
}

class TerrainVertex
{
    x: number
    y: number
    z: number

    color: number

    u: number
    v: number
}

interface StreamPortal
{
    destination: string
    min: Vector3
    max: Vector3
}

interface LoadedTerrain
{
    name: string
    container: Object3D
    intros: Intro[]
    portals: StreamPortal[]
}

export { LevelLoader, LoadedTerrain, StreamPortal }