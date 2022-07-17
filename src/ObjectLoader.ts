import { BufferGeometry, FileLoader, Float32BufferAttribute, Group, Int16BufferAttribute, Loader, LoadingManager, Mesh, MeshBasicMaterial } from "three";
import { BufferReader } from "./BufferReader";
import { SectionList, TextureStore } from "./Section"

class ObjectLoader extends Loader
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

    parse(data: ArrayBuffer)
    {
        const object = new SectionList(data)
        object.LoadTextures()
        const buffer = object.buffer
        
        // seek to first section
        buffer.seek(object.loadData)

        buffer.skip(24)
        const numModels = buffer.readInt16LE()

        buffer.skip(6)
        const modelList = buffer.readUInt32LE()

        buffer.seek(modelList)

        // load first model
        const model = this.loadModel(buffer, buffer.readUInt32LE())

        const container = new Group()

        for (let strip of model.strips)
        {
            const geometry = new BufferGeometry()
            geometry.setAttribute("position", new Int16BufferAttribute(model.vertices, 3))
            geometry.setAttribute("uv", new Float32BufferAttribute(model.uvs, 2))

            geometry.setIndex([...strip.indices])

            const texture = TextureStore.textures.find(x => x.section.id == strip.texture)

            const mesh = new Mesh(geometry, new MeshBasicMaterial({map: texture.texture}))

            container.add(mesh)
        }

        return container;
    }

    private loadModel(buffer: BufferReader, offset: number): Model
    {
        const model = new Model()

        buffer.seek(offset)

        const version = buffer.readInt32LE()
        if (version != 79823955)
        {
            throw "Model version does not match, found " + version
        }
        
        buffer.skip(12)
        const scaleX = buffer.readFloatLE()
        const scaleY = buffer.readFloatLE()
        const scaleZ = buffer.readFloatLE()

        buffer.skip(4)
        const numVertices = buffer.readInt32LE()
        const vertices = buffer.readUInt32LE()

        // store old cursor position
        const cursor = buffer.position

        buffer.seek(vertices)
        for (let i = 0; i < numVertices; i++)
        {
            const x = buffer.readInt16LE() * scaleX
            const y = buffer.readInt16LE() * scaleY
            const z = buffer.readInt16LE() * scaleZ

            buffer.skip(6)
            const u = buffer.readUInt16LE()
            const v = buffer.readUInt16LE()

            model.addVertex({ x, y, z, u, v })
        }

        buffer.seek(cursor + 48)
        let textureStripInfo = buffer.readUInt32LE()

        while(textureStripInfo != 0)
        {
            buffer.seek(textureStripInfo)

            const vertexCount = buffer.readInt16LE()
            if (vertexCount == 0) break

            buffer.skip(2)
            const tpageid = buffer.readUInt32LE()

            buffer.skip(8)
            textureStripInfo = buffer.readUInt32LE() // read the next strip

            const strip = new Strip(tpageid)
            model.addStrip(strip)

            for (let i = 0; i < vertexCount; i++)
            {
                strip.addIndice(buffer.readInt16LE())
            }
        }

        return model
    }
}

function float16ToFloat32(short)
{
    var buf = new ArrayBuffer(4);
    var view = new DataView(buf);
    view.setUint32(0, short << 16)

    return view.getFloat32(0)
}

class Model
{
    vertices: number[]
    uvs: number[]
    strips: Strip[]

    constructor()
    {
        this.vertices = []
        this.uvs = []
        this.strips = []
    }

    addVertex(vertex: ModelVertex)
    {
        this.vertices.push(-vertex.x, vertex.z, vertex.y)
        this.uvs.push(float16ToFloat32(vertex.u), float16ToFloat32(vertex.v))
    }

    addStrip(mesh: Strip)
    {
        this.strips.push(mesh)
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

interface ModelVertex
{
    x: number
    y: number
    z: number

    u: number
    v: number
}

export { ObjectLoader }