import { Pointer, SectionList, Section } from "./Section"
import { BufferReader } from "./BufferReader"

export class OctreeSphere
{
	sections: SectionList
	section: Section
	buffer: BufferReader

	x: number
	y: number
	z: number
	r: number

	strip: Pointer
	spheres: OctreeSphere[]

	constructor(sections: SectionList, pointer: Pointer)
	{
		this.sections = sections
		this.buffer = sections.buffer
		this.section = pointer.section
		this.spheres = []

		this.buffer.seek(pointer.section.offset + pointer.offset)

		this.x = this.buffer.readFloatLE()
		this.y = this.buffer.readFloatLE()
		this.z = this.buffer.readFloatLE()
		this.r = this.buffer.readFloatLE()

		this.strip = Pointer.Here(sections, this.section)

		const numSpheres = this.buffer.readInt32LE()

		if(numSpheres > 8)
		{
			throw "Octree has more than 8 spheres"
		}

		for(let i = 0; i < numSpheres; i++)
		{
			const spherePointer = Pointer.Here(sections, this.section)
			if(spherePointer == null)
			{
				continue
			}

			const oldPosition = this.buffer.tell()

			const sphere = new OctreeSphere(sections, spherePointer)
			this.spheres.push(sphere)

			this.buffer.seek(oldPosition)
		}
	}

	GetTerrainTextureStrips(): TerrainTextureStripInfo[]
	{
		if(this.strip == null)
		{
			return []
		}

		const strips = []
		let strip = new TerrainTextureStripInfo(this.sections, this.strip)
		strips.push(strip)

		while(strip.nextTexture != null)
		{
			strip = new TerrainTextureStripInfo(this.sections, strip.nextTexture)
			strips.push(strip)
		}

		return strips
	}
}

export class TerrainTextureStripInfo
{
	sections: SectionList
	section: Section
	buffer: BufferReader

	nextTexture: Pointer
	stripVertex: number[]

	vmoObjectIndex: number

	whereAmI: number

	constructor(sections: SectionList, pointer: Pointer)
	{
		this.sections = sections
		this.buffer = sections.buffer
		this.section = pointer.section
		this.stripVertex = []

		this.buffer.seek(pointer.section.offset + pointer.offset)

		this.whereAmI = this.buffer.tell() - pointer.section.offset;

		const vertexCount = this.buffer.readInt32LE()
		this.vmoObjectIndex = this.buffer.readInt32LE()
		
		this.buffer.skip(32)
		this.nextTexture = Pointer.Here(sections, this.section)

		for(let i = 0; i < vertexCount; i++)
		{			
			this.stripVertex.push(this.buffer.readInt16LE())
		}
	}
}