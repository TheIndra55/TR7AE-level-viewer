import { BufferGeometry, Float32BufferAttribute, Int16BufferAttribute, Material, MeshStandardMaterial, Uint8BufferAttribute } from "three";
import { BufferReader } from "./BufferReader";
import { TextureStore } from "./Section";
import { applyTPageFlags } from "./Util";

class BGObjectLoader
{
    parse(buffer: BufferReader, offset: number, numBGObject: number): BGObject[]
    {
        const bgObjects = []

        for (let i = 0; i < numBGObject; i++)
        {
            // read the BGObject
            const bgObject = this.loadBGObject(buffer, offset + (i * 96))

            // create the Three.js geometry and materials
            const geometry = new BufferGeometry()
            geometry.setAttribute("position", new Int16BufferAttribute(bgObject.vertices, 3))
            geometry.setAttribute("uv", new Float32BufferAttribute(bgObject.uvs, 2))
            geometry.setAttribute("color", new Uint8BufferAttribute(bgObject.colors, 3, true))

            const indices = []
            const groups = []
            const materials = []

            for (let strip of bgObject.strips)
            {
                groups.push({ start: indices.length, count: strip.indices.length, materialIndex: strip.tpageid })
                indices.push(...strip.indices)

                if (!materials[strip.tpageid])
                {
                    const texture = TextureStore.textures.find(x => x.section.id == strip.texture)
    
                    materials[strip.tpageid] = new MeshStandardMaterial({map: texture?.texture, vertexColors: true, flatShading: true })
                    applyTPageFlags(materials[strip.tpageid], strip.tpageid)
                }
            }

            geometry.setIndex([...indices])
            geometry.groups = [...groups]

            // add the geometry and materials to BGObject
            bgObject.geometry = geometry
            bgObject.materials = materials

            bgObjects.push(bgObject)
        }

        return bgObjects
    }

    loadBGObject(buffer: BufferReader, offset: number): BGObject
    {
        buffer.seek(offset)

        const bgObject = new BGObject()

        const scaleX = buffer.readFloatLE()
        const scaleY = buffer.readFloatLE()
        const scaleZ = buffer.readFloatLE()

        buffer.skip(36)
        let bgStripInfo = buffer.readUInt32LE()

        buffer.skip(16)
        const vertices = buffer.readUInt32LE()
        const numVertices = buffer.readUInt32LE()

        const colorList = buffer.readUInt32LE()

        // read vertex colors
        buffer.seek(colorList)
        for (let i = 0; i < numVertices; i++)
        {
            bgObject.addVertexColor(buffer.readUInt32LE())
        }
        
        // read vertices
        buffer.seek(vertices)
        for (let i = 0; i < numVertices; i++)
        {
            const x = buffer.readInt16LE() * scaleX
            const y = buffer.readInt16LE() * scaleY
            const z = buffer.readInt16LE() * scaleZ

            buffer.skip(2)

            const u = buffer.readInt16LE()
            const v = buffer.readInt16LE()

            bgObject.addVertex({ x, y, z, u, v })
        }

        // read strips
        while(bgStripInfo != 0)
        {
            buffer.seek(bgStripInfo)

            const vertexCount = buffer.readInt32LE()
            if (vertexCount == 0) break

            buffer.skip(8)
            const tpageid = buffer.readUInt32LE()

            buffer.skip(8)
            bgStripInfo = buffer.readUInt32LE()

            const strip = new Strip(tpageid)
            bgObject.addStrip(strip)

            for (let i = 0; i < vertexCount; i++)
            {
                strip.addIndice(buffer.readInt16LE())
            }
        }

        return bgObject
    }
}

class BGObject
{
    vertices: number[]
    uvs: number[]
    colors: number[]
    strips: Strip[]

    geometry: BufferGeometry
    materials: Material[]

    constructor()
    {
        this.vertices = []
        this.uvs = []
        this.colors = []
        this.strips = []
    }

    addVertex(vertex: BGVertex)
    {
        this.vertices.push(-vertex.x, vertex.z, vertex.y)
        this.uvs.push(vertex.u * 0.00024414062, vertex.v * 0.00024414062)
    }

    addStrip(mesh: Strip)
    {
        this.strips.push(mesh)
    }

    addVertexColor(color: number)
    {
        this.colors.push((color >> 16) & 0xff, (color >> 8) & 0xff, color & 0xff)
    }
}

class Strip
{
    indices: number[]
    tpageid: number
    texture: number

    constructor(tpageid: number)
    {
        this.indices = []

        this.tpageid = tpageid
        this.texture = tpageid & 0x1FFF
    }

    addIndice(indice: number)
    {
        this.indices.push(indice)
    }
}

interface BGVertex
{
    x: number
    y: number
    z: number

    u: number
    v: number
}

export { BGObjectLoader, BGObject }