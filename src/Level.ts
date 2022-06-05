import { SectionList, Section } from "./Section"
import { BufferReader } from "./BufferReader"
import { OctreeSphere } from "./Octree"
import { XboxPcMaterialList, XboxPcMaterialStripList } from "./Material"
import { Intro } from "./Instance"

export class Level
{
	sections: SectionList
	buffer: BufferReader

	terrain: number;

	backColorR: number
	backColorG: number
	backColorB: number

	numTerrainLights: number
	terrainLights: number

	constructor(sections: SectionList)
	{
		this.sections = sections
		this.buffer = sections.buffer
		const section = sections.GetSection(0)

		this.buffer.seek(section.offset)
		this.terrain = this.buffer.readUInt32LE()
		this.buffer.skip(4)

		this.backColorR = this.buffer.readUInt8()
		this.backColorG = this.buffer.readUInt8()
		this.backColorB = this.buffer.readUInt8()

		this.buffer.skip(201)
		this.numTerrainLights = this.buffer.readInt32LE();
		this.terrainLights = this.buffer.readUInt32LE()
	}

	GetTerrain(): Terrain
	{
		return new Terrain(this.sections, this.terrain)
	}

	GetLights(): TerrainLight[]
	{
		if (this.terrainLights == 0)
		{
			return []
		}

		return TerrainLight.ReadLights(this.sections, this.terrainLights, this.numTerrainLights);
	}
}

class Terrain
{
	sections: SectionList
	buffer: BufferReader

	numTerrainGroups: number
	terrainGroups: number
	numTerrainVertices: number
	XboxPcVertexBuffer: number

	numIntros: number
	intros: number

	constructor(sections: SectionList, pointer: number)
	{
		this.sections = sections
		this.buffer = sections.buffer
		
		this.buffer.seek(pointer)

		this.buffer.skip(4)
		this.numIntros = this.buffer.readInt32LE()
		this.intros = this.buffer.readUInt32LE()

		this.buffer.skip(8)
		this.numTerrainGroups = this.buffer.readInt32LE()
		this.terrainGroups = this.buffer.readUInt32LE()

		this.buffer.skip(40)
		this.XboxPcVertexBuffer = this.buffer.readUInt32LE()
		this.buffer.skip(12)
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

	vertexList: TerrainRenderVertex[]

	constructor(sections: SectionList, pointer: number, terrain: Terrain)
	{
		this.buffer = sections.buffer
		this.vertexList = []

		this.buffer.seek(pointer)

		// read till end of section
		for (let i = 0; i < terrain.numTerrainVertices; i++)
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

	collisionMesh: number
	octreeSphere: number

	globalOffset: Vector
	flags: number

	xboxPcMaterialList: XboxPcMaterialList

	constructor(sections: SectionList)
	{
		this.buffer = sections.buffer
		this.sections = sections

		this.globalOffset = this.buffer.readVectorLE();

		this.buffer.skip(20)
		this.flags = this.buffer.readUInt32LE()


		// buffer position is already at terraingroup start
		this.buffer.skip(20)
		this.collisionMesh = this.buffer.readUInt32LE()
		this.buffer.skip(8)
		this.octreeSphere = this.buffer.readUInt32LE()

		this.buffer.skip(72)
		const materialList = this.buffer.readUInt32LE()

		// store position since code below seeks
		const position = this.buffer.position;

		if(materialList != 0)
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

	static ReadTerrainGroups(sections: SectionList, pointer: number, numTerrainGroups: number): TerrainGroup[]
	{
		const buffer = sections.buffer
		const terrainGroups = []

		buffer.seek(pointer)
		
		for(let i = 0; i < numTerrainGroups; i++)
		{
			// read all terrain groups, assuming constructor leaves buffer at end of terraingroup position
			const terraingroup = new TerrainGroup(sections)
			terrainGroups.push(terraingroup)
		}

		return terrainGroups
	}
}

export class TerrainLight
{
	x: number
	y: number
	z: number
	radius: number
	r: number
	g: number
	b: number
	type: number

	constructor(sections: SectionList)
	{
		const buffer = sections.buffer

		this.x = buffer.readInt32LE()
		this.y = buffer.readInt32LE()
		this.z = buffer.readInt32LE()

		this.radius = buffer.readInt32LE()

		this.r = buffer.readUInt8()
		this.g = buffer.readUInt8()
		this.b = buffer.readUInt8()
		this.type = buffer.readUInt8()

		buffer.skip(16)
	}

	static ReadLights(sections: SectionList, pointer: number, numLights: number): TerrainLight[]
	{
		const buffer = sections.buffer
		const lights = []

		buffer.seek(pointer)

		for (let i = 0; i < numLights; i++)
		{
			const light = new TerrainLight(sections)
			lights.push(light)
		}

		return lights
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
