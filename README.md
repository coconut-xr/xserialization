# @coconut-xr/xserialization

_fast and efficient data serialization for js primtivies and datastuctures_

## Features

- preserves referential integrity
- can serialize recursive data-structures
- 0 dependencies
- true to js (supports null, undefined, NaN, ...)

## Data Types

| Name             | first byte (in binary) | first byte (in hex) |
| ---------------- | ---------------------- | ------------------- |
| custom data type | 0xxxxxxx               | 0x00 - 0x7f         |
| NaN              | 10000000               |                     |
| +Infinity        | 10000001               |                     |
| -Infinity        | 10000010               |                     |
| null             | 10000011               |                     |
| undefined        | 10000100               |                     |
| false            | 10000101               |                     |
| true             | 10000110               |                     |
| float 32         | 10000111               |                     |
| float 64         | 10001000               |                     |
| uint 8           | 10001001               |                     |
| uint 16          | 10001010               |                     |
| uint 32          | 10001011               |                     |
| int 8            | 10001100               |                     |
| int 16           | 10001101               |                     |
| int 32           | 10001110               |                     |
| str 8            | 10001111               |                     |
| str 16           | 10010000               |                     |
| str 32           | 10010001               |                     |
| array 8          | 10010010               |                     |
| array 16         | 10010011               |                     |
| array 32         | 10010100               |                     |
| map 8x16         | 10010101               |                     |
| map 8x8          | 10010110               |                     |
| map 8x32         | 10010111               |                     |
| map 16x8         | 10011000               |                     |
| map 16x16        | 10011001               |                     |
| map 16x32        | 10011010               |                     |
| map 32x8         | 10011011               |                     |
| map 32x16        | 10011100               |                     |
| map 32x32        | 10011101               |                     |

## Structure

_Example_

```json
{
    "x": 1,
    "y": ["123", 3],
    "z": <reference to y>
}
```

```
rootEntry:
    dataType="Object"
    index="0"
non primitive values:
    dataType="Object":
        Length="1"
        0:
            entryLength="3""
            nameByteLength="..."
            name="x"
            entry:
                dataType="Number"
                value="1"
            nameByteLength="..."
            name="y"
            entry:
                dataType="Array"
                index="0"
            nameByteLength="..."
            name="z"
            entry:
                dataType="Array"
                index="0"
    dataType="Array":
        Length="1"
        0:
            entryLength="2"
            0:
                dataType="String"
                ByteLength="..."
                value="123"
            1:
                dataType="Number"
                value=3
```

_without labels_

```
"Object"
"0"
dataType="Object":
Length="1"
entryLength="3"
nameByteLength="..."
name="x"
dataType="Number"
value="1"
nameByteLength="..."
name="y"
dataType="Array"
index="0"
nameByteLength="..."
name="z"
dataType="Array"
index="0"
dataType="Array":
Length="1"
entryLength="2"
dataType="String""
ByteLength="..."
value="123"
dataType="Number"
value=3
```

## Process

### Serialize
