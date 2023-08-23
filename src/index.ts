/* eslint-disable @typescript-eslint/no-explicit-any */
import { NonPrimitiveDataType } from "./data-type.js";
import { unserializeNonPrimitive } from "./non-primitives.js";
import { serializePrimitive, unserializePrimitive as unserializePrimitive } from "./primitives.js";
import { Reader } from "./reader.js";
import { Writer } from "./writer.js";

export type SerializationOptions = {
  custom?: {
    getDataType(data: any): number | undefined;
    serialize(writer: Writer, data: any, serializeFn: (data: any) => void): void;
    createInstance(dataType: number): any;
    unserialize(reader: Reader, dataType: number, instance: any, unserializeFn: () => any): void;
  };
  littleEndian?: boolean;
  initialBufferSize?: number;
};

export function serialize(rootData: any, options: SerializationOptions = {}): Uint8Array {
  const writer = new Writer(options.littleEndian, options.initialBufferSize);

  const nonPrimitives: Array<any> = [];
  const nonPrimitiveSerializers: Array<() => void> = [];

  function addNonPrimitive(data: any, serialize: () => void): number {
    let index = nonPrimitives.indexOf(data);
    if (index === -1) {
      index = nonPrimitives.length;
      nonPrimitives.push(data);
      nonPrimitiveSerializers.push(serialize);
    }
    return index;
  }

  const serializeEntryFn = (data: any): void => {
    return serializePrimitive(writer, data, addNonPrimitive, options.custom);
  };

  serializeEntryFn(rootData);

  for (const serializeNonPrimitive of nonPrimitiveSerializers) {
    serializeNonPrimitive();
  }

  return writer.finish();
}

export function unserialize(buffer: ArrayBuffer, options: SerializationOptions): any {
  const reader = new Reader(buffer, options.littleEndian);
  const nonPrimitives: Array<{ value: any; dataType: number }> = [];

  function getNonPrimitive(dataType: number, index: number): any {
    if (index in nonPrimitives) {
      return nonPrimitives[index].value;
    }
    return (nonPrimitives[index] = {
      value: createNonPrimitive(dataType, options.custom),
      dataType,
    });
  }

  function unserializePrimitiveFn() {
    return unserializePrimitive(reader, getNonPrimitive);
  }

  const rootEntry = unserializePrimitiveFn();

  for (let i = 0; i < nonPrimitives.length; i++) {
    const nonPrimitive = nonPrimitives[i];
    if (nonPrimitive == null) {
      throw new Error(
        `Ununsed non primitives are not supported. Non primitive at index ${i} was never used.`,
      );
    }
    const { dataType, value } = nonPrimitive;
    unserializeNonPrimitive(reader, value, dataType, options.custom, unserializePrimitiveFn);
  }

  return rootEntry;
}

function createNonPrimitive(dataType: number, custom: SerializationOptions["custom"]): any {
  if (dataType < 112) {
    if (custom == null) {
      throw new Error(
        `Data type "${dataType}" is a custom data type but no custom serialization handler is provided.`,
      );
    }
    return custom.createInstance(dataType);
    return;
  }
  if (dataType < NonPrimitiveDataType.Arr32) {
    return [];
  }
  if (dataType < NonPrimitiveDataType.Obj32x32) {
    return {};
  }
  throw new Error(`Unknown non primtive data type "${dataType}."`);
}
