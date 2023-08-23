/* eslint-disable @typescript-eslint/no-explicit-any */
import { add, complete, cycle, suite } from "benny";
import { SerializationOptions, serialize, unserialize } from "../src/index.js";
import { encode, decode } from "@msgpack/msgpack";
import { getLargeObj } from "../object.js";

const object = getLargeObj();

suite(
  "serialize nested object",
  add("xserialize - little endian", () => {
    const options: SerializationOptions = {
      littleEndian: true,
    };
    serialize(object, options);
  }),
  add("xserialize - little endian", () => {
    const options: SerializationOptions = {
      littleEndian: false,
    };
    serialize(object, options);
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

const serializedLittle = serialize(object, { littleEndian: true });
const serializedBig = serialize(object, { littleEndian: false });
const serializedStringify = JSON.stringify(object);
const serializedMsgpack = encode(object);

suite(
  "unserialize nested object",
  add("xunserialize - little endian", () => {
    const options: SerializationOptions = {
      littleEndian: true,
    };
    unserialize(serializedLittle, options);
  }),
  add("xunserialize - little endian", () => {
    const options: SerializationOptions = {
      littleEndian: false,
    };
    unserialize(serializedBig, options);
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
