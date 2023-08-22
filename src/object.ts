import type { ActualArrayBuffer, SerializationOptions } from "./index.js";
/* eslint-disable @typescript-eslint/no-explicit-any */

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export function serializeObject(
  object: Record<string, any>,
  serializeFn: (value: any) => Array<ActualArrayBuffer> | ActualArrayBuffer,
  options: SerializationOptions,
): Array<ActualArrayBuffer> {
  const objectEntries = Object.entries(object);
  const objectLengthView = new DataView(new ArrayBuffer(4));
  objectLengthView.setUint32(0, objectEntries.length, options.littleEndian);
  const serializedEntries: Array<ActualArrayBuffer> = [objectLengthView.buffer];
  for (const [name, value] of objectEntries) {
    const serializedValue = serializeFn(value);
    const serializedName = textEncoder.encode(name);
    const serializedNameLengthView = new DataView(new ArrayBuffer(4));
    serializedNameLengthView.setUint32(0, serializedName.byteLength, options.littleEndian);
    serializedEntries.push(serializedNameLengthView.buffer, serializedName.buffer);
    if (Array.isArray(serializedValue)) {
      serializedEntries.push(...serializedValue);
    } else {
      serializedEntries.push(serializedValue);
    }
  }
  return serializedEntries;
}

export function unserializeObject(
  target: Record<string, any>,
  view: DataView,
  offset: { current: number },
  unserializeEntry: () => any,
  { littleEndian }: SerializationOptions,
): void {
  const entriesLength = view.getUint32(offset.current, littleEndian);
  offset.current += 4;
  for (let i = 0; i < entriesLength; i++) {
    const nameByteLength = view.getUint32(offset.current, littleEndian);
    offset.current += 4;
    const start = offset.current;
    offset.current += nameByteLength;
    const name = textDecoder.decode(view.buffer.slice(start, offset.current));
    target[name] = unserializeEntry();
  }
}
