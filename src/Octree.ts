import { SectionList, Section } from "./Section"
import { BufferReader } from "./BufferReader"

export class OctreeSphere
{
	sections: SectionList
	buffer: BufferReader

	x: number
	y: number
	z: number
	r: number

	strip: number
	spheres: OctreeSphere[]

	constructor(sections: SectionList, pointer: number)
	{
		this.sections = sections
		this.buffer = sections.buffer
		this.spheres = []

		this.buffer.seek(pointer)

		this.x = this.buffer.readFloatLE()
		this.y = this.buffer.readFloatLE()
		this.z = this.buffer.readFloatLE()
		this.r = this.buffer.readFloatLE()

		this.strip = this.buffer.readUInt32LE()

		const numSpheres = this.buffer.readInt32LE()

		if(numSpheres > 8)
		{
			throw "Octree has more than 8 spheres"
		}

		for(let i = 0; i < numSpheres; i++)
		{
			const spherePointer = this.buffer.readUInt32LE()
			if(spherePointer == 0)
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
		if(this.strip == 0)
		{
			return []
		}

		const strips = []
		let strip = new TerrainTextureStripInfo(this.sections, this.strip)
		strips.push(strip)

		while(strip.nextTexture != 0 && strip.vertexCount != 0)
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
	buffer: BufferReader

    vertexCount: number
	nextTexture: number
	stripVertex: number[]

	vmoObjectIndex: number
	matIdx: number

	constructor(sections: SectionList, pointer: number)
	{
		this.sections = sections
		this.buffer = sections.buffer
		this.stripVertex = []

		this.buffer.seek(pointer)

		this.vertexCount = this.buffer.readInt32LE()
		this.vmoObjectIndex = this.buffer.readInt32LE()

		this.buffer.skip(12)
		this.matIdx = this.buffer.readInt32LE()
		
		this.buffer.skip(16)
		this.nextTexture = this.buffer.readUInt32LE()

		for(let i = 0; i < this.vertexCount; i++)
		{			
			this.stripVertex.push(this.buffer.readInt16LE())
		}
	}
}