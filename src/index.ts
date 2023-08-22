/* eslint-disable @typescript-eslint/no-explicit-any */
import { serializeArray, unserializeArray } from "./array.js";
import { serializeObject, unserializeObject } from "./object.js";

export type SerializationOptions = {
  custom?: {
    getDataType(data: any): number | undefined;
    serialize(data: any, serializeFn: (data: any) => Uint8Array): Uint8Array;
    createInstance(type: number): any;
    unserialize(
      type: number,
      instance: any,
      data: Uint8Array,
      offset: { current: number },
      unserialize: (data: any, offset: { current: number }) => Uint8Array,
    ): void;
  };
};

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const defaultOptions: SerializationOptions = {};

/**
 * default data types starting with 10000
 */
enum DataType {
  Number = 10000,
  NaN = 10001,
  NegInfinity = 10002,
  PosInfinity = 10003,
  Boolean = 10004,
  String = 10005,
  Object = 10006,
  Array = 10007,
  Null = 10008,
  Undefined = 1009,
}

export function serialize(
  rootData: any,
  options: SerializationOptions = defaultOptions,
): Uint8Array {
  const nonPrimitiveMap = new Map<number, Array<{ value: any; serialized: Uint8Array }>>();
  let byteLength = 0;

  function addNonPrimitive(
    type: number,
    value: any,
    serialize: (value: any, serializeFn: (value: any) => Uint8Array) => Uint8Array,
  ): number {
    let entry = nonPrimitiveMap.get(type);
    if (entry == null) {
      nonPrimitiveMap.set(type, (entry = []));
      byteLength += 2; //non primtive type, entries length
    }
    let index = entry.findIndex((entry) => entry.value === value);
    if (index === -1) {
      index = entry.length;
      const serialized = serialize(value, serializeFn);
      byteLength += serialized.byteLength;
      entry.push({
        value,
        serialized,
      });
    }
    return index;
  }

  const serializeFn = (data: any): Uint8Array => {
    return serializeEntry(data, options, addNonPrimitive);
  };

  const rootEntry = serializeFn(rootData);

  byteLength += rootEntry.byteLength;

  //construct result array
  const result = new Uint8Array(byteLength);
  let offset = 0;
  result.set(rootEntry, 0);
  offset += rootEntry.byteLength;

  for (const [dataType, entries] of nonPrimitiveMap) {
    result[offset++] = dataType;
    result[offset++] = entries.length;
    for (const { serialized } of entries) {
      result.set(serialized, offset);
      offset += serialized.byteLength;
    }
  }

  return result;
}

function serializeEntry(
  data: any,
  options: SerializationOptions,
  addNonPrimitive: (
    type: number,
    value: any,
    serialize: (data: any, serializeFn: (data: any) => Uint8Array) => Uint8Array,
  ) => number,
): Uint8Array {
  if (options.custom != null) {
    const { serialize: customSerialize, getDataType } = options.custom;
    const dataType = getDataType(data);
    if (dataType != null) {
      if (!Number.isInteger(dataType) || dataType < 0 || dataType >= 10000) {
        throw new Error(`data type must be a integer between (including) 0 and 9999`);
      }
      const index = addNonPrimitive(dataType, data, customSerialize);
      return new Uint8Array([dataType, index]);
    }
  }

  switch (typeof data) {
    case "number": {
      if (isFinite(data)) {
        const result = new Uint8Array();
        result[0] = DataType.Number;
        const view = new DataView(result.buffer);
        view.setFloat64(1, data);
        return result;
      }
      return new Uint8Array([
        isNaN(data)
          ? DataType.NaN
          : data === Infinity
          ? DataType.PosInfinity
          : DataType.NegInfinity,
      ]);
    }
    case "boolean":
      return new Uint8Array([DataType.Boolean, data ? 1 : 0]);
    case "string": {
      const stringBuffer = textEncoder.encode(data);
      const result = new Uint8Array(stringBuffer.byteLength + 2);
      result[0] = DataType.String;
      result[1] = stringBuffer.byteLength;
      result.set(stringBuffer, 2);
      return result;
    }
    case "object": {
      if (data === null) {
        return new Uint8Array([DataType.Null]);
      }
      const isArray = Array.isArray(data);
      const type = isArray ? DataType.Array : DataType.Object;
      return new Uint8Array([
        type,
        addNonPrimitive(type, data, isArray ? serializeArray : serializeObject),
      ]);
    }
    case "undefined":
      return new Uint8Array([DataType.Undefined]);

    case "bigint":
    case "symbol":
    case "function":
      throw new Error(`data type "${typeof data}" is not serializeable by xserialization`);
  }
}

