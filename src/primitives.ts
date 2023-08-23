/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrimitiveDataType, is16bit, is32bit, is8bit } from "./data-type.js";
import { SerializationOptions } from "./index.js";
import { Reader } from "./reader.js";
import { Writer } from "./writer.js";

export function serializePrimitive(
  writer: Writer,
  data: any,
  getNonPrimitiveIndex: (dataType: number, value: any) => number,
  custom?: SerializationOptions["custom"],
): void {
  const customDataType = custom?.getDataType(data);

  if (customDataType != null) {
    if (!Number.isInteger(customDataType) || customDataType < 0 || customDataType >= 112) {
      throw new Error(`data type must be a integer between (including) 0 and 112`);
    }
    const index = getNonPrimitiveIndex(customDataType, data);
    writePointer(writer, index, customDataType);
    return;
  }

  switch (typeof data) {
    case "number":
      writeNumber(writer, data);
      return;
    case "boolean":
      writer.writeU8(data ? PrimitiveDataType.True : PrimitiveDataType.False);
      return;
    case "undefined":
      writer.writeU8(PrimitiveDataType.Undefined);
      return;
    case "string":
      writeString(writer, data);
      return;
    case "object": {
      if (data === null) {
        writer.writeU8(PrimitiveDataType.Null);
        return;
      }
      //array or object
      let dataType: number;
      let index: number;
      if (Array.isArray(data)) {
        //array
        const arrayLengthSize = getSize(data.length);
        dataType = getArrayDataType(arrayLengthSize);
        index = getNonPrimitiveIndex(dataType, data);
      } else {
        //object
        const objectEntries = Object.entries(Object);
        const objectLengthSize = getSize(objectEntries.length);
        const maxKeySize = objectEntries.reduce((prev, [key]) => Math.max(prev, key.length), 0);
        const objectKeyLengthSize = getSize(maxKeySize);
        dataType = getObjectDataType(objectLengthSize, objectKeyLengthSize);
        index = getNonPrimitiveIndex(dataType, data, serializeObject);
      }
      writePointer(writer, index, dataType);
      return;
    }

    case "bigint":
    case "symbol":
    case "function":
      throw new Error(`data type "${typeof data}" is not serializeable by xserialization`);
  }
}

function writePointer(writer: Writer, index: number, dataType: number): void {
  if (index < 56) {
    //FixPointer
    writer.writeU8(index + 168);
  } else if (is8bit(index)) {
    //pointer8
    writer.writeU8(PrimitiveDataType.Pointer8);
    writer.writeU8(index);
  } else if (is16bit(index)) {
    //pointer16
    writer.writeU8(PrimitiveDataType.Pointer16);
    writer.writeU16(index);
  } else if (is32bit(index)) {
    //pointer32
    writer.writeU8(PrimitiveDataType.Pointer32);
    writer.writeU32(index);
  } else {
    throw new Error(
      `Unable to pointer with index "${index}". Pointer's index must be smaller than ${0x100000000}.`,
    );
  }
  writer.writeU8(dataType);
}

const textEncoder = new TextEncoder();

export function writeString(writer: Writer, data: string) {
  const encodedString = textEncoder.encode(data);
  const byteLength = encodedString.byteLength;

  if (byteLength < 56) {
    //fix str (length 0 to 55)
    writer.writeU8(112 + byteLength);
  } else if (is8bit(byteLength)) {
    //8bit
    writer.writeU8(PrimitiveDataType.Str8);
    writer.writeU8(byteLength);
  } else if (is16bit(byteLength)) {
    //16bit
    writer.writeU8(PrimitiveDataType.Str16);
    writer.writeU16(byteLength);
  } else if (is32bit(byteLength)) {
    //32bit
    writer.writeU8(PrimitiveDataType.Str32);
    writer.writeU32(byteLength);
  } else {
    throw new Error(
      `Unable to write string with byte size "${byteLength}". String's byte size must be smaller than ${0x100000000}.`,
    );
  }
  writer.writeU8Array(encodedString);
}

