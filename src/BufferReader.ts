import { Buffer } from "buffer"
import * as ieee754 from "ieee754"

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

	readShortFloatLE(): number
	{
		//const ret = ieee754.read(this.buffer, this.position, true, 10, 2)
		const temp = new ArrayBuffer(4);
		const view = new DataView(temp);
		view.setInt32(0, this.buffer.readUInt16LE(this.position) << 16);

		this.position += 2

		return view.getFloat32(0)
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
}