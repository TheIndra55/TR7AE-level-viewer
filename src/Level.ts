import { SectionList, Section, Pointer } from "./Section"
import { BufferReader } from "./BufferReader"
import { OctreeSphere } from "./Octree"
import { XboxPcMaterialList, XboxPcMaterialStripList } from "./Material"
import { Intro } from "./Instance"

export class Level
{
	sections: SectionList
	buffer: BufferReader

	section: Section;
	terrain: Pointer;

	backColorR: number
	backColorG: number
	backColorB: number

	constructor(sections: SectionList)
	{
		this.sections = sections
		this.buffer = sections.buffer
		this.section = sections.GetSection(0)

		this.buffer.seek(this.section.offset)
		this.terrain = Pointer.Here(this.sections, this.section)
		this.buffer.skip(4)

		this.backColorR = this.buffer.readUInt8()
		this.backColorG = this.buffer.readUInt8()
		this.backColorB = this.buffer.readUInt8()
	}

	GetTerrain(): Terrain
	{
		return new Terrain(this.sections, this.terrain)
	}
}

class Terrain
{
	sections: SectionList
	buffer: BufferReader

	section: Section

	numTerrainGroups: number
	terrainGroups: Pointer
	numTerrainVertices: number
	XboxPcVertexBuffer: Pointer

	numIntros: number
	intros: Pointer

	constructor(sections: SectionList, pointer: Pointer)
	{
		this.sections = sections
		this.buffer = sections.buffer
		this.section = pointer.section
		
		this.buffer.seek(this.section.offset + pointer.offset)

		this.buffer.skip(4)
		this.numIntros = this.buffer.readInt32LE()
		this.intros = Pointer.Here(sections, this.section)

		this.buffer.skip(8)
		this.numTerrainGroups = this.buffer.readInt32LE()
		this.terrainGroups = Pointer.Here(sections, this.section)

		this.buffer.skip(40)
		this.XboxPcVertexBuffer = Pointer.Here(sections, this.section)
		this.buffer.skip(16)
		this.numTerrainVertices = this.buffer.readInt32LE()
	}

	GetTerrainVertexList(): TerrainRenderVertexList
	{
		return new TerrainRenderVertexList(this.sections, this.XboxPcVertexBuffer, this)
	}

	GetTerrainGroups(): TerrainGroup[]
	{
		return TerrainGroup.ReadTerrainGroups(this.sections, this.terrainGroups, this.numTerrainGroups)
	}

	GetIntros(): Intro[]
	{
		return Intro.ReadIntros(this.sections, this.intros, this.numIntros)
	}
}

export class TerrainRenderVertexList
{
	buffer: BufferReader
	section: Section

	vertexList: TerrainRenderVertex[]

	constructor(sections: SectionList, pointer: Pointer, terrain: Terrain)
	{
		this.buffer = sections.buffer
		this.section = pointer.section
		this.vertexList = []

		this.buffer.seek(this.section.offset + pointer.offset)

		// read till end of section
		while(this.buffer.position < (this.section.offset + this.section.size))
		{
			const vertex = this.ReadVertex()
			this.vertexList.push(vertex)
		}
	}

	private ReadVertex(): TerrainRenderVertex
	{
		const vertex = new TerrainRenderVertex()
		vertex.x = this.buffer.readInt16LE()
		vertex.y = this.buffer.readInt16LE()
		vertex.z = this.buffer.readInt16LE()
		this.buffer.skip(2)

		vertex.color = this.buffer.readInt32LE()

		vertex.u = this.buffer.readInt16LE() * 0.00024414062
		vertex.v = this.buffer.readInt16LE() * 0.00024414062

		this.buffer.skip(4)

		return vertex
	}
}

class TerrainRenderVertex
{
	x: number
	y: number
	z: number
	
	color: number

	u: number
	v: number
}

export class TerrainGroup
{
	buffer: BufferReader
	sections: SectionList
	section: Section

	collisionMesh: Pointer
	octreeSphere: Pointer

	globalOffset: Vector
	flags: number

	xboxPcMaterialList: XboxPcMaterialList

	constructor(sections: SectionList, section: Section)
	{
		this.buffer = sections.buffer
		this.sections = sections
		this.section = section

		this.globalOffset = this.buffer.readVectorLE();

		this.buffer.skip(20)
		this.flags = this.buffer.readUInt32LE()


		// buffer position is already at terraingroup start
		this.buffer.skip(20)
		this.collisionMesh = Pointer.Here(sections, section)
		this.buffer.skip(8)
		this.octreeSphere = Pointer.Here(sections, section)

		this.buffer.skip(72)
		const materialList = Pointer.Here(sections, section)

		// store position since code below seeks
		const position = this.buffer.position;

		if(materialList)
		{
			this.xboxPcMaterialList = new XboxPcMaterialList(sections, materialList)
		}

		// skip to end
		this.buffer.seek(position + 28)
	}

	GetOctreeSphere(): OctreeSphere
	{
		return new OctreeSphere(this.sections, this.octreeSphere)
	}

	GetMaterial(matId: number): XboxPcMaterialStripList
	{
		return this.xboxPcMaterialList.materials[matId]
	}

	static ReadTerrainGroups(sections: SectionList, pointer: Pointer, numTerrainGroups: number): TerrainGroup[]
	{
		const buffer = sections.buffer
		const terrainGroups = []

		buffer.seek(pointer.section.offset + pointer.offset)
		
		for(let i = 0; i < numTerrainGroups; i++)
		{
			// read all terrain groups, assuming constructor leaves buffer at end of terraingroup position
			const terraingroup = new TerrainGroup(sections, pointer.section)
			terrainGroups.push(terraingroup)
		}

		return terrainGroups
	}
}

export class Vector
{
	constructor(x: number, y:number, z:number)
	{
		this.x = x
		this.y = y
		this.z = z
	}

	x: number
	y: number
	z: number
}
