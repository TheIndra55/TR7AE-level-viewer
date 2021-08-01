import { Buffer } from "buffer"
import { DataUtils } from "three/src/extras/DataUtils"

// https://stackoverflow.com/a/5684578/9398242
function float16_to_float(h) {
    const s = (h & 0x8000) >> 15;
    const e = (h & 0x7C00) >> 10;
    const f = h & 0x03FF;

    if(e == 0) {
        return (s?-1:1) * Math.pow(2,-14) * (f/Math.pow(2, 10));
    } else if (e == 0x1F) {
        return f?NaN:((s?-1:1)*Infinity);
    }

    return (s?-1:1) * Math.pow(2, e-15) * (1+(f/Math.pow(2, 10)));
}

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
		const half = this.readUInt16LE()
		return float16_to_float(half) * 2048
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
