/* eslint-disable @typescript-eslint/no-explicit-any */
import { NonPrimitiveDataType } from "./data-type.js";
import { SerializationOptions } from "./index.js";
import { Reader } from "./reader.js";
import { Writer } from "./writer.js";

export function unserializeNonPrimitive(
  reader: Reader,
  target: any,
  dataType: number,
  custom: SerializationOptions["custom"],
  unserializePrimitive: () => void,
) {
  if (dataType < 112) {
    if (custom == null) {
      throw new Error(
        `Data type "${dataType}" is a custom data type but no custom serialization handler is provided.`,
      );
    }
    const { unserialize } = custom;
    unserialize(reader, dataType, target, unserializePrimitive);
    return;
  }

  if (dataType < 168) {
    unserializeArray(target, dataType - 112, unserializePrimitive);
    return;
  }

  function readU8() {
    return reader.readU8();
  }

  if (dataType < 224) {
    unserializeObject(reader, target, dataType - 168, readU8, unserializePrimitive);
    return;
  }

  function readU16() {
    return reader.readU16();
  }
  function readU32() {
    return reader.readU32();
  }

  switch (dataType) {
    case NonPrimitiveDataType.Arr8:
      unserializeArray(target, reader.readU8(), unserializePrimitive);
      return;
    case NonPrimitiveDataType.Arr16:
      unserializeArray(target, reader.readU16(), unserializePrimitive);
      return;
    case NonPrimitiveDataType.Arr32:
      unserializeArray(target, reader.readU32(), unserializePrimitive);
      return;
    case NonPrimitiveDataType.Obj8x8:
      unserializeObject(reader, target, reader.readU8(), readU8, unserializePrimitive);
      return;
    case NonPrimitiveDataType.Obj8x16:
      unserializeObject(reader, target, reader.readU8(), readU16, unserializePrimitive);
      return;
    case NonPrimitiveDataType.Obj8x32:
      unserializeObject(reader, target, reader.readU8(), readU32, unserializePrimitive);
      return;
    case NonPrimitiveDataType.Obj16x8:
      unserializeObject(reader, target, reader.readU16(), readU8, unserializePrimitive);
      return;
    case NonPrimitiveDataType.Obj16x16:
      unserializeObject(reader, target, reader.readU16(), readU16, unserializePrimitive);
      return;
    case NonPrimitiveDataType.Obj16x32:
      unserializeObject(reader, target, reader.readU16(), readU32, unserializePrimitive);
      return;
    case NonPrimitiveDataType.Obj32x8:
      unserializeObject(reader, target, reader.readU32(), readU8, unserializePrimitive);
      return;
    case NonPrimitiveDataType.Obj32x16:
      unserializeObject(reader, target, reader.readU32(), readU16, unserializePrimitive);
      return;
    case NonPrimitiveDataType.Obj32x32:
      unserializeObject(reader, target, reader.readU32(), readU32, unserializePrimitive);
      return;
    default:
      throw new Error(`Unknown non primtive data type "${dataType}".`);
  }
}

function unserializeArray(
  target: Array<any>,
  arrayLength: number,
  unserializeEntry: () => any,
): void {
  for (let i = 0; i < arrayLength; i++) {
    target.push(unserializeEntry());
  }
}

function unserializeObject(
  reader: Reader,
  target: Record<string, any>,
  objectLength: number,
  readObjectKeyLength: () => number,
  unserializeEntry: () => any,
): void {
  for (let i = 0; i < objectLength; i++) {
    const objectKeyLength = readObjectKeyLength();
    const objectKey = reader.readString(objectKeyLength);
    target[objectKey] = unserializeEntry();
  }
}

export function serializeNonPrimitive(
  writer: Writer,
  value: any,
  dataType: number,
  custom: SerializationOptions["custom"],
  serializePrimitive: (value: any) => void,
): void {
  switch (dataType) {
    case NonPrimitiveDataType.Arr8:
      writer.writeU8(value.length);
      serializeArray(value, serializePrimitive);
      return;
    case NonPrimitiveDataType.Arr16:
      writer.writeU16(value.length);
      serializeArray(value, serializePrimitive);
      return;
    case NonPrimitiveDataType.Arr32:
      writer.writeU32(value.length);
      serializeArray(value, serializePrimitive);
      return;
  }
}

function serializeObject(
  writer: Writer,
  object: any,
  writeLength: (value: number) => void,
  writeKeyLength: (value: number) => void,
  serializePrimitive: (value: any) => void,
): void {
  const entries = Object.entries(object)
  writeLength(entries.length)
  for (const [name, value] of entries) {
    const serializedName = textEncoder.encode(name);
    writer.writeU(objectKeyLengthSize, serializedName.byteLength);
    writer.writeU8Array(serializedName);
    serializePrimitive(value);
  }
}

function serializeArray(array: Array<any>, serializePrimitive: (value: any) => void): void {
  for (const value of array) {
    serializePrimitive(value);
  }
}
