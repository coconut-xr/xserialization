/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  CustomDataTypeEndExcl,
  DataType,
  FixArrEndExcl,
  FixArrStartIncl,
  FixNUintEndExcl,
  FixNUintStartIncl,
  FixObj8EndExcl,
  FixObj8StartIncl,
  FixPtrEndExcl,
  FixPtrStartIncl,
  FixStrEndExcl,
  FixStrStartIncl,
  FixUintEndExcl,
  FixUintStartIncl,
  is16bit,
  is32bit,
  is5bit,
  is8bit,
} from "./data-type.js";
import { throwMoreThan32Bit } from "./errors.js";
import { SerializationOptions } from "./index.js";
import { Reader } from "./reader.js";
import { Writer } from "./writer.js";

export function serializeInto(writer: Writer, data: any, options: SerializationOptions = {}): void {
  const { custom } = options;

  if (custom?.isCustom(data)) {
    const index = writer.getNonPrimitiveIndex(data);
    if (index != null) {
      writePointer(writer, index);
      return;
    }

    const dataTypePosition = writer.grow(1);
    const customDataType = custom!.serialize(writer, data, (data) =>
      serializeInto(writer, data, options),
    );

    if (
      !Number.isInteger(customDataType) ||
      customDataType < 0 ||
      customDataType >= CustomDataTypeEndExcl
    ) {
      throw new Error(
        `data type must be a integer between (including) 0 and ${CustomDataTypeEndExcl - 1}`,
      );
    }

    writer.writeU8At(dataTypePosition, customDataType);
    return;
  }

  switch (typeof data) {
    case "number":
      writeNumber(writer, data);
      return;
    case "boolean":
      writer.writeU8(data ? DataType.True : DataType.False);
      return;
    case "undefined":
      writer.writeU8(DataType.Undefined);
      return;
    case "string":
      writeString(writer, data);
      return;
    case "object": {
      if (data === null) {
        writer.writeU8(DataType.Null);
        return;
      }

      //array or object (non primitive)

      const index = writer.getNonPrimitiveIndex(data);

      if (index != null) {
        writePointer(writer, index);
        return;
      }

      if (Array.isArray(data)) {
        //array
        writeArray(writer, data, options);
        return;
      }

      //object
      writeObject(writer, data, options);
      return;
    }

    case "bigint":
    case "symbol":
    case "function":
      throw new Error(`data type "${typeof data}" is not serializeable by xserialization`);
  }
}

function writePointer(writer: Writer, index: number): void {
  if (is5bit(index)) {
    //FixPointer
    writer.writeU8(FixPtrStartIncl + index);
    return;
  }

  if (is8bit(index)) {
    //pointer8
    writer.assureGrowthFits(2);
    writer.writeU8Unsafe(DataType.Pointer8);
    writer.writeU8Unsafe(index);
    return;
  }

  if (is16bit(index)) {
    //pointer16
    writer.assureGrowthFits(3);
    writer.writeU8Unsafe(DataType.Pointer16);
    writer.writeU16Unsafe(index);
    return;
  }

  if (is32bit(index)) {
    //pointer32
    writer.assureGrowthFits(5);
    writer.writeU8Unsafe(DataType.Pointer32);
    writer.writeU32Unsafe(index);
    return;
  }

  throwMoreThan32Bit("pointer index", index);
}

export function writeString(writer: Writer, data: string) {
  const dataTypePosition = writer.grow(1);
  const byteLength = writer.writeString(data);

  if (byteLength < 32) {
    //fix str
    writer.writeU8At(dataTypePosition, FixStrStartIncl + byteLength);
    return;
  }

  const currentTextPosition = dataTypePosition + 1;

  if (byteLength < 0x100) {
    //8bit
    //move text back by 1 to insert the byteLength (8bit)
    writer.move(1, currentTextPosition);
    writer.writeU8At(dataTypePosition, DataType.Str8);
    writer.writeU8At(currentTextPosition, byteLength);
    return;
  }

  if (byteLength < 0x10000) {
    //16bit
    //move text back by 2 to insert the byteLength (16bit)
    writer.move(2, currentTextPosition);
    writer.writeU8At(dataTypePosition, DataType.Str16);
    writer.writeU16At(currentTextPosition, byteLength);
    return;
  }

  if (byteLength < 0x100000000) {
    //32bit
    //move text back by 4 to insert the byteLength (32bit)
    writer.move(4, currentTextPosition);
    writer.writeU8At(dataTypePosition, DataType.Str32);
    writer.writeU32At(currentTextPosition, byteLength);
    return;
  }

  throwMoreThan32Bit("string byte size", byteLength);
}

