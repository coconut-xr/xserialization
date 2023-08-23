const textDecoder = new TextDecoder();

export class Reader {
  private position = 0;
  private view: DataView;

  constructor(
    data: ArrayBufferLike & {
      BYTES_PER_ELEMENT?: undefined;
    },
    private readonly littleEndian = true,
  ) {
    this.view = new DataView(data);
  }

  readU8(): number {
    const readAt = this.position;
    this.position += 1;
    return this.view.getUint8(readAt);
  }

  readU16(): number {
    const readAt = this.position;
    this.position += 2;
    return this.view.getUint16(readAt, this.littleEndian);
  }

  readU32(): number {
    const readAt = this.position;
    this.position += 4;
    return this.view.getUint32(readAt, this.littleEndian);
  }

  readFloat64(): number {
    const readAt = this.position;
    this.position += 8;
    return this.view.getFloat64(readAt, this.littleEndian);
  }

  readString(byteLength: number): string {
    return textDecoder.decode(this.readBuffer(byteLength));
  }

  readBuffer(byteLength: number): Uint8Array {
    const start = this.position;
    this.position += byteLength;
    return new Uint8Array(this.view.buffer).subarray(start, this.position);
  }
}
