/* eslint-disable @typescript-eslint/no-explicit-any */
import { serializeValue, deserializeValue } from "./values.js";
import { Reader } from "./reader.js";
import { Writer } from "./writer.js";

export type SerializationOptions = {
  custom?: {
    getDataType(data: any): number | undefined;
    serialize(writer: Writer, data: any, serialize: (data: any) => void): void;
    deserialize(reader: Reader, dataType: number, deserialize: () => any): any;
  };
};

export function serialize(
  data: any,
  writer: Writer = new Writer(),
  options: SerializationOptions = {},
): Uint8Array {
  const nonPrimitives = new Map<any, number>();
  let counter = 0;

  function getNonPrimitiveIndex(data: any): number | undefined {
    const index = nonPrimitives.get(data);
    if (index == null) {
      nonPrimitives.set(data, counter++);
      return undefined;
    }
    return index;
  }

  serializeValue({ writer, getNonPrimitiveIndex, ...options }, data);

  return writer.finish();
}

export function deserialize(reader: Reader, options: SerializationOptions = {}): any {
  const nonPrimitives: Array<any> = [];

  function addNonPrimitive(data: any): void {
    nonPrimitives.push(data);
  }

  function getNonPrimitive(index: number): any {
    if (!(index in nonPrimitives)) {
      throw new Error(`No non-primitive for pointer (index ${index}).`);
    }
    return nonPrimitives[index];
  }

  return deserializeValue({ reader, getNonPrimitive, addNonPrimitive, ...options });
}

export { Writer, Reader };