function writeNumber(writer: Writer, data: number): void {
  if (Number.isSafeInteger(data)) {
    if (data < 0) {
      //write negative integer
      const abs = -data;

      if (is5bit(abs)) {
        writer.writeU8(FixNUintStartIncl + abs - 1); //-1 for nuint so that 0 maps to -1
        return;
      }

      if (is8bit(abs)) {
        //8bit
        writer.assureGrowthFits(2);
        writer.writeU8Unsafe(DataType.NUint8);
        writer.writeU8Unsafe(abs);
        return;
      }

      if (is16bit(abs)) {
        //16bit
        writer.assureGrowthFits(3);
        writer.writeU8Unsafe(DataType.NUint16);
        writer.writeU16Unsafe(abs);
        return;
      }

      if (is32bit(abs)) {
        //32bit
        writer.assureGrowthFits(5);
        writer.writeU8Unsafe(DataType.NUint32);
        writer.writeU32Unsafe(abs);
        return;
      }
    } else {
      //write positive integer

      if (is5bit(data)) {
        writer.writeU8(FixUintStartIncl + data); //-1 for nuint so that 0 maps to -1
        return;
      }

      if (is8bit(data)) {
        //8bit
        writer.assureGrowthFits(2);
        writer.writeU8Unsafe(DataType.Uint8);
        writer.writeU8Unsafe(data);
        return;
      }

      if (is16bit(data)) {
        //16bit
        writer.assureGrowthFits(3);
        writer.writeU8Unsafe(DataType.Uint16);
        writer.writeU16Unsafe(data);
        return;
      }

      if (is32bit(data)) {
        //32bit
        writer.assureGrowthFits(5);
        writer.writeU8Unsafe(DataType.Uint32);
        writer.writeU32Unsafe(data);
        return;
      }
    }
  }

  if (!isFinite(data)) {
    const dataType = isNaN(data)
      ? DataType.NaN
      : data === Infinity
      ? DataType.PosInf
      : DataType.NegInf;
    writer.writeU8(dataType);
    return;
  }

  //integer with more than 32 bit
  writer.assureGrowthFits(9);
  writer.writeU8Unsafe(DataType.Float64);
  writer.writeFloat64Unsafe(data);
  return;
}

function writeObject(writer: Writer, object: any, options: SerializationOptions): void {
  const objectKeys = Object.keys(object);
  const objectLength = objectKeys.length;

  if (is5bit(objectLength)) {
    //FixObject 8
    writer.writeU8(FixObj8StartIncl + objectLength);
  } else if (is8bit(objectLength)) {
    //Object 8
    writer.assureGrowthFits(2);
    writer.writeU8Unsafe(DataType.Obj8);
    writer.writeU8Unsafe(objectLength);
  } else if (is16bit(objectLength)) {
    //Object 16
    writer.assureGrowthFits(3);
    writer.writeU8Unsafe(DataType.Obj16);
    writer.writeU16Unsafe(objectLength);
  } else if (is32bit(objectLength)) {
    //Object 32
    writer.assureGrowthFits(5);
    writer.writeU8Unsafe(DataType.Obj32);
    writer.writeU32Unsafe(objectLength);
  } else {
    throwMoreThan32Bit("object entry amount", objectLength);
  }

  //write entries
  for (const key of objectKeys) {
    const keyLengthTypePosition = writer.grow(1);
    const keyLength = writer.writeString(key);
    if (keyLength < 254) {
      //is8bit not necassary because we can use 0-253 for the key size
      writer.writeU8At(keyLengthTypePosition, keyLength);
    } else if (is16bit(keyLength)) {
      const currentKeyStartPosition = keyLengthTypePosition + 1;
      //move key back by 2 to insert the keyLength (16bit)
      writer.move(2, currentKeyStartPosition);
      writer.writeU8At(keyLengthTypePosition, 254);
      writer.writeU16At(currentKeyStartPosition, keyLength);
    } else if (is32bit(keyLength)) {
      const currentKeyStartPosition = keyLengthTypePosition + 1;
      //move key back by 4 to insert the keyLength (32bit)
      writer.move(4, currentKeyStartPosition);
      writer.writeU8At(keyLengthTypePosition, 255);
      writer.writeU32At(currentKeyStartPosition, keyLength);
    } else {
      throwMoreThan32Bit("key length of object", keyLength);
    }
    serializeInto(writer, object[key], options);
  }
}

