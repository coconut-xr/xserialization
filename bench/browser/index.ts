/* eslint-disable @typescript-eslint/no-explicit-any */
import { decode, encode } from "@msgpack/msgpack";
import { serialize } from "../../src/index.js";
import { getLargeObj } from "../../object.js";

setTimeout(async () => {
  let ours = 0;
  let theirs = 0;
  const object = getLargeObj();

  for (let i = 0; i < 1000; i++) {
    {
      const start = performance.now();
      serialize(object).buffer;
      ours += performance.now() - start;
    }
    {
      const start = performance.now();
      decode(encode(object));
      theirs += performance.now() - start;
    }
  }
  console.log("ours", ours);
  console.log("theirs", theirs);
}, 5000);