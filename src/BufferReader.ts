import { Buffer } from "buffer"
import { Vector3 } from "three";

export class BufferReader {
	buffer: Buffer;
	position: number;

	constructor(buff: Buffer) {
		this.position = 0
		this.buffer = buff
	}

	readInt8(): number {
		const ret = this.buffer.readInt8(this.position)

		this.position += 1
		return ret
	}

	readUInt8(): number {
		const ret = this.buffer.readUInt8(this.position)

		this.position += 1
		return ret
	}

	readInt16LE(): number {
		const ret = this.buffer.readInt16LE(this.position)

		this.position += 2
		return ret
	}

	readUInt16LE(): number {
		const ret = this.buffer.readUInt16LE(this.position)

		this.position += 2
		return ret
	}

	readInt32LE(): number {
		const ret = this.buffer.readInt32LE(this.position)

		this.position += 4
		return ret
	}

	readUInt32LE(): number {
		const ret = this.buffer.readUInt32LE(this.position)

		this.position += 4
		return ret
	}

	readFloatLE(): number {
		const ret = this.buffer.readFloatLE(this.position)

		this.position += 4
		return ret
	}

	readVector3LE(): Vector3 {
		return new Vector3(this.readFloatLE(), this.readFloatLE(), this.readFloatLE())
	}

	readString(length?: number): string {
		const end = this.buffer.indexOf(0, this.position)
		const ret = this.buffer.toString("ascii", this.position, end)

		this.position += length ?? (end - this.position)

		return ret;
	}
	
	seek(position: number) {
		this.position = position
	}

	skip(offset: number) {
		this.position += offset
	}

	tell(): number {
		return this.position
	}

	slice(start?: number, end?: number): Buffer
	{
		return this.buffer.slice(start, end)
	}
}
