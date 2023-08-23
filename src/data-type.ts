/**
 * default primtive data types
 */
export enum DataType {
  // Custom data type 0 - 31

  // FixUint 32-63 values 0 to 31
  // FixNUint 64-95 values -1 to -32
  // FixStr 96-127 string length 0 to 31
  // FixPtr 128-159 pointer 0 to 31
  // FixArr 160-191 array length 0 to 31
  // FixObj8 192-223 object length 0 to 31 with key length of 0 to 256

  //last 32 entries for non fix entries
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
  NUint8 = 235,
  NUint16 = 236,
  NUint32 = 237,
  Str8 = 238,
  Str16 = 239,
  Str32 = 240,
  Pointer8 = 241,
  Pointer16 = 242,
  Pointer32 = 243,
  Arr8 = 244,
  Arr16 = 245,
  Arr32 = 246,
  Obj8 = 247,
  Obj16 = 248,
  Obj32 = 249,
  //250-255 reserved for future use
}

export const CustomDataTypeEndExcl = 32;
export const FixUintStartIncl = 32;
export const FixUintEndExcl = 64;
export const FixNUintStartIncl = 64;
export const FixNUintEndExcl = 96;
export const FixStrStartIncl = 96;
export const FixStrEndExcl = 128;
export const FixPtrStartIncl = 128;
export const FixPtrEndExcl = 160;
export const FixArrStartIncl = 160;
export const FixArrEndExcl = 192;
export const FixObj8StartIncl = 192;
export const FixObj8EndExcl = 224;

export function is5bit(value: number) {
  return value < 32;
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
