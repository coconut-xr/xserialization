import type { ActualArrayBuffer, SerializationOptions } from "./index.js";

/* eslint-disable @typescript-eslint/no-explicit-any */
export function serializeArray(
  array: Array<any>,
  serializeFn: (value: any) => Array<ActualArrayBuffer> | ActualArrayBuffer,
  options: SerializationOptions,
): Array<ActualArrayBuffer> {
  const arrayLengthView = new DataView(new ArrayBuffer(4));
  arrayLengthView.setUint32(0, array.length, options.littleEndian);
  const serializedEntries: Array<ActualArrayBuffer> = [arrayLengthView.buffer];
  for (const entry of array) {
    const serializedEntry = serializeFn(entry);
    if (Array.isArray(serializedEntry)) {
      serializedEntries.push(...serializedEntry);
    } else {
      serializedEntries.push(serializedEntry);
    }
  }
  return serializedEntries;
}

export function unserializeArray(
  target: Array<any>,
  view: DataView,
  offset: { current: number },
  unserializeEntry: () => any,
  { littleEndian }: SerializationOptions,
): void {
  const arrayLength = view.getUint32(offset.current, littleEndian);
  offset.current += 4;
  for (let i = 0; i < arrayLength; i++) {
    target.push(unserializeEntry());
  }
}
