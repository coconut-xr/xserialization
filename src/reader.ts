/* eslint-disable @typescript-eslint/no-explicit-any */
const textDecoder = new TextDecoder();

const charCodes: Array<number> = [];

export class Reader {
  public position!: number;
  public view!: DataView;
  public uint8array!: Uint8Array;
  private nonPrimitives: Array<any> = [];
  private running: boolean = false;

  constructor(public readonly littleEndian: boolean = true) {}

  addNonPrimitive(data: any): void {
    this.nonPrimitives.push(data);
  }

  getNonPrimitive(index: number): any {
    if (!(index in this.nonPrimitives)) {
      throw new Error(`No non-primitive for pointer (index ${index}).`);
    }
    return this.nonPrimitives[index];
  }

  start(array: Uint8Array): void {
    if (this.running) {
      throw new Error(`Cannot starting the reader while running. Forgot to finish the reader?`);
    }
    this.running = true;
    this.position = 0;
    this.view = new DataView(array.buffer);
    this.uint8array = array;
  }

  finish(): void {
    this.running = false;
    this.nonPrimitives.length = 0;
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
    if (byteLength < 10) {
      return this.readStringManual(byteLength);
    }
    return this.readStringNative(byteLength);
  }

  private readStringManual(byteLength: number): string {
    const end = this.position + byteLength;
    while (this.position < end) {
      const byte1 = this.uint8array[this.position++];
      if ((byte1 & 0x80) === 0) {
        // 1 byte
        charCodes.push(byte1);
      } else if ((byte1 & 0xe0) === 0xc0) {
        // 2 bytes
        const byte2 = this.uint8array[this.position++] & 0x3f;
        charCodes.push(((byte1 & 0x1f) << 6) | byte2);
      } else if ((byte1 & 0xf0) === 0xe0) {
        // 3 bytes
        const byte2 = this.uint8array[this.position++] & 0x3f;
        const byte3 = this.uint8array[this.position++] & 0x3f;
        charCodes.push(((byte1 & 0x1f) << 12) | (byte2 << 6) | byte3);
      } else if ((byte1 & 0xf8) === 0xf0) {
        // 4 bytes
        const byte2 = this.uint8array[this.position++] & 0x3f;
        const byte3 = this.uint8array[this.position++] & 0x3f;
        const byte4 = this.uint8array[this.position++] & 0x3f;
        let unit = ((byte1 & 0x07) << 0x12) | (byte2 << 0x0c) | (byte3 << 0x06) | byte4;
        if (unit > 0xffff) {
          unit -= 0x10000;
          charCodes.push(((unit >>> 10) & 0x3ff) | 0xd800);
          unit = 0xdc00 | (unit & 0x3ff);
        }
        charCodes.push(unit);
      } else {
        charCodes.push(byte1);
      }
    }

    const result = String.fromCharCode(...charCodes);
    charCodes.length = 0;
    return result;
  }

  private readStringNative(byteLength: number): string {
    return textDecoder.decode(this.readBuffer(byteLength));
  }

  readBuffer(byteLength: number): Uint8Array {
    const start = this.position;
    this.position += byteLength;
    return this.uint8array.subarray(start, this.position);
  }
}
