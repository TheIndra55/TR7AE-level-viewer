import { BufferGeometry, Color, FileLoader, Float32BufferAttribute, Group, Int16BufferAttribute, Loader, LoadingManager, Matrix4, Mesh, MeshStandardMaterial, Object3D, Uint8BufferAttribute, Vector3 } from "three"
import { BGObject, BGObjectLoader } from "./BGObject"
import { BufferReader } from "./BufferReader"
import { Intro } from "./Instance"
import { MeshGeometry } from "./Mesh"
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

        // read background color
        buffer.seek(object.loadData + 8)
        const background = new Color(buffer.readUInt8() / 255, buffer.readUInt8() / 255, buffer.readUInt8() / 255)

        // read unit name
        buffer.seek(object.loadData + 128)
        buffer.seek(buffer.readUInt32LE())

        const name = buffer.readString()

        // seek to markup
        buffer.seek(object.loadData + 96)
        const numMarkups = buffer.readInt32LE()
        const markupList = buffer.readUInt32LE()

        // read player name
        buffer.skip(128);
        buffer.seek(buffer.readUInt32LE())

        const playerName = buffer.readString()

        const markup = this.readMarkUp(buffer, numMarkups, markupList, 
            // HACK
            // since Crystal Dynamics did not increment the level version
            // number between these games, we check for next generation mesh
            // data to determine if this is Legend or Anniversary
            terrain.cdcRenderDataId != 0)

        const container = new Group()

        const vertexBuffer = terrain.vertexBuffer.createBuffers()
        const vmoVertexBuffer = terrain.vmoVertexBuffer.createBuffers()

        // add terraingroups to scene
        for (let terrainGroup of terrain.terrainGroups)
        {
            // ignore skydome terraingroups
            if ((terrainGroup.flags & 0x200000) > 0)
            {
                continue
            }

            const group = new Group()
            group.position.set(-(terrainGroup.x) / 10, terrainGroup.z / 10, terrainGroup.y / 10)

            // this code currently can make the renderer take really
            // long to generate the boundingspheres for large levels, might need to
            // bring al indices to the top and use groups with start:, end:, materialIndex:
            for (let strip of terrainGroup.strips)
            {
                const geometry = new BufferGeometry()

                const buffer = (strip.flags & 0x1C) == 0 ? vertexBuffer : vmoVertexBuffer

                geometry.setAttribute("position", buffer.positions)
                geometry.setAttribute("uv", buffer.uvs)
                geometry.setAttribute("color", buffer.colors)

                geometry.setIndex([...strip.indices])

                const texture = TextureStore.textures.find(x => x.section.id == strip.texture)

                const material = new MeshStandardMaterial({map: texture?.texture, vertexColors: true, flatShading: true})
                applyTPageFlags(material, strip.tpageid)

                const mesh = new Mesh(geometry, material)
                mesh.scale.divide(new Vector3(10, 10, 10))

                group.add(mesh)
            }

            container.add(group)
        }

        // add BGInstances to scene
        for (let bgInstance of terrain.bgInstances)
        {
            const bgObject = terrain.bgObjects[bgInstance.object]

            const mesh = new Mesh(bgObject.geometry, bgObject.materials)
            mesh.applyMatrix4(bgInstance.matrix)

            mesh.scale.divide(new Vector3(10, 10, 10))
            mesh.position.divide(new Vector3(10, 10, 10))

            container.add(mesh)
        }

        return {
            container,
            intros: terrain.intros,
            portals: terrain.portals,
            name,
            signalMesh: terrain.signalMesh,
            terrainGroups: terrain.terrainGroups,
            markup,
            playerName,
            background,
        }
    }

    private readTerrain(buffer: BufferReader, offset: number): Terrain
    {
        if (offset == 0)
        {
            throw "Cannot to read terrain, Level->terrain is a nullptr"
        }

        const terrain = new Terrain()

        buffer.seek(offset)

        buffer.skip(4)
        const numIntros = buffer.readInt32LE()
        const intros = buffer.readUInt32LE()

        const numStreamUnitPortals = buffer.readInt32LE()
        const streamUnitPortals = buffer.readUInt32LE()

        const numTerrainGroups = buffer.readInt32LE()
        const terrainGroups = buffer.readUInt32LE()

        const signalTerrainGroup = buffer.readUInt32LE()

        buffer.skip(8)

        const numBGInstances = buffer.readInt32LE()
        const bgInstanceList = buffer.readUInt32LE()

        const numBGObjects = buffer.readInt32LE()
        const bgObjectList = buffer.readUInt32LE()

        buffer.skip(12)
        const xboxPcVertexBuffer = buffer.readUInt32LE()
        const xboxPcVmoBuffer = buffer.readUInt32LE()
        buffer.skip(8)
        const numTerrainVertices = buffer.readInt32LE()
        buffer.skip(4)
        const numTerrainVMOVertices = buffer.readInt32LE()

        terrain.cdcRenderDataId = buffer.readUInt32LE();

        if (xboxPcVertexBuffer == 0)
        {
            throw "Failed to read vertices, Terrain->xboxPcVertexBuffer is nullptr"
        }

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

        buffer.seek(xboxPcVmoBuffer)
        for (let i = 0; i < numTerrainVMOVertices; i++)
        {
            const x = buffer.readInt16LE()
            const y = buffer.readInt16LE()
            const z = buffer.readInt16LE()

            buffer.skip(2)

            const color = buffer.readInt32LE()

            const u = buffer.readInt16LE()
            const v = buffer.readInt16LE()

            buffer.skip(20)

            terrain.addVmoVertex({ x, y, z, u, v, color })
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

        // read BGInstances
        buffer.seek(bgInstanceList)
        for (let i = 0; i < numBGInstances; i++)
        {
            const matrix = buffer.readMatrixLE()

            buffer.skip(128)
            const object = buffer.readUInt32LE()

            terrain.bgInstances.push({ object: (object - bgObjectList) / 96, matrix })

            buffer.skip(44)
        }

        // read and load BGObjects
        if (numBGObjects > 0)
        {
            terrain.bgObjects = new BGObjectLoader().parse(buffer, bgObjectList, numBGObjects)
        }
        
        // read signal mesh
        buffer.seek(signalTerrainGroup + 56)
        const signalmesh = buffer.readUInt32LE()

        if (signalmesh != 0)
        {
            terrain.signalMesh = new MeshGeometry(buffer, signalmesh)
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

        buffer.skip(20)
        const collisionMesh = buffer.readUInt32LE()

        buffer.skip(8)
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

        terrainGroup.collision = new MeshGeometry(buffer, collisionMesh)

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

            for (let i = 0; i < vertexCount; i++)
            {
                const indice = buffer.readInt16LE()

                material.addIndice(indice)
            }
        }
    }

    private readMarkUp(buffer: BufferReader, numMarkUps: number, offset: number, isLegend: boolean): MarkUp[]
    {
        buffer.seek(offset)

        const markups: MarkUp[] = []

        for (let i = 0; i < numMarkUps; i++)
        {
            buffer.skip(12)
            if (!isLegend) buffer.skip(28)

            const flags = buffer.readUInt32LE()

            // associated intro, used for markup such as water
            const intro = buffer.readInt16LE()
            const id = buffer.readInt16LE()

            const position = buffer.readVector3LE()

            buffer.skip(12)
            const polyLine = buffer.readUInt32LE()

            // keep old cursor since we're seeking
            const cursor = buffer.position
            const segments = []

            if (polyLine != 0)
            {
                // read markup polyline
                buffer.seek(polyLine)

                const numSegments = buffer.readInt32LE()

                // padding
                buffer.skip(12);
                
                for (let j = 0; j < numSegments; j++)
                {
                    const segment = buffer.readVector3LE()
                    segment.divideScalar(10)

                    // cursed vector transformations
                    segments.push(new Vector3(-segment.x, segment.z, segment.y))

                    buffer.skip(4)
                }
            }

            markups.push({ flags, intro, polyLine: segments, id, position })

            buffer.seek(cursor)
        }

        return markups
    }
}

