/* eslint-disable @typescript-eslint/no-explicit-any */
import { serializeArray } from "./array.js";
import { DataType } from "./data-type.js";
import { SerializationOptions, ActualArrayBuffer } from "./index.js";
import { serializeObject } from "./object.js";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export function serializeEntry(
  data: any,
  options: SerializationOptions,
  getNonPrimitiveIndex: (
    dataType: number,
    value: any,
    serialize: (
      data: any,
      serializeFn: (data: any) => Array<ActualArrayBuffer> | ActualArrayBuffer,
      options: SerializationOptions,
    ) => Array<ActualArrayBuffer> | ActualArrayBuffer,
  ) => number,
): Array<ActualArrayBuffer> | ActualArrayBuffer {
  if (options.custom != null) {
    const { serialize: customSerialize, getDataType } = options.custom;
    const dataType = getDataType(data);
    if (dataType != null) {
      if (!Number.isInteger(dataType) || dataType < 0 || dataType >= 10000) {
        throw new Error(`data type must be a integer between (including) 0 and 9999`);
      }
      const index = getNonPrimitiveIndex(dataType, data, customSerialize);
      const result = new DataView(new ArrayBuffer(8));
      result.setUint32(0, dataType, options.littleEndian);
      result.setUint32(4, index, options.littleEndian);
      return result.buffer;
    }
  }

  switch (typeof data) {
    case "number": {
      if (isFinite(data)) {
        const result = new DataView(new ArrayBuffer(12));
        result.setUint32(0, DataType.Number, options.littleEndian);
        result.setFloat64(4, data, options.littleEndian);
        return result.buffer;
      }
      const result = new DataView(new ArrayBuffer(4));
      result.setUint32(
        0,
        isNaN(data)
          ? DataType.NaN
          : data === Infinity
          ? DataType.PosInfinity
          : DataType.NegInfinity,
        options.littleEndian,
      );
      return result.buffer;
    }
    case "boolean": {
      const result = new DataView(new ArrayBuffer(5));
      result.setUint32(0, DataType.Boolean, options.littleEndian);
      result.setUint8(4, data ? 1 : 0);
      return result.buffer;
    }
    case "string": {
      const encodedString = textEncoder.encode(data);
      const result = new DataView(new ArrayBuffer(8));
      result.setUint32(0, DataType.String, options.littleEndian);
      result.setUint32(4, encodedString.byteLength, options.littleEndian);
      return [result.buffer, encodedString.buffer];
    }
    case "object": {
      if (data === null) {
        const result = new DataView(new ArrayBuffer(4));
        result.setUint32(0, DataType.Null, options.littleEndian);
        return result.buffer;
      }
      const result = new DataView(new ArrayBuffer(8));
      const isArray = Array.isArray(data);
      const dataType = isArray ? DataType.Array : DataType.Object;
      const index = getNonPrimitiveIndex(dataType, data, isArray ? serializeArray : serializeObject);
      result.setUint32(0, dataType, options.littleEndian);
      result.setUint32(4, index, options.littleEndian);
      return result.buffer;
    }
    case "undefined": {
      const result = new DataView(new ArrayBuffer(4));
      result.setUint32(0, DataType.Undefined, options.littleEndian);
      return result.buffer;
    }

    case "bigint":
    case "symbol":
    case "function":
      throw new Error(`data type "${typeof data}" is not serializeable by xserialization`);
  }
}

export function unserializeEntry(
  view: DataView,
  offset: { current: number },
  getNonPrimitive: (dataType: number, index: number) => any,
  { littleEndian }: SerializationOptions,
): any {
  const dataType = view.getUint32(offset.current, littleEndian);
  offset.current += 4;
  switch (dataType) {
    case DataType.NaN:
      return NaN;
    case DataType.NegInfinity:
      return -Infinity;
    case DataType.PosInfinity:
      return Infinity;
    case DataType.Boolean:
      return view.getUint8(offset.current++) === 1;
    case DataType.Null:
      return null;
    case DataType.Undefined:
      return undefined;
    case DataType.Number: {
      const start = offset.current;
      offset.current += 8;
      return view.getFloat64(start, littleEndian);
    }
    case DataType.String: {
      const byteLength = view.getUint32(offset.current, littleEndian);
      offset.current += 4;
      const start = offset.current;
      offset.current += byteLength;
      return textDecoder.decode(view.buffer.slice(start, offset.current));
    }
    case DataType.Array:
    case DataType.Object:
    default: {
      const index = view.getUint32(offset.current, littleEndian);
      offset.current += 4;
      return getNonPrimitive(dataType, index);
    }
  }
}
