/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect } from "chai";
import {
  SerializationOptions,
  Reader,
  Writer,
  serializeInto,
  deserializeFrom,
} from "../src/index.js";
import { getLargeObj } from "../object.js";

let globalLittleEndian = true;

function reserialize(value: any, options: SerializationOptions = {}): any {
  const reader = new Reader(globalLittleEndian);
  const writer = new Writer(globalLittleEndian);

  //serialize
  serializeInto(writer, value, options);

  //deseralize
  reader.start(writer.finishReference());
  const result = deserializeFrom(reader, options);
  reader.finish();

  return result;
}

describe(`writer`, () => {
  it("should handle move forward", () => {
    const writer = new Writer();
    const length = writer.writeString("123");
    writer.move(2, 0, length);
    writer.writeU16At(0, 1000);
    const reader = new Reader();
    reader.start(writer.finishReference());
    expect([reader.readU16(), reader.readString(length)]).to.deep.equal([1000, "123"]);
    reader.finish();
  });
});

[true, false].forEach((littleEndian) => {
  globalLittleEndian = littleEndian;
  describe(`re-serialization with ${littleEndian ? "little endian" : "big endian"}`, () => {
    it("should reserialize primitives", () => {
      expect(reserialize(100234234), "reserialize integer number").to.equal(100234234);
      expect(reserialize(Math.PI), "reserialize floating number").to.equal(Math.PI);
      expect(reserialize("test\n123"), "reserialize string").to.equal("test\n123");
      expect(reserialize(true), "reserialize true").to.equal(true);
      expect(reserialize(false), "reserialize false").to.equal(false);
      expect(reserialize(NaN), "reserialize NaN").to.be.NaN;
      expect(reserialize(undefined), "reserialize undefined").to.be.undefined;
      expect(reserialize(null), "reserialize null").to.equal(null);
      expect(reserialize(Infinity), "reserialize +Infinity").to.equal(Infinity);
      expect(reserialize(-Infinity), "reserialize -Infinity").to.equal(-Infinity);
    });

    it("should reserialize non primitives", () => {
      expect(reserialize([1, "a", null]), "reserialize list").to.deep.equal([1, "a", null]);
      expect(reserialize({ a: 1, 2: 0 }), "reserialize object").to.deep.equal({ a: 1, 2: 0 });
      expect(reserialize([{ a: 1 }, { b: 2 }]), "reserialize list with objects").to.deep.equal([
        { a: 1 },
        { b: 2 },
      ]);
      expect(reserialize({ a: [1], b: [2] }), "reserialize objects with lists").to.deep.equal({
        a: [1],
        b: [2],
      });
    });

    it("should reserialize complex data structures", () => {
      const dataStructure = [{ Ü: { Ü: ["Ü", 33] } }, 1, 2, Math.PI, "ÜÜ"];
      expect(reserialize(dataStructure)).to.deep.equal(dataStructure);
    });

    it("should preserve referential integrity", () => {
      const a: any = [1, 2];
      const b = [a, a];
      const b_clone = reserialize(b);
      expect(b_clone[0]).to.equal(b_clone[1]); //IMPORTANT: NOT DEEP EQUAL - JUST EQUAL
      expect(b).to.deep.equal(b_clone);
    });

    it("should handle recursive data structures", () => {
      const a: any = [1, 2, 3, null];
      a[3] = a;
      expect(reserialize(a)).to.deep.equal(a);
    });

    it("should handle a custom data type", () => {
      class X {
        constructor(public y: number) {}
      }
      expect(
        reserialize(new X(100), {
          custom: {
            isCustom(value) {
              return value instanceof X;
            },
            serialize(writer, value, serialize) {
              if (!(value instanceof X)) {
                throw new Error("can only serialize instances of class X");
              }
              serialize(value.y);
              return 0;
            },

            deserialize(reader, dataType, deserialize) {
              return new X(deserialize());
            },
          },
        }),
      ).to.deep.equal(new X(100));
    });

    it("should handle multiple custom data types", () => {
      class X {
        constructor(public y: number) {}
      }
      class Y {
        constructor(public x: string) {}
      }
      expect(
        reserialize(
          { x: new X(100), y: new Y("hallo welt!") },
          {
            custom: {
              isCustom(value) {
                return value instanceof X || value instanceof Y;
              },
              serialize(writer, data, serialize) {
                if (data instanceof X) {
                  serialize(data.y);
                  return 0;
                }
                if (data instanceof Y) {
                  serialize(data.x);
                  return 1;
                }
                throw new Error("can only serialize instances of class X or class Y");
              },
              deserialize(reader, dataType, deserialize) {
                if (dataType === 0) {
                  return new X(deserialize());
                }
                if (dataType === 1) {
                  return new Y(deserialize());
                }
                throw new Error("can only deserialize instances of class X or class Y");
              },
            },
          },
        ),
      ).to.deep.equal({ x: new X(100), y: new Y("hallo welt!") });
    });

    it("should throw error for overlapping custom data types", () => {
      expect(
        () =>
          reserialize(1, {
            custom: {
              isCustom() {
                return true;
              },
              serialize() {
                return 10000;
              },
              deserialize() {},
            },
          }),
        "data type greater 31",
      ).to.throw("data type must be a integer between (including) 0 and 31");
      expect(
        () =>
          reserialize(1, {
            custom: {
              isCustom() {
                return true;
              },
              serialize() {
                return -1;
              },
              deserialize() {},
            },
          }),
        "negative data type",
      ).to.throw("data type must be a integer between (including) 0 and 31");
    });

    it("should throw error for incorrect data structures", () => {
      expect(() => reserialize([Symbol("")])).to.throw(
        'data type "symbol" is not serializeable by xserialization',
      );
      expect(() => reserialize([() => {}])).to.throw(
        'data type "function" is not serializeable by xserialization',
      );
    });

    it("should reserialize large object", () => {
      const object = getLargeObj();
      expect(reserialize(object)).to.deep.equal(object);
    });

    it("should reserialize very long string", () => {
      const str = new Array(10000)
        .fill(null)
        .map(() => "abc")
        .join(",");
      expect(reserialize(str)).to.equal(str);
    });
    it("should reserialize very long objects", () => {
      const record: Record<string, any> = {};
      for (let i = 0; i < 10000; i++) {
        record[i] = i;
      }
      expect(reserialize(record)).to.deep.equal(record);
    });
    it("should reserialize objects with very long keys", () => {
      const record: Record<string, any> = {};
      for (let i = 0; i < 100; i++) {
        record[
          new Array(100)
            .fill(null)
            .map(() => Math.random())
            .join("")
        ] = i;
      }
      expect(reserialize(record)).to.deep.equal(record);
    });
    it("should reserialize very long arrays", () => {
      const array = new Array(10000).fill(null);
      array[1] = 2;
      expect(reserialize(array)).to.deep.equal(array);
    });
    it("should serialize very high integers", () => {
      const value = 0xffffffff; //2^32 - 1
      expect(value).to.equal(value);
    });
    it("should serialize negative integers", () => {
      expect(reserialize(-1)).to.equal(-1);
      expect(reserialize(-100000)).to.equal(-100000);
      expect(reserialize(Number.MIN_SAFE_INTEGER)).to.equal(Number.MIN_SAFE_INTEGER);
    });
  });
});