class Terrain
{
    terrainGroups: TerrainGroup[]
    intros: Intro[]
    portals: StreamPortal[]
    signalMesh: MeshGeometry
    cdcRenderDataId: number

    bgInstances: BGInstance[]
    bgObjects: BGObject[]

    vertexBuffer: TerrainVertexBuffer
    vmoVertexBuffer: TerrainVertexBuffer

    constructor()
    {
        this.terrainGroups = []
        this.intros = []
        this.portals = []
        this.cdcRenderDataId = 0

        this.bgInstances = []
        this.bgObjects = []

        this.vertexBuffer = new TerrainVertexBuffer()
        this.vmoVertexBuffer = new TerrainVertexBuffer()
    }

    addVertex(vertex: TerrainVertex)
    {
        this.vertexBuffer.addVertex(vertex)
    }

    addVmoVertex(vertex: TerrainVertex)
    {
        this.vmoVertexBuffer.addVertex(vertex)
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
    collision: MeshGeometry

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

class TerrainVertexBuffer
{
    vertices: number[]
    uvs: number[]
    colors: number[]

    constructor()
    {
        this.vertices = []
        this.uvs = []
        this.colors = []
    }

    addVertex(vertex: TerrainVertex)
    {
        // this functions is kinda a transition from game to Three.js
        // the other functions only read the game values and here we somewhat
        // convert it to right units and put it all in a single buffer to easily
        // pass it to Three.js
        this.vertices.push(-vertex.x, vertex.z, vertex.y)
        this.uvs.push(vertex.u * 0.00024414062, vertex.v * 0.00024414062)
        this.colors.push((vertex.color >> 16) & 0xff, (vertex.color >> 8) & 0xff, vertex.color & 0xff)
    }

    createBuffers()
    {
        const positions = new Int16BufferAttribute(this.vertices, 3)
        const uvs = new Float32BufferAttribute(this.uvs, 2)
        const colors = new Uint8BufferAttribute(this.colors, 3, true)

        return { positions, uvs, colors }
    }
}

interface StreamPortal
{
    destination: string
    min: Vector3
    max: Vector3
}

interface MarkUp
{
    flags: number
    intro: number
    position: Vector3
    id: number
    polyLine: Vector3[]
}

interface BGInstance
{
    object: number
    matrix: Matrix4
}

interface LoadedTerrain
{
    name: string
    container: Object3D
    intros: Intro[]
    portals: StreamPortal[]
    terrainGroups: TerrainGroup[]
    signalMesh: MeshGeometry | undefined
    markup: MarkUp[],
    playerName: string
    background: Color
}

export { LevelLoader, LoadedTerrain, StreamPortal }