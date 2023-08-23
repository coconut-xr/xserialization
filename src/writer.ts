const DEFAULT_INITIAL_BUFFER_SIZE = 2048;

export class Writer {
  private position = 0;
  private bufferSize: number;
  private u8array: Uint8Array;
  private view: DataView;

  constructor(
    private readonly littleEndian = true,
    initialBufferSize = DEFAULT_INITIAL_BUFFER_SIZE,
  ) {
    this.bufferSize = initialBufferSize;
    const buffer = new ArrayBuffer(this.bufferSize);
    this.view = new DataView(buffer);
    this.u8array = new Uint8Array(buffer);
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

  writeU8Array(array: ArrayLike<number>): void {
    this.assureGrowthFits(array.length);
    this.u8array.set(array, this.position);
    this.position += array.length;
  }

  finish(): Uint8Array {
    return this.u8array.slice(0, this.position);
  }

  private assureGrowthFits(growthByteLength: number): void {
    const requiredSize = this.position + growthByteLength;
    if (requiredSize < this.bufferSize) {
      return;
    }
    //we need to resize
    this.bufferSize = requiredSize * 2;
    const buffer = new ArrayBuffer(this.bufferSize);
    this.view = new DataView(buffer);
    //copy into new and swap
    const u8array = new Uint8Array(buffer);
    u8array.set(this.u8array);
    this.u8array = u8array;
  }
}
