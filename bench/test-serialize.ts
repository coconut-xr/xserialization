import { encode } from "@msgpack/msgpack";
import { serialize } from "../src/index.js";

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
