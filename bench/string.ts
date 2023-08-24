/* eslint-disable @typescript-eslint/no-explicit-any */
import { add, complete, cycle, suite } from "benny";
import { Writer } from "../src/writer.js";
import { Reader, SerializationOptions, serializeInto } from "../src/index.js";

const defaultWriter = new Writer();

function serialize(data: any, options: SerializationOptions = {}): Uint8Array {
  serializeInto(defaultWriter, data, options);
  return defaultWriter.finishReference();
}

const smallString = "a";
const middleString = "123456789";
const longString = new Array(1000).fill("abc").join("");

const serializedSmallString = serialize(smallString);
const serializedMiddleString = serialize(middleString);
const serializedLongString = serialize(longString);

suite(
  "write small string",
  add("manual", () => {
    const writer = new Writer();
    writer["writeStringManual"](smallString);
  }),
  add("native", () => {
    const writer = new Writer();
    writer["writeStringNative"](smallString);
  }),
  cycle(),
  complete(),
);

suite(
  "write middle string",
  add("manual", () => {
    const writer = new Writer();
    writer["writeStringManual"](middleString);
  }),
  add("native", () => {
    const writer = new Writer();
    writer["writeStringNative"](middleString);
  }),
  cycle(),
  complete(),
);

suite(
  "write long string",
  add("manual", () => {
    const writer = new Writer();
    writer["writeStringManual"](longString);
  }),
  add("native", () => {
    const writer = new Writer();
    writer["writeStringNative"](longString);
  }),
  cycle(),
  complete(),
);

const reader = new Reader();

suite(
  "read small string",
  add("manual", () => {
    reader.start(serializedSmallString);
    reader["readStringManual"](serializedSmallString.byteLength);
    reader.finish();
  }),
  add("native", () => {
    reader.start(serializedSmallString);
    reader["readStringNative"](serializedSmallString.byteLength);
    reader.finish();
  }),
  cycle(),
  complete(),
);

suite(
  "read small string",
  add("manual", () => {
    reader.start(serializedMiddleString);
    reader["readStringManual"](serializedMiddleString.byteLength);
    reader.finish();
  }),
  add("native", () => {
    reader.start(serializedMiddleString);
    reader["readStringNative"](serializedMiddleString.byteLength);
    reader.finish();
  }),
  cycle(),
  complete(),
);

suite(
  "read small string",
  add("manual", () => {
    reader.start(serializedLongString);
    reader["readStringManual"](serializedLongString.byteLength);
    reader.finish();
  }),
  add("native", () => {
    reader.start(serializedLongString);
    reader["readStringNative"](serializedLongString.byteLength);
    reader.finish();
  }),
  cycle(),
  complete(),
);
