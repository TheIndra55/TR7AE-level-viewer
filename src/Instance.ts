import { BufferReader } from "./BufferReader";
import { Vector } from "./Level";
import { Pointer, Section, SectionList } from "./Section";

export class Intro {
    buffer: BufferReader
    section: Section

    position: Vector
    rotation: Vector
    object: number
    id: number

    constructor(sections: SectionList) {
        this.buffer = sections.buffer

        this.rotation = this.buffer.readVectorLE()
        this.buffer.skip(4)
        this.position = this.buffer.readVectorLE()

        this.buffer.skip(52)
        this.object = this.buffer.readInt16LE()

        this.buffer.skip(2)
        this.id = this.buffer.readInt32LE()

        this.buffer.skip(24)
    }

    static ReadIntros(sections: SectionList, pointer: Pointer, numIntros: number): Intro[] {
        const buffer = sections.buffer
        const intros = []

        buffer.seek(pointer.section.offset + pointer.offset)

        for (let i = 0; i < numIntros; i++)
        {
            const intro = new Intro(sections)
            intros.push(intro)
        }

        return intros
    }
}
