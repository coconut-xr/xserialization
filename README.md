# @coconut-xr/xserialization

*fast binary json serialization*

## Features

* preserves referential integrity
* can serialize recursive data-structures

## Structure

*Example*

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
            entryLength="3"
            name="x"
            entry:
                dataType="Number"
                value="1"
            name="y"
            entry:
                dataType="Array"
                index="0"
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
                value="123"
            1:
                dataaType="Number"
                value=3
```

*without labels*

```
"Object"
"0"
dataType="Object":
Length="1"
entryLength="3"
name="x"
dataType="Number"
value="1"
name="y"
dataType="Array"
index="0"
name="z"
dataType="Array"
index="0"
dataType="Array":
Length="1"
entryLength="2"
dataType="String"
value="123"
dataType="Number"
value=3
```

## Process

### Serialize

