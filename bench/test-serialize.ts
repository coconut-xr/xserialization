/* eslint-disable @typescript-eslint/no-explicit-any */
import { encode } from "@msgpack/msgpack";
import { SerializationOptions, Writer, serializeInto } from "../src/index.js";

const defaultWriter = new Writer();

function serialize(data: any, options: SerializationOptions = {}): Uint8Array {
  serializeInto(defaultWriter, data, options);
  return defaultWriter.finishReference();
}
setTimeout(() => {
  const record = new Array(100).fill(null).map(() => Math.random());
  for (let i = 0; i < 10000; i++) {
    encode(record);
  }
}, 6000);

setTimeout(() => {
  const record = new Array(100).fill(null).map(() => Math.random());
  for (let i = 0; i < 10000; i++) {
    serialize(record);
  }
}, 1000);