export function unserialize(data: Uint8Array, options: SerializationOptions = defaultOptions): any {
  const nonPrimitiveMap = new Map<number, Array<any>>();

  function getNonPrimitiveValues(dataType: number): Array<any> {
    let values = nonPrimitiveMap.get(dataType);
    if (values == null) {
      nonPrimitiveMap.set(dataType, (values = []));
    }
    return values;
  }

  function getNonPrimitiveValue(dataType: number, values: Array<any>, index: number) {
    if (index in values) {
      return values[index];
    }
    const value = createValue(dataType, options);
    values[index] = value;
    return value;
  }

  function getNonPrimitive(dataType: number, index: number): any {
    const values = getNonPrimitiveValues(dataType);
    return getNonPrimitiveValue(dataType, values, index);
  }

  const offset = { current: 0 };

  function unserializeEntryFn() {
    unserializeEntry(data, offset, getNonPrimitive);
  }

  const rootEntry = unserializeEntry(data, offset, getNonPrimitive);

  while (offset.current < data.byteLength) {
    const dataType = data[offset.current++];
    const values = getNonPrimitiveValues(dataType);
    const unserializeFn = getUnserializeFunction(dataType, options);
    const entriesLength = data[offset.current++];

    for (let i = 0; i < entriesLength; i++) {
      for (let i = 0; i < entriesLength; i++) {
        const value = getNonPrimitiveValue(dataType, values, i);
        unserializeFn(value, data, offset, unserializeEntryFn);
      }
    }
  }

  return rootEntry;
}

function createValue(dataType: number, options: SerializationOptions): any {
  switch (dataType) {
    case DataType.Array:
      return [];
    case DataType.Object:
      return {};
    default:
      if (dataType > 1000) {
        throw new Error(
          `Unknown data type "${dataType}. Custom data types must be between (including) 0 and 9999."`,
        );
      }
      if (options.custom == null) {
        throw new Error(
          `Data type "${dataType}" is a custom data type but no custom serialization handler is provided.`,
        );
      }
      return options.custom.createInstance(dataType);
  }
}

function getUnserializeFunction(
  dataType: number,
  options: SerializationOptions,
): (
  value: any,
  data: Uint8Array,
  offset: {
    current: number;
  },
  unserializeFn: () => any,
) => void {
  switch (dataType) {
    case DataType.Array:
      return unserializeArray;
    case DataType.Object:
      return unserializeObject;
    default: {
      if (dataType > 1000) {
        throw new Error(
          `unknown data type "${dataType}. Custom data types must be between (including) 0 and 9999."`,
        );
      }
      if (options.custom == null) {
        throw new Error(
          `Data type "${dataType}" is a custom data type but no custom serialization handler is provided.`,
        );
      }
      const { createInstance } = options.custom;
      return createInstance.bind(options.custom, dataType);
    }
  }
}

function unserializeEntry(
  data: Uint8Array,
  offset: { current: number },
  getNonPrimitive: (dataType: number, index: number) => any,
): any {
  const dataType = data[offset.current++];
  switch (dataType) {
    case DataType.NaN:
      return NaN;
    case DataType.NegInfinity:
      return -Infinity;
    case DataType.PosInfinity:
      return Infinity;
    case DataType.Boolean:
      return data[offset.current++] === 1;
    case DataType.Null:
      return null;
    case DataType.Undefined:
      return undefined;
    case DataType.Number: {
      const start = offset.current;
      offset.current += 8;
      const view = new DataView(data.buffer, start, offset.current);
      return view.getFloat64(0);
    }
    case DataType.String: {
      const byteLength = data[offset.current++];
      const start = offset.current;
      offset.current += byteLength;
      return textDecoder.decode(data.slice(start, offset.current));
    }
    case DataType.Array:
    case DataType.Object:
    default: {
      const index = data[offset.current++];
      return getNonPrimitive(dataType, index);
    }
  }
}
