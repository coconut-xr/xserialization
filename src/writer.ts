const DEFAULT_INITIAL_BUFFER_SIZE = 2048;

const textEncoder = new TextEncoder();

export class Writer {
  private position = 0;
  private u8array: Uint8Array;
  private view: DataView;

  constructor(
    private readonly littleEndian = true,
    initialBufferSize = DEFAULT_INITIAL_BUFFER_SIZE,
  ) {
    const buffer = new ArrayBuffer(initialBufferSize);
    this.view = new DataView(buffer);
    this.u8array = new Uint8Array(buffer);
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
    this.view.setUint8(this.position, value);
    this.position += 1;
  }

  writeU16(value: number): void {
    this.assureGrowthFits(2);
    this.view.setUint16(this.position, value, this.littleEndian);
    this.position += 2;
  }

  writeU32(value: number): void {
    this.assureGrowthFits(4);
    this.view.setUint32(this.position, value, this.littleEndian);
    this.position += 4;
  }

  writeFloat64(value: number): void {
    this.assureGrowthFits(8);
    this.view.setFloat64(this.position, value, this.littleEndian);
    this.position += 8;
  }

  /**
   * @returns the byte length of the encoded string
   */
  writeString(toWrite: string): number {
    const startPosition = this.position;

    if (toWrite.length === 0) {
      return 0;
    }

    this.assureGrowthFits(toWrite.length); //estimation to reduce overflow while writing

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { read = 0, written = 0 } = textEncoder.encodeInto(
        toWrite,
        this.u8array.subarray(this.position),
      );
      this.position += written;

      if (read === toWrite.length) {
        return this.position - startPosition;
      }

      toWrite = toWrite.slice(read);
      this.resizeTo(this.position * 2);
    }
  }

  /**
   * after the move, the writer continues to write at the @param end
   */
  move(by: number, start: number, end: number): void {
    const newEnd = by + end;
    this.assureaHas(newEnd);
    this.u8array.copyWithin(start + by, start, end);
    this.position = newEnd;
  }

  finish(): Uint8Array {
    return this.u8array.subarray(0, this.position);
  }

  private assureGrowthFits(growthByteLength: number): void {
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
    //we need to resize
    const buffer = new ArrayBuffer(newSize);
    this.view = new DataView(buffer);
    //copy into new and swap
    const u8array = new Uint8Array(buffer);
    u8array.set(this.u8array);
    this.u8array = u8array;
  }
}
