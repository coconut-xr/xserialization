/* eslint-disable @typescript-eslint/no-explicit-any */
import { add, complete, cycle, suite } from "benny";
import { serialize, deserialize, Writer, Reader } from "../src/index.js";
import { encode, decode } from "@msgpack/msgpack";
import { getLargeObj } from "../object.js";

const array = new Array(100).fill(null).map(() => Math.random());
const record: Record<string, any> = {};
for (let i = 0; i < 10000; i++) {
  record[i] = 0;
}

suite(
  "serialize object",
  add("xserialize", () => {
    serialize(record);
  }),
  add("msgpack encode ", () => {
    encode(record);
  }),
  cycle(),
  complete(),
);

suite(
  "serialize small string",
  add("xserialize", () => {
    serialize("1");
  }),
  add("msgpack encode ", () => {
    encode("1");
  }),
  cycle(),
  complete(),
);

suite(
  "serialize array",
  add("xserialize", () => {
    serialize(array);
  }),
  add("msgpack encode ", () => {
    encode(array);
  }),
  cycle(),
  complete(),
);

suite(
  "serialize number",
  add("xserialize", () => {
    serialize(347859);
  }),
  add("msgpack encode ", () => {
    encode(347859);
  }),
  cycle(),
  complete(),
);

const str = "asjdhfölkjhjkh8123z4z21p34o12k3jhrlkjöqlkfjasökljfdölksajdf";

suite(
  "serialize string",
  add("xserialize", () => {
    serialize(str);
  }),
  add("msgpack encode ", () => {
    encode(str);
  }),
  cycle(),
  complete(),
);

const object = getLargeObj();

suite(
  "serialize nested object",
  add("xserialize - little endian", () => {
    serialize(object, new Writer(true));
  }),
  add("xserialize - little endian", () => {
    serialize(object, new Writer(false));
  }),
  add("json stringify", () => {
    JSON.stringify(object);
  }),
  add("msgpack encode ", () => {
    encode(object);
  }),
  cycle(),
  complete(),
);

const serializedLittle = serialize(object, new Writer(true)).buffer;
const serializedBig = serialize(object, new Writer(false)).buffer;
const serializedStringify = JSON.stringify(object);
const serializedMsgpack = encode(object);

suite(
  "deserialize nested object",
  add("xdeserialize - little endian", () => {
    deserialize(new Reader(serializedLittle, true));
  }),
  add("xdeserialize - little endian", () => {
    deserialize(new Reader(serializedBig, false));
  }),
  add("json parse", () => {
    JSON.parse(serializedStringify);
  }),
  add("msgpack decode ", () => {
    decode(serializedMsgpack);
  }),
  cycle(),
  complete(),
);
