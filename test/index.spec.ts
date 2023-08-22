/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect } from "chai";
import { SerializationOptions, serialize, unserialize } from "../src/index.js";

function reserialize(value: any, options?: SerializationOptions): any {
  return unserialize(serialize(value, options), options);
}

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

describe("re-serialization", () => {
  it("should reserialize primitives", () => {
    expect(reserialize(100234234), "reserialize integer number").to.equal(100234234);
    expect(reserialize(Math.PI), "reserialize floating number").to.equal(Math.PI);
    expect(reserialize("test\n123"), "reserialize string").to.equal("test\n123");
    expect(reserialize(true), "reserialize true").to.equal(true);
    expect(reserialize(false), "reserialize false").to.equal(false);
    expect(reserialize(NaN), "reserialize NaN").to.equal(NaN);
    expect(reserialize(undefined), "reserialize undefined").to.equal(undefined);
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
          getDataType(value) {
            if (value instanceof X) {
              return 0;
            }
          },
          createInstance() {
            return new X(0);
          },
          serialize(value) {
            if (!(value instanceof X)) {
              throw new Error("can only serialize instances of class X");
            }
            const result = new Uint8Array(8);
            const view = new DataView(result.buffer);
            view.setFloat64(0, value.y);
            return result;
          },
          unserialize(type, instance, data, offset) {
            if (!(instance instanceof X)) {
              throw new Error("can only unserialize instances of class X");
            }
            const view = new DataView(data.buffer, offset.current);
            offset.current += 8;
            instance.y = view.getFloat64(0);
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
            getDataType(value) {
              if (value instanceof X) {
                return 0;
              }
              if (value instanceof Y) {
                return 1;
              }
            },
            createInstance(type) {
              return type === 0 ? new X(0) : new Y("");
            },
            serialize(value) {
              if (value instanceof X) {
                const result = new Uint8Array(8);
                const view = new DataView(result.buffer);
                view.setFloat64(0, value.y);
                return result;
              }
              if (value instanceof Y) {
                const serializedText = textEncoder.encode(value.x);
                const result = new Uint8Array(serializedText.byteLength + 1);
                result[0] = serializedText.byteLength;
                result.set(serializedText, 1);
                return result;
              }
              throw new Error("can only serialize instances of class X or class Y");
            },
            unserialize(type, instance, data, offset) {
              if (instance instanceof X) {
                const view = new DataView(data.buffer, offset.current);
                offset.current += 8;
                instance.y = view.getFloat64(0);
                return;
              }
              if (instance instanceof Y) {
                const serializedTextLength = data[offset.current++];
                const start = offset.current;
                offset.current += serializedTextLength;
                instance.x = textDecoder.decode(data.slice(start, offset.current));
                return;
              }
              throw new Error("can only unserialize instances of class X or class Y");
            },
          },
        },
      ),
    ).to.deep.equal({ x: new X(100), y: new Y("hallo welt!") });
  });

  it("should throw error for overlapping custom data types", () => {
    expect(() =>
      reserialize(1, {
        custom: {
          getDataType() {
            return 10000;
          },
          createInstance() {
            return null;
          },
          serialize() {
            return new Uint8Array(0);
          },
          unserialize() {},
        },
      }),"data type greater 9999"
    ).to.throw("data type must be a integer between (including) 0 and 9999");
    expect(() =>
      reserialize(1, {
        custom: {
          getDataType() {
            return -1;
          },
          createInstance() {
            return null;
          },
          serialize() {
            return new Uint8Array(0);
          },
          unserialize() {},
        },
      }), "negative data type",
    ).to.throw("data type must be a integer between (including) 0 and 9999");
  });

  it("should throw error for incorrect data structures", () => {
    expect(() => reserialize([Symbol("")])).to.throw(
      'data type "symbol" is not serializeable by xserialization',
    );
    expect(() => reserialize([() => {}])).to.throw("data type \"function\" is not serializeable by xserialization");
  });
});
