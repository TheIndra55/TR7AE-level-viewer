import { BufferReader } from "./BufferReader";
import { Section, SectionList } from "./Section";
import { RGBA_S3TC_DXT5_Format, CompressedTexture, LinearFilter, RepeatWrapping, RGBAFormat, RGBA_S3TC_DXT1_Format } from "three"

export class TextureSection
{
    sections: SectionList
    section: Section

    buffer: BufferReader

    format: number
    bitmapSize: number
    width: number
    height: number
    numMipMaps: number
    flags: number

    texture: CompressedTexture

    constructor(sections: SectionList, section: Section)
    {
        this.sections = sections
        this.section = section
        this.buffer = sections.buffer

        this.buffer.seek(this.section.offset)

        this.buffer.skip(4) // magicNumber
        this.format = this.buffer.readInt32LE()
        this.bitmapSize = this.buffer.readUInt32LE()
        this.buffer.skip(4)
        this.width = this.buffer.readUInt16LE()
        this.height = this.buffer.readUInt16LE()
        this.buffer.skip(1)
        this.numMipMaps = this.buffer.readUInt8()
        this.flags = this.buffer.readUInt16LE()
    }

    GetTextureData()
    {
        const data = this.buffer.slice(this.section.offset + 24, this.section.offset + 24 + this.bitmapSize)
        return new Uint8Array(data, 0, data.length)
    }

    LoadTexture()
    {
        this.texture = new PcdTextureLoader().parse(this)
    }
}

export enum D3DFORMAT
{
    D3DFMT_DXT1     = 0x31545844,
    D3DFMT_DXT5     = 0x35545844,
    D3DFMT_A8R8G8B8 = 0x15
}

// Based on https://github.com/mrdoob/three.js/blob/master/examples/jsm/loaders/DDSLoader.js
export class PcdTextureLoader
{
    parse(texture: TextureSection): CompressedTexture
    {
        let blockBytes
        let format

        switch(texture.format)
        {
            case D3DFORMAT.D3DFMT_DXT1:
                blockBytes = 8
                format = RGBA_S3TC_DXT1_Format

                break
            case D3DFORMAT.D3DFMT_DXT5:
                blockBytes = 16
                format = RGBA_S3TC_DXT5_Format

                break
            case D3DFORMAT.D3DFMT_A8R8G8B8:
                format = RGBAFormat

                break
            default:
                throw "Format not implemented"
        }

        const mipmapCount = 1
        const mipmaps = []

        let width = texture.width;
        let height = texture.height;
        let dataOffset = 0

        const data = texture.GetTextureData()

        for (let i = 0; i < mipmapCount; i++)
        {
            let dataLength, byteArray
            
            if (format == RGBAFormat)
            {
                byteArray = this.loadARGBMip(data.buffer, dataOffset, width, height)
                dataLength = byteArray.length
            }
            else
            {
                dataLength = Math.max(4, width) / 4 * Math.max(4, height) / 4 * blockBytes
                byteArray = new Uint8Array(data.buffer, dataOffset, dataLength)
            }

            const mipmap = {data: byteArray, width: width, height: height}
            mipmaps.push(mipmap)

            dataOffset += dataLength

            width = Math.max(width >> 1, 1)
            height = Math.max(height >> 1, 1)
        }

        const compressedTexture = new CompressedTexture(mipmaps, texture.width, texture.height, format)
        compressedTexture.minFilter = LinearFilter
        compressedTexture.wrapS = RepeatWrapping
        compressedTexture.wrapT = RepeatWrapping
        
        compressedTexture.needsUpdate = true

        return compressedTexture
    }
    
    // copied from orginal three.js DDSLoader
    loadARGBMip(buffer, dataOffset, width, height)
    {
        const dataLength = width * height * 4
        const srcBuffer = new Uint8Array(buffer, dataOffset, dataLength)
        const byteArray = new Uint8Array(dataLength)
        let dst = 0
        let src = 0
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const a = srcBuffer[src]; src++
                const r = srcBuffer[src]; src++
                const g = srcBuffer[src]; src++
                const b = srcBuffer[src]; src++
                byteArray[dst] = r; dst++	//r
                byteArray[dst] = g; dst++	//g
                byteArray[dst] = b; dst++	//b
                byteArray[dst] = a; dst++	//a
            }
        }
    
        return byteArray;
    }
}