function writeNumber(writer: Writer, data: number): void {
  if (!isFinite(data)) {
    const dataType = isNaN(data)
      ? PrimitiveDataType.NaN
      : data === Infinity
      ? PrimitiveDataType.PosInf
      : PrimitiveDataType.NegInf;
    writer.writeU8(dataType);
    return;
  }
  if (!Number.isInteger(data)) {
    writer.writeU8(PrimitiveDataType.Float64);
    writer.writeFloat64(data);
    return;
  }
  const abs = Math.abs(data);

  if (abs < 56) {
    writer.writeU8(data < 0 ? abs + 56 - 1 : abs); //fix (uint: 0-55, nuint: 56 - 111; 56 means -1)
    return;
  }

  if (is8bit(abs)) {
    //8bit
    writer.writeU8(data < 0 ? PrimitiveDataType.NUInt8 : PrimitiveDataType.Uint8);
    writer.writeU8(abs);
    return;
  }
  if (is16bit(abs)) {
    //16bit
    writer.writeU8(data < 0 ? PrimitiveDataType.NUInt16 : PrimitiveDataType.Uint16);
    writer.writeU16(abs);
    return;
  }
  if (is32bit(abs)) {
    //32bit
    writer.writeU8(data < 0 ? PrimitiveDataType.NUInt32 : PrimitiveDataType.Uint32);
    writer.writeU32(abs);
    return;
  }

  //integer with more than 32 bit
  writer.writeU8(PrimitiveDataType.Float64);
  writer.writeFloat64(data);
}

export function unserializePrimitive(
  reader: Reader,
  getNonPrimitive: (index: number, dataType: number) => any,
): any {
  const primitiveDataType = reader.readU8();
  if (primitiveDataType < 56) {
    //FixUint
    return primitiveDataType; //values 0 to 55
  }
  if (primitiveDataType < 112) {
    //FixNUint
    return -(primitiveDataType - 56) - 1; //values -1 to -56
  }
  if (primitiveDataType < 168) {
    //FixStr
    return reader.readString(primitiveDataType - 112); //string length 0 to 59
  }
  if (primitiveDataType < 224) {
    //FixPointer
    const pointerIndex = primitiveDataType - 168; //pointer index 0 to 59
    const nonPrimitiveDataType = reader.readU8();
    return getNonPrimitive(pointerIndex, nonPrimitiveDataType);
  }
  switch (primitiveDataType) {
    case PrimitiveDataType.NaN:
      return NaN;
    case PrimitiveDataType.NegInf:
      return -Infinity;
    case PrimitiveDataType.PosInf:
      return Infinity;
    case PrimitiveDataType.True:
      return true;
    case PrimitiveDataType.False:
      return false;
    case PrimitiveDataType.Null:
      return null;
    case PrimitiveDataType.Undefined:
      return undefined;
    case PrimitiveDataType.Uint8:
      return reader.readU8();
    case PrimitiveDataType.Uint16:
      return reader.readU16();
    case PrimitiveDataType.Uint32:
      return reader.readU32();
    case PrimitiveDataType.NUInt8:
      return -reader.readU8();
    case PrimitiveDataType.NUInt16:
      return -reader.readU16();
    case PrimitiveDataType.NUInt32:
      return -reader.readU32();
    case PrimitiveDataType.Float64:
      return reader.readFloat64();
    case PrimitiveDataType.Str8:
      return reader.readString(reader.readU8());
    case PrimitiveDataType.Str16:
      return reader.readString(reader.readU16());
    case PrimitiveDataType.Str32:
      return reader.readString(reader.readU32());
    case PrimitiveDataType.Pointer8:
      return getNonPrimitive(reader.readU8(), reader.readU8());
    case PrimitiveDataType.Pointer16:
      return getNonPrimitive(reader.readU16(), reader.readU8());
    case PrimitiveDataType.Pointer32:
      return getNonPrimitive(reader.readU32(), reader.readU8());
    default:
      throw new Error(`Unknown primitive data type "${primitiveDataType}".`);
  }
}
