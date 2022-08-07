import { BufferGeometry, Float32BufferAttribute, Int16BufferAttribute } from "three";
import { BufferReader } from "./BufferReader";

enum MeshVertexType
{
    Int16,
    Int32
}

// Represents the mesh geometry used for collision and signal meshes
class MeshGeometry extends BufferGeometry
{
    constructor(buffer: BufferReader, offset: number)
    {
        super()

        this.type = "MeshGeometry"

        const vertices = []
        const faces = []

        buffer.seek(offset)

        buffer.skip(48)
        const verticesOffset = buffer.readUInt32LE()
        const facesOffset = buffer.readUInt32LE()

        buffer.skip(8)
        const vertexType: MeshVertexType = buffer.readUInt16LE()

        buffer.skip(2)
        const numFaces = buffer.readUInt16LE()
        const numVertices = buffer.readUInt16LE()

        buffer.seek(verticesOffset)
        for (let i = 0; i < numVertices; i++)
        {
            const x = this.readVertice(buffer, vertexType)
            const y = this.readVertice(buffer, vertexType)
            const z = this.readVertice(buffer, vertexType)

            vertices.push(-x, z, y)

            if (vertexType == MeshVertexType.Int32) buffer.skip(4)
        }

        buffer.seek(facesOffset)
        for (let i = 0; i < numFaces; i++)
        {
            faces.push(buffer.readUInt16LE())
            faces.push(buffer.readUInt16LE())
            faces.push(buffer.readUInt16LE())

            buffer.skip(4)
        }

        if (vertexType == MeshVertexType.Int16)
        {
            this.setAttribute("position", new Int16BufferAttribute(vertices, 3))
        }
        else
        {
            this.setAttribute("position", new Float32BufferAttribute(vertices, 3))
        }

        this.setIndex(faces)
    }

    private readVertice(buffer: BufferReader, type: MeshVertexType)
    {
        return type == MeshVertexType.Int16 ? buffer.readInt16LE() : buffer.readFloatLE()
    }
}

export { MeshGeometry }