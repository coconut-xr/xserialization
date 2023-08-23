/**
 * default primtive data types
 */
export enum PrimitiveDataType {
  // FixUint 0-55 values 0 to 55
  // FixNUint 56-111 values -1 to -56
  // FixString 112-167 string length 0 to 55
  // FixPointer 168-223 pointer 0 to 55

  NaN = 224,
  PosInf = 225,
  NegInf = 226,
  Null = 227,
  Undefined = 228,
  False = 229,
  True = 230,
  Float64 = 231,
  Uint8 = 232,
  Uint16 = 233,
  Uint32 = 234,
  NUInt8 = 235,
  NUInt16 = 236,
  NUInt32 = 237,
  Str8 = 238,
  Str16 = 239,
  Str32 = 240,
  Pointer8 = 241,
  Pointer16 = 242,
  Pointer32 = 243,
  //243 - 255 reserved for future use
}

/**
 * default non primitive data tytpes starting with 112 up to max of 255 (0-63 is for custom data types)
 */
export enum NonPrimitiveDataType {
  // Custom data type 0 - 111

  // FixArr 112-167 array length 0 to 55
  // FixObj8 168-223 object length 0 to 55 with key length of 0 to 256

  Arr8 = 224,
  Arr16 = 225,
  Arr32 = 226,
  Obj8x8 = 227,
  Obj8x16 = 228,
  Obj8x32 = 229,
  Obj16x8 = 230,
  Obj16x16 = 231,
  Obj16x32 = 232,
  Obj32x8 = 233,
  Obj32x16 = 234,
  Obj32x32 = 235,
  //236 - 255 reserverd for future use
}

export function is8bit(value: number) {
  return value < 0x100;
}

export function is16bit(value: number) {
  return value < 0x10000;
}

export function is32bit(value: number) {
  return value < 0x100000000;
}
