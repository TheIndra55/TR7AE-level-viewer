import { Buffer } from "buffer"
import { BufferReader } from "./BufferReader"
import { TextureSection } from "./Texture"

interface Section
{
    offset: number
    size: number
    type: SectionType
    id: number

    numRelocations: number
    relocations: Relocation[]
}

interface Relocation
{
	section: number
	offset: number
}

enum SectionType
{
	General = 0,
	Empty = 1,
	Animation = 2,
	Texture = 5,
}

class SectionList
{
	sections: Section[]
	buffer: BufferReader

	constructor(data: Buffer)
	{
        const buffer = new BufferReader(data)

		this.buffer = buffer
		this.sections = []

		const version = buffer.readInt32LE()

		if (version != 14)
		{
			throw `Wrong DRM version, expected 14 but got ${version}`
		}

		const numSections = buffer.readUInt32LE();

        // read all section headers
		for (let i = 0; i < numSections; i++)
		{
            // @ts-ignore
            let section: Section = { relocations: [] }

            section.size = buffer.readUInt32LE()
            section.type = buffer.readUInt8();

            buffer.skip(3)

            const packedData = buffer.readUInt32LE()
            section.numRelocations = packedData >> 8
            section.id = buffer.readUInt32LE()

            buffer.skip(4)

            this.sections.push(section)
		}
        
		for(let section of this.sections)
		{
            // read relocations
            for (let i = 0; i < section.numRelocations; i++)
            {
                const typeAndSectionInfo = buffer.readUInt16LE()
                buffer.skip(2)
                const offset = buffer.readUInt32LE()

                const relocation: Relocation = { section: typeAndSectionInfo >> 3, offset }
                section.relocations.push(relocation)
            }

            section.offset = buffer.position

            // skip past section data
			this.buffer.skip(section.size);
		}

        // relocate file
        for (let section of this.sections)
        {
            this.Relocate(section)
        }
	}

    private Relocate(section: Section)
    {
        // orginal buffer to write to
        const buffer = this.buffer.buffer

        for (let relocation of section.relocations)
        {
            const position = section.offset + relocation.offset
            const otherSection = this.sections[relocation.section]

            // read the pointer and write the pointer back with section offset added
            const offset = buffer.readUInt32LE(position)
            buffer.writeUInt32LE(otherSection.offset + offset, position)
        }
    }

	LoadTextures()
	{
		for(let section of this.sections)
		{
			if(section.type == SectionType.Texture)
			{
				const texture = new TextureSection(this, section)

				texture.LoadTexture()
				TextureStore.textures.push(texture)
			}
		}
	}

	GetSection(index: number)
	{
		return this.sections[index]
	}
}

class TextureStore
{
	static textures: TextureSection[] = []
}

export { Section, Relocation, SectionType, SectionList, TextureStore }