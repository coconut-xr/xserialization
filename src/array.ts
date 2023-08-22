export function serializeArray(
  array: Array<any>,
  serializeFn: (value: any) => Uint8Array,
): Uint8Array {
  const serializedEntries: Array<Uint8Array> = [];
  let byteLength = 1;
  for (const entry of array) {
    const serializedEntry = serializeFn(entry);
    byteLength += serializedEntry.length;
    serializedEntries.push(serializedEntry);
  }
  const result = new Uint8Array(byteLength);
  result[0] = array.length;
  let offset = 1;
  for (const array of serializedEntries) {
    result.set(array, offset);
    offset += array.byteLength;
  }
  return result;
}

export function unserializeArray(
  target: Array<any>,
  data: Uint8Array,
  offset: { current: number },
  unserializeEntry: () => any,
): void {
  const arrayLength = data[offset.current++];
  for (let i = 0; i < arrayLength; i++) {
    target.push(unserializeEntry());
  }
}
