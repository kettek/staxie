// ResizableBuffer is a crummy and inefficient wrapper around Buffer to allow for dynamically resizing of a "Buffer".
export class ResizableBuffer {
  buffer: Buffer
  bufferOffset: number
  constructor() {
    this.buffer = Buffer.alloc(0)
  }
  write(value: string): number {
    let buffer = Buffer.alloc(value.length)
    this.bufferOffset += buffer.write(value, 0)
    this.buffer = Buffer.concat([this.buffer, buffer])
    return this.bufferOffset
  }
  writeUInt8(value: number): number {
    let buffer = Buffer.alloc(1)
    this.bufferOffset += buffer.writeUInt8(value, 0)
    this.buffer = Buffer.concat([this.buffer, buffer])
    return this.bufferOffset
  }
  writeUInt16BE(value: number): number {
    let buffer = Buffer.alloc(2)
    this.bufferOffset += buffer.writeUInt16BE(value, 0)
    this.buffer = Buffer.concat([this.buffer, buffer])
    return this.bufferOffset
  }
  writeUInt32BE(value: number): number {
    let buffer = Buffer.alloc(4)
    this.bufferOffset += buffer.writeUInt32BE(value, 0)
    this.buffer = Buffer.concat([this.buffer, buffer])
    return this.bufferOffset
  }
}