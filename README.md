# @coconut-xr/xserialization

[![Version](https://img.shields.io/npm/v/@coconut-xr/xserialization?style=flat-square)](https://npmjs.com/package/@coconut-xr/xserialization)
[![License](https://img.shields.io/github/license/coconut-xr/xserialization.svg?style=flat-square)](https://github.com/coconut-xr/xserialization/blob/master/LICENSE)
[![Twitter](https://img.shields.io/twitter/follow/coconut_xr?style=flat-square)](https://twitter.com/coconut_xr)
[![Discord](https://img.shields.io/discord/1087727032240185424?style=flat-square&label=discord)](https://discord.gg/RbyaXJJaJM)


_fast and efficient js data serialization_

## Features

- preserves referential integrity
- can serialize recursive data structures
- 0 dependencies
- true to js (supports null, undefined, NaN, ...)
- custom data types

## API

```typescript
type SerializationOptions = {
  custom?: {
    getDataType(data: any): number | undefined;
    serialize(writer: Writer, data: any, serialize: (data: any) => void): void;
    deserialize(reader: Reader, dataType: number, deserialize: () => any): any;
  };
};
function serializeInto(writer: Writer, data: any, options: SerializationOptions = {}): void;
function deserializeFrom(reader: Reader, options: SerializationOptions = {}): any;
```

## Usage

```typescript
const value = "test";
const writer = new Writer();
serializeInto(writer, value);
const buffer = writer.finishReference();
const reader = new Reader();
reader.start(buffer);
const result = deserializeInto(reader);
reader.finish();
console.log(result);
```

*Why so complex, you might ask?*

Using this design reader and writer can be reused and serializeInto can be called multiple times to write into the same buffer.

## Data Types

| Name                                                        | range   |
| ----------------------------------------------------------- | ------- |
| Custom data type                                            | 0 - 31  |
| FixUint (values 0 to 31)                                    | 32-63   |
| FixNUint (values -1 to -32)                                 | 64-95   |
| FixStr (string length 0 to 31)                              | 96-127  |
| FixPtr (pointer 0 to 31)                                    | 128-159 |
| FixArr (array length 0 to 31)                               | 160-191 |
| FixObj8 (object length 0 to 31 with a key length of 0 to 256) | 192-223 |
| NaN                                                         | 224     |
| PosInf                                                      | 225     |
| NegInf                                                      | 226     |
| Null                                                        | 227     |
| Undefined                                                   | 228     |
| False                                                       | 229     |
| True                                                        | 230     |
| Float64                                                     | 231     |
| Uint8                                                       | 232     |
| Uint16                                                      | 233     |
| Uint32                                                      | 234     |
| NUint8                                                      | 235     |
| NUint16                                                     | 236     |
| NUint32                                                     | 237     |
| Str8                                                        | 238     |
| Str16                                                       | 239     |
| Str32                                                       | 240     |
| Pointer8                                                    | 241     |
| Pointer16                                                   | 242     |
| Pointer32                                                   | 243     |
| Arr8                                                        | 244     |
| Arr16                                                       | 245     |
| Arr32                                                       | 246     |
| Obj8                                                        | 247     |
| Obj16                                                       | 248     |
| Obj32                                                       | 249     |
| Reserved for future use                                     | 250-255 |

## Achknowledgement

**xserialization** builds on the structure and idea of [msgpack](https://github.com/msgpack) but focusses solely on js data.