function writeArray(writer: Writer, array: Array<any>, options: SerializationOptions): void {
  const arrayLength = array.length;
  if (is5bit(arrayLength)) {
    //FixArray
    writer.writeU8(FixArrStartIncl + arrayLength);
  } else if (is8bit(arrayLength)) {
    //Array8
    writer.assureGrowthFits(2);
    writer.writeU8Unsafe(DataType.Arr8);
    writer.writeU8Unsafe(arrayLength);
  } else if (is16bit(arrayLength)) {
    //Array16
    writer.assureGrowthFits(3);
    writer.writeU8Unsafe(DataType.Arr16);
    writer.writeU16Unsafe(arrayLength);
  } else if (is32bit(arrayLength)) {
    //Array32
    writer.assureGrowthFits(5);
    writer.writeU8Unsafe(DataType.Arr32);
    writer.writeU32Unsafe(arrayLength);
  } else {
    throwMoreThan32Bit("array length", arrayLength);
  }
  for (const item of array) {
    serializeInto(writer, item, options);
  }
}

export function deserializeFrom(reader: Reader, options: SerializationOptions = {}): any {
  const { custom } = options;
  const dataType = reader.readU8();
  if (dataType < CustomDataTypeEndExcl) {
    //custom data type
    if (custom == null) {
      throw new Error(
        `Data type "${dataType}" is a custom data type but no custom serialization handler is provided.`,
      );
    }
    return custom.deserialize(reader, dataType, deserializeFrom.bind(custom, reader, options));
  }

  if (dataType < FixUintEndExcl) {
    //FixUint
    return dataType - FixUintStartIncl;
  }

  if (dataType < FixNUintEndExcl) {
    //FixNUint
    return -(dataType - FixNUintStartIncl) - 1; //-1 because 0 expressed -1
  }

  if (dataType < FixStrEndExcl) {
    //FixStr
    return reader.readString(dataType - FixStrStartIncl);
  }

  if (dataType < FixPtrEndExcl) {
    //FixPointer
    return reader.getNonPrimitive(dataType - FixPtrStartIncl);
  }

  if (dataType < FixArrEndExcl) {
    //FixArray
    return readArray(reader, dataType - FixArrStartIncl, options);
  }

  if (dataType < FixObj8EndExcl) {
    //FixObject8
    return readObject(reader, dataType - FixObj8StartIncl, options);
  }

  if (dataType)
    switch (dataType) {
      case DataType.NaN:
        return NaN;
      case DataType.NegInf:
        return -Infinity;
      case DataType.PosInf:
        return Infinity;
      case DataType.True:
        return true;
      case DataType.False:
        return false;
      case DataType.Null:
        return null;
      case DataType.Undefined:
        return undefined;
      case DataType.Uint8:
        return reader.readU8();
      case DataType.Uint16:
        return reader.readU16();
      case DataType.Uint32:
        return reader.readU32();
      case DataType.NUint8:
        return -reader.readU8();
      case DataType.NUint16:
        return -reader.readU16();
      case DataType.NUint32:
        return -reader.readU32();
      case DataType.Float64:
        return reader.readFloat64();
      case DataType.Str8:
        return reader.readString(reader.readU8());
      case DataType.Str16:
        return reader.readString(reader.readU16());
      case DataType.Str32:
        return reader.readString(reader.readU32());
      case DataType.Pointer8:
        return reader.getNonPrimitive(reader.readU8());
      case DataType.Pointer16:
        return reader.getNonPrimitive(reader.readU16());
      case DataType.Pointer32:
        return reader.getNonPrimitive(reader.readU32());
      case DataType.Arr8:
        return readArray(reader, reader.readU8(), options);
      case DataType.Arr16:
        return readArray(reader, reader.readU16(), options);
      case DataType.Arr32:
        return readArray(reader, reader.readU32(), options);
      case DataType.Obj8:
        return readObject(reader, reader.readU8(), options);
      case DataType.Obj16:
        return readObject(reader, reader.readU16(), options);
      case DataType.Obj32:
        return readObject(reader, reader.readU32(), options);
    }

  throw new Error(`Unknown primitive data type "${dataType}".`);
}

function readArray(reader: Reader, arrayLength: number, options: SerializationOptions): Array<any> {
  const result = new Array(arrayLength);
  reader.addNonPrimitive(result);
  for (let i = 0; i < arrayLength; i++) {
    result[i] = deserializeFrom(reader, options);
  }
  return result;
}

function readObject(reader: Reader, objectLength: number, options: SerializationOptions): any {
  const result: Record<string, any> = {};
  reader.addNonPrimitive(result);
  for (let i = 0; i < objectLength; i++) {
    const objectKeyLengthType = reader.readU8();
    let keyLength: number;
    if (objectKeyLengthType < 254) {
      keyLength = objectKeyLengthType;
    } else if (objectKeyLengthType < 255) {
      keyLength = reader.readU16();
    } else {
      keyLength = reader.readU32();
    }
    const objectKey = reader.readString(keyLength);
    result[objectKey] = deserializeFrom(reader, options);
  }
  return result;
}
