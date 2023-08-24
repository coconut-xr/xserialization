/* eslint-disable @typescript-eslint/no-explicit-any */
import { add, complete, cycle, suite } from "benny";
import {
  Reader,
  SerializationOptions,
  Writer,
  deserializeFrom,
  serializeInto,
} from "../src/index.js";
import { encode, decode } from "@msgpack/msgpack";
import { getLargeObj } from "../object.js";

const array = new Array(100).fill(null).map(() => Math.random());
const record: Record<string, any> = {};
for (let i = 0; i < 10000; i++) {
  record[i] = 0;
}

const defaultWriter = new Writer();

function serialize(data: any, options: SerializationOptions = {}): Uint8Array {
  serializeInto(defaultWriter, data, options);
  return defaultWriter.finishReference();
}

const defaultReader = new Reader();

function deserialize(data: Uint8Array, options: SerializationOptions = {}): any {
  defaultReader.start(data);
  const result = deserializeFrom(defaultReader, options);
  defaultReader.finish();
  return result;
}

suite(
  "serialize object",
  add("msgpack encode ", () => {
    encode(record);
  }),
  add("xserialize", () => {
    serialize(record);
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
  add("msgpack encode ", () => {
    encode(array);
  }),
  add("xserialize", () => {
    serialize(array);
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
  add("json stringify", () => {
    JSON.stringify(object);
  }),
  add("msgpack encode ", () => {
    encode(object);
  }),
  add("xserialize - little endian", () => {
    serialize(object);
  }),
  cycle(),
  complete(),
);

const serializedLittle = serialize(object);
const serializedStringify = JSON.stringify(object);
const serializedMsgpack = encode(object);

suite(
  "deserialize nested object",
  add("msgpack decode ", () => {
    decode(serializedMsgpack);
  }),
  add("json parse", () => {
    JSON.parse(serializedStringify);
  }),
  add("xdeserialize - little endian", () => {
    deserialize(serializedLittle);
  }),
  cycle(),
  complete(),
);
