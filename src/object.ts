const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export function serializeObject(
  object: Record<string, any>,
  serializeFn: (value: any) => Uint8Array,
): Uint8Array {
  const serializedEntries: Array<[Uint8Array, Uint8Array]> = [];
  let byteLength = 1;
  const objectEntries = Object.entries(object);
  for (const [name, value] of objectEntries) {
    const serializedValue = serializeFn(value);
    const serializedName = textEncoder.encode(name);
    byteLength += 1 + serializedName.length + serializedValue.length;
    serializedEntries.push([serializedName, serializedValue]);
  }
  const result = new Uint8Array(byteLength);
  result[0] = objectEntries.length;
  let offset = 1;
  for (const [name, value] of serializedEntries) {
    result[offset++] = name.byteLength;
    result.set(name, offset);
    offset += name.byteLength;
    result.set(value, offset);
    offset += value.byteLength;
  }
  return result;
}

export function unserializeObject(
  target: Record<string, any>,
  data: Uint8Array,
  offset: { current: number },
  unserializeEntry: () => any,
): void {
  const entriesLength = data[offset.current++];
  for (let i = 0; i < entriesLength; i++) {
    const nameByteLength = data[offset.current++];
    const start = offset.current;
    offset.current += nameByteLength;
    const name = textDecoder.decode(data.slice(start, offset.current));
    target[name] = unserializeEntry();
  }
}
