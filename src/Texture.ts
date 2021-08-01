import { BufferReader } from "./BufferReader";
import { Section, SectionList } from "./Section";
import { RGB_S3TC_DXT1_Format, RGBA_S3TC_DXT5_Format, CompressedTexture, CompressedPixelFormat, LinearFilter } from "three"

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
		const data = this.buffer.slice(this.section.offset + 24, this.section.offset + this.section.size - 24)
		return new Uint8Array(data, 0, data.length)
    }

    LoadTexture()
    {
		this.texture = new PcdTextureLoader().parse(this)
    }
}

export enum D3DFORMAT
{
    D3DFMT_DXT1 = 0x31545844,
    D3DFMT_DXT5 = 0x35545844
}

// Based on https://github.com/mrdoob/three.js/blob/master/examples/jsm/loaders/DDSLoader.js
export class PcdTextureLoader //extends CompressedTextureLoader
{
    parse(texture: TextureSection): CompressedTexture
    {
        let blockBytes
		let format: CompressedPixelFormat

        switch(texture.format)
        {
            case D3DFORMAT.D3DFMT_DXT1:
                blockBytes = 8
                format = RGB_S3TC_DXT1_Format

                break;
            case D3DFORMAT.D3DFMT_DXT5:
                blockBytes = 16
                format = RGBA_S3TC_DXT5_Format

                break;
			default:
				throw "Format not implemented"
        }

		const mipmapCount = 1
		const mipmaps = []

		let width = texture.width;
		let height = texture.height;
		let dataOffset = 0

		const data = texture.GetTextureData()

		for ( let i = 0; i < mipmapCount; i ++ ) {
			const dataLength = Math.max( 4, width ) / 4 * Math.max( 4, height ) / 4 * blockBytes
			const byteArray = new Uint8Array(data.buffer, dataOffset, dataLength)
			const mipmap = { data: byteArray, width: width, height: height }
			mipmaps.push(mipmap)

			dataOffset += dataLength

			width = Math.max( width >> 1, 1 )
			height = Math.max( height >> 1, 1 )
		}

		const compressedTexture = new CompressedTexture(mipmaps, texture.width, texture.height, format)
		compressedTexture.minFilter = LinearFilter
		compressedTexture.needsUpdate = true

		return compressedTexture
    }
}