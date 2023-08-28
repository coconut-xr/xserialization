/* eslint-disable @typescript-eslint/no-explicit-any */
const DEFAULT_INITIAL_BUFFER_SIZE = 2048;

const textEncoder = new TextEncoder();

export class Writer {
  private position = 0;
  private u8array: Uint8Array;
  private view: DataView;
  private nonPrimitives = new Map<any, number>();
  private nonPrimitiveCounter = 0;

  constructor(
    private readonly littleEndian: boolean = true,
    private readonly initialBufferSize = DEFAULT_INITIAL_BUFFER_SIZE,
  ) {
    const buffer = new ArrayBuffer(this.initialBufferSize);
    this.view = new DataView(buffer);
    this.u8array = new Uint8Array(buffer);
  }

  getNonPrimitiveIndex(data: any): number | undefined {
    const index = this.nonPrimitives.get(data);
    if (index == null) {
      this.nonPrimitives.set(data, this.nonPrimitiveCounter++);
      return undefined;
    }
    return index;
  }

  writeU8At(position: number, value: number): void {
    this.view.setUint8(position, value);
  }

  writeU16At(position: number, value: number): void {
    this.view.setUint16(position, value, this.littleEndian);
  }

  writeU32At(position: number, value: number): void {
    this.view.setUint32(position, value, this.littleEndian);
  }

  /**
   * @returns the start position of the growth
   */
  grow(by: number): number {
    this.assureGrowthFits(by);
    const start = this.position;
    this.position += by;
    return start;
  }

  writeU8(value: number): void {
    this.assureGrowthFits(1);
    this.writeU8Unsafe(value);
  }

  writeU16(value: number): void {
    this.assureGrowthFits(2);
    this.writeU16Unsafe(value);
  }

  writeU32(value: number): void {
    this.assureGrowthFits(4);
    this.writeU32(value);
  }

  writeFloat64(value: number): void {
    this.assureGrowthFits(8);
    this.writeFloat64Unsafe(value);
  }

  writeFloat64Unsafe(value: number): void {
    this.view.setFloat64(this.position, value, this.littleEndian);
    this.position += 8;
  }

  writeU8Unsafe(value: number): void {
    this.view.setUint8(this.position, value);
    this.position += 1;
  }

  writeU16Unsafe(value: number): void {
    this.view.setUint16(this.position, value, this.littleEndian);
    this.position += 2;
  }

  writeU32Unsafe(value: number): void {
    this.view.setUint32(this.position, value, this.littleEndian);
    this.position += 4;
  }

  /**
   * @returns the byte length of the encoded string
   */
  writeString(toWrite: string): number {
    if (toWrite.length < 10) {
      return this.writeStringManual(toWrite);
    }
    return this.writeStringNative(toWrite);
  }

  private writeStringManual(toWrite: string): number {
    const toWriteLength = toWrite.length;
    const startPosition = this.position;
    let i = 0;
    while (i < toWriteLength) {
      i = this.writeCharCode(i, toWrite);
    }
    return this.position - startPosition;
  }

  private writeCharCode(i: number, str: string): number {
    const charcode = str.charCodeAt(i);
    if (charcode < 0x80) {
      this.assureGrowthFits(1);
      this.view.setUint8(this.position++, charcode);
      return i + 1;
    } else if (charcode < 0x800) {
      this.assureGrowthFits(2);
      this.view.setUint8(this.position++, 0xc0 | (charcode >> 6));
      this.view.setUint8(this.position++, 0x80 | (charcode & 0x3f));
      return i + 1;
    } else if (charcode < 0xd800 || charcode >= 0xe000) {
      this.assureGrowthFits(3);
      this.view.setUint8(this.position++, 0xe0 | (charcode >> 12));
      this.view.setUint8(this.position++, 0x80 | ((charcode >> 6) & 0x3f));
      this.view.setUint8(this.position++, 0x80 | (charcode & 0x3f));
      return i + 1;
    } else {
      this.assureGrowthFits(2);
      this.view.setUint8(this.position++, 0xc0 | (charcode >> 6));
      const newCharcode = 0x10000 + (((charcode & 0x3ff) << 10) | (str.charCodeAt(i + 1) & 0x3ff));
      this.view.setUint8(this.position++, 0xf0 | (newCharcode >> 18));
      this.view.setUint8(this.position++, 0x80 | ((newCharcode >> 12) & 0x3f));
      this.view.setUint8(this.position++, 0x80 | ((newCharcode >> 6) & 0x3f));
      this.view.setUint8(this.position++, 0x80 | (newCharcode & 0x3f));
      return i + 2;
    }
  }

  private writeStringNative(toWrite: string): number {
    const startPosition = this.position;

    let unwritten = toWrite.length;
    let wasWritten = 0;

    if (unwritten === 0) {
      return 0;
    }

    this.assureGrowthFits(unwritten); //estimation to reduce overflow while writing

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { read = 0, written = 0 } = textEncoder.encodeInto(
        toWrite,
        this.u8array.subarray(startPosition + wasWritten),
      );
      wasWritten += written;

      if (read < unwritten) {
        unwritten -= read;
        toWrite = toWrite.slice(read);
        this.resizeTo(this.position * 2);
        continue;
      }

      this.position += wasWritten;
      return wasWritten;
    }
  }

  /**
   * after the move, the writer continues to write at the @param end
   */
  move(by: number, start: number, end: number = this.position): void {
    const newEnd = by + end;
    this.assureaHas(newEnd);
    this.u8array.copyWithin(start + by, start, end);
    this.position = newEnd;
  }

  private finish(): void {
    if (this.view.byteLength != this.initialBufferSize) {
      const buffer = new ArrayBuffer(this.initialBufferSize);
      this.view = new DataView(buffer);
      this.u8array = new Uint8Array(buffer);
    }

    //reset everything and prepare for the next round:
    this.nonPrimitives.clear();
    this.nonPrimitiveCounter = 0;
    this.position = 0;
  }

  finishReference(): Uint8Array {
    const result = this.u8array.subarray(0, this.position);

    this.finish();

    return result;
  }

  finishClone(): Uint8Array {
    const result = this.u8array.slice(0, this.position);

    this.finish();

    return result;
  }

  assureGrowthFits(growthByteLength: number): void {
    const requiredSize = this.position + growthByteLength;
    if (requiredSize < this.view.byteLength) {
      return;
    }
    this.resizeTo(requiredSize * 2);
  }

  private assureaHas(position: number): void {
    if (position < this.view.byteLength) {
      return;
    }
    this.resizeTo(position * 2);
  }

  private resizeTo(newSize: number): void {
    const buffer = new ArrayBuffer(newSize);
    this.view = new DataView(buffer);
    //copy into new and swap
    const u8array = new Uint8Array(buffer);
    u8array.set(this.u8array);
    this.u8array = u8array;
  }
}
