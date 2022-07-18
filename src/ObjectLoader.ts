import { Bone, BufferGeometry, FileLoader, Float32BufferAttribute, Int16BufferAttribute, Loader, LoadingManager, MeshBasicMaterial, Skeleton, SkinnedMesh, Vector3 } from "three";
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

        // prepare three mesh
        const bones = model.segments.map(x => x.bone)
        const skeleton = new Skeleton(bones)

        const geometry = new BufferGeometry()
        geometry.setAttribute("position", new Int16BufferAttribute(model.vertices, 3))
        geometry.setAttribute("uv", new Float32BufferAttribute(model.uvs, 2))

        const indices = []
        const groups = []
        const materials = []

        for (let strip of model.strips)
        {
            groups.push({ start: indices.length, count: strip.indices.length, materialIndex: strip.texture })
            indices.push(...strip.indices)

            if (!materials[strip.texture])
            {
                const texture = TextureStore.textures.find(x => x.section.id == strip.texture)

                materials[strip.texture] = new MeshBasicMaterial({map: texture.texture})
            }
        }

        geometry.setIndex([...indices])
        geometry.groups = [...groups]

        const mesh = new SkinnedMesh(geometry, materials)
        mesh.add(bones[0])
        mesh.bind(skeleton)

        mesh.scale.divide(new Vector3(10, 10, 10))

        return mesh;
    }

    private createBones(model: Model): Bone[]
    {
        for (let segment of model.segments)
        {
            segment.bone = new Bone()
            segment.bone.position.set(segment.position.x, segment.position.z, segment.position.y)
        }

        for (let segment of model.segments)
        {
            if (segment.parent != -1)
            {
                model.segments[segment.parent].bone.add(segment.bone)
            }
        }

        return model.segments.map(x => x.bone)
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

        const numSegments = buffer.readInt32LE()
        const numVirtSegments = buffer.readInt32LE()

        const segmentList = buffer.readUInt32LE()
        
        const scaleX = buffer.readFloatLE()
        const scaleY = buffer.readFloatLE()
        const scaleZ = buffer.readFloatLE()

        buffer.skip(4)
        const numVertices = buffer.readInt32LE()
        const vertices = buffer.readUInt32LE()

        // store old cursor position
        const cursor = buffer.position

        buffer.seek(segmentList)
        for (let i = 0; i < numSegments; i++)
        {
            buffer.skip(32)
            const position = buffer.readVector3LE()

            buffer.skip(12)
            const parent = buffer.readInt32LE()

            model.segments.push({ parent, position })

            buffer.skip(4)
        }

        // quick array to map virtsegments to segments
        // later virtsegments should be read entirely
        // to get the weights too
        const virtSegments = []
        for (let i = 0; i < numVirtSegments; i++)
        {
            buffer.skip(56)
            const index = buffer.readInt16LE()

            virtSegments.push(index)

            buffer.skip(6)
        }

        const bones = this.createBones(model)

        buffer.seek(vertices)
        for (let i = 0; i < numVertices; i++)
        {
            let x = buffer.readInt16LE() * scaleX
            let y = buffer.readInt16LE() * scaleY
            let z = buffer.readInt16LE() * scaleZ

            buffer.skip(4)
            const segment = buffer.readInt16LE()

            const u = buffer.readUInt16LE()
            const v = buffer.readUInt16LE()

            let bone = segment

            // if segment exceeds the numSegments it must be a virtSegment
            if (segment > (numSegments - 1))
            {
                bone = virtSegments[segment - numSegments]
            }
            
            // get bone privot
            const vec = new Vector3()
            bones[bone].getWorldPosition(vec)
            
            // transform vertice through bone
            vec.add(new Vector3(x, z, y))

            x = vec.x
            y = vec.z
            z = vec.y

            model.addVertex({ x, y, z, u, v, segment })
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
    segments: Segment[]

    constructor()
    {
        this.vertices = []
        this.uvs = []
        this.strips = []
        this.segments = []
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

interface Segment
{
    parent: number
    position: Vector3
    bone?: Bone
}

interface ModelVertex
{
    x: number
    y: number
    z: number

    segment: number

    u: number
    v: number
}

export { ObjectLoader }