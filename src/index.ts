/* eslint-disable @typescript-eslint/no-explicit-any */
import { unserializeArray } from "./array.js";
import { DataType } from "./data-type.js";
import { serializeEntry, unserializeEntry } from "./entry.js";
import { unserializeObject } from "./object.js";

export type ActualArrayBuffer = ArrayBuffer & {
  BYTES_PER_ELEMENT?: undefined;
};

export type SerializationOptions = {
  custom?: {
    getDataType(data: any): number | undefined;
    serialize(
      data: any,
      serializeFn: (data: any) => Array<ActualArrayBuffer> | ActualArrayBuffer,
      options: SerializationOptions,
    ): Array<ActualArrayBuffer> | ActualArrayBuffer;
    createInstance(dataType: number): any;
    unserialize(
      dataType: number,
      instance: any,
      view: DataView,
      offset: { current: number },
      unserialize: (
        data: any,
        offset: { current: number },
      ) => Array<ActualArrayBuffer> | ActualArrayBuffer,
      options: SerializationOptions,
    ): void;
  };
  littleEndian: boolean;
};

const defaultOptions: SerializationOptions = {
  littleEndian: true,
};

export function serialize(
  rootData: any,
  options: SerializationOptions = defaultOptions,
): Uint8Array {
  const nonPrimitiveMap = new Map<
    number,
    {
      values: Array<any>;
      serializedValues: Array<{ ref: ActualArrayBuffer | Array<ActualArrayBuffer> }>;
    }
  >();
  let nonPrimitivesByteLength = 0;

  function addNonPrimitive(
    dataType: number,
    value: any,
    serialize: (
      value: any,
      serializeFn: (value: any) => Array<ActualArrayBuffer> | ActualArrayBuffer,
      options: SerializationOptions,
    ) => Array<ActualArrayBuffer> | ActualArrayBuffer,
  ): number {
    let entry = nonPrimitiveMap.get(dataType);
    if (entry == null) {
      nonPrimitiveMap.set(dataType, (entry = { serializedValues: [], values: [] }));
      nonPrimitivesByteLength += 8; //non primtive type, entries length both 32 bit
    }
    const { serializedValues, values } = entry;
    let index = values.indexOf(value);
    if (index === -1) {
      const serializedRef = { ref: null as any };
      serializedValues.push(serializedRef);

      //IMPORTANT: retrieving the index and pushing must be one the same side (before/after) the serialize function, because this function recursively pushes to values
      index = values.length;
      values.push(value);

      serializedRef.ref = serialize(value, serializeFn, options);
      nonPrimitivesByteLength += getByteLength(serializedRef.ref);
    }
    return index;
  }

  const serializeFn = (data: any): Array<ActualArrayBuffer> | ActualArrayBuffer => {
    return serializeEntry(data, options, addNonPrimitive);
  };

  const rootEntry = serializeFn(rootData);
  const result = new Uint8Array(nonPrimitivesByteLength + getByteLength(rootEntry));
  const view = new DataView(result.buffer);

  //construct result array
  let offset = 0;

  if (Array.isArray(rootEntry)) {
    for (const s of rootEntry) {
      result.set(new Uint8Array(s), offset);
      offset += s.byteLength;
    }
  } else {
    result.set(new Uint8Array(rootEntry), offset);
    offset += rootEntry.byteLength;
  }

  for (const [dataType, { serializedValues }] of nonPrimitiveMap) {
    view.setUint32(offset, dataType, options.littleEndian);
    offset += 4;
    view.setUint32(offset, serializedValues.length, options.littleEndian);
    offset += 4;
    for (const { ref } of serializedValues) {
      if (Array.isArray(ref)) {
        for (const v of ref) {
          result.set(new Uint8Array(v), offset);
          offset += v.byteLength;
        }
      } else {
        result.set(new Uint8Array(ref), offset);
        offset += ref.byteLength;
      }
    }
  }

  return result;
}

function getByteLength(data: ActualArrayBuffer | Array<ActualArrayBuffer>): number {
  return Array.isArray(data) ? data.reduce((prev, s) => prev + s.byteLength, 0) : data.byteLength;
}

export function unserialize(
  _data: Uint8Array,
  options: SerializationOptions = defaultOptions,
): any {
  const view = new DataView(_data.buffer);
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
    return unserializeEntry(view, offset, getNonPrimitive, options);
  }

  const rootEntry = unserializeEntry(view, offset, getNonPrimitive, options);

  while (offset.current < view.byteLength) {
    const dataType = view.getUint32(offset.current, options.littleEndian);
    offset.current += 4;
    const values = getNonPrimitiveValues(dataType);
    const unserializeFn = getUnserializeFunction(dataType, options);
    const entriesLength = view.getUint32(offset.current, options.littleEndian);
    offset.current += 4;

    for (let i = 0; i < entriesLength; i++) {
      const value = getNonPrimitiveValue(dataType, values, i);
      unserializeFn(value, view, offset, unserializeEntryFn, options);
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
  view: DataView,
  offset: {
    current: number;
  },
  unserializeFn: () => any,
  options: SerializationOptions,
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
      const { unserialize } = options.custom;
      return unserialize.bind(options.custom, dataType);
    }
  }
}
