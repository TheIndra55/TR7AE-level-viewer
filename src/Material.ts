import { MeshBasicMaterial } from "three"
import { BufferReader } from "./BufferReader"
import { Section, SectionList } from "./Section"

export class XboxPcMaterialList
{
    sections: SectionList

    buffer: BufferReader

	materials: XboxPcMaterialStripList[]

	constructor(sections: SectionList, pointer: number)
    {
        this.sections = sections
        this.buffer = sections.buffer

		this.buffer.seek(pointer)

		const numMaterials = this.buffer.readInt32LE()
		this.materials = []

		for(let i = 0; i < numMaterials; i++)
		{
			const material = <XboxPcMaterialStripList>{}
			material.tpageid = this.buffer.readUInt32LE()
			material.flags = this.buffer.readUInt32LE()
			material.vbBaseOffset = this.buffer.readUInt32LE()
			material.texture = material.tpageid & 0x1FFF

			this.materials.push(material)
			this.buffer.skip(8)
		}
	}
}

export interface XboxPcMaterialStripList
{
	tpageid: number;
	flags: number;
	vbBaseOffset: number;

	texture: number;

	// used for level viewer
	material: MeshBasicMaterial
}
