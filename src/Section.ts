import { Buffer } from "buffer"
import { BufferReader } from "./BufferReader"

export class Section
{
	offset: number
	size: number
	type: number

	index: number

	numRelocations: number
	relocations: Relocation[]

	constructor()
	{
		this.relocations = []
	}

	static ReadSection(buffer: BufferReader): Section
	{
		const section = new Section()
		section.size = buffer.readUInt32LE()
		section.type = buffer.readInt8()

		buffer.skip(3)
		const packedData = buffer.readInt32LE()
		section.numRelocations = packedData >> 8
		buffer.skip(8)

		return section
	}

	ReadRelocations(buffer: BufferReader)
	{
		for(let i = 0; i < this.numRelocations; i++)
		{
			const relocation = new Relocation()

			const typeAndSectionInfo = buffer.readInt16LE()
			buffer.skip(2)

			relocation.section = typeAndSectionInfo >> 3
			relocation.offset = buffer.readUInt32LE();

			this.relocations.push(relocation)
		}

		this.offset = buffer.tell()
	}

	GetRelocationForOffset(offset: number): Relocation
	{
		return this.relocations.find(x => x.offset == offset)
	}

	GetRelocationForPosition(position: number): Relocation
	{
		const offset = position - this.offset
		return this.relocations.find(x => x.offset == offset)
	}
}

class Relocation
{
	section: number;
	offset: number;
}

export class SectionList
{
	sections: Section[]
	buffer: BufferReader

	constructor(data: ArrayBuffer)
	{
		const buf = Buffer.from(data)

		this.buffer = new BufferReader(buf);
		this.sections = []

		const version = this.buffer.readInt32LE()
		if(version != 14)
		{
			throw `DRM file has wrong version, expected 14 but got ${version}`
		}

		const numSections = this.buffer.readUInt32LE();
		for(let i = 0; i < numSections; i++)
		{
			const section = Section.ReadSection(this.buffer);
			section.index = i

			this.sections.push(section)
		}

		for(let section of this.sections)
		{
			section.ReadRelocations(this.buffer);
			this.buffer.skip(section.size);
		}

		console.log(`numSections = ${numSections}`)
	}

	GetSection(index: number)
	{
		return this.sections[index]
	}
}

export class Pointer
{
	index: number
	offset: number

	section: Section;

	constructor(sections: SectionList, section: number, offset: number)
	{
		this.index = section
		this.offset = offset

		this.section = sections.GetSection(this.index)
	}

	static Here(sections: SectionList, section: Section): Pointer
	{
		const buffer = sections.buffer
		const offset = buffer.tell() - section.offset
		const relocation = section.GetRelocationForOffset(offset)

		if(relocation == null)
		{
			buffer.readUInt32LE()
			return null
		}

		return new Pointer(sections, relocation.section, buffer.readUInt32LE())
	}
}