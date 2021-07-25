import { MeshBasicMaterial } from "three"
import { BufferReader } from "./BufferReader"
import { Pointer, Section, SectionList } from "./Section"

export class XboxPcMaterialList
{
    sections: SectionList
    section: Section

    buffer: BufferReader

	materials: XboxPcMaterialStripList[]

	constructor(sections: SectionList, pointer: Pointer)
    {
        this.sections = sections
        this.section = pointer.section
        this.buffer = sections.buffer

		this.buffer.seek(this.section.offset + pointer.offset)

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
