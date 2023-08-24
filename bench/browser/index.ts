/* eslint-disable @typescript-eslint/no-explicit-any */
import { decode, encode } from "@msgpack/msgpack";
import { getLargeObj } from "../../object.js";
import { Reader, deserialize, serialize } from "../../src/index.js";

setTimeout(() => {
  {
    const start = performance.now();
    const object = getLargeObj();
    x(object);
    console.log(performance.now() - start);
  }

  {
    const start = performance.now();
    const object = getLargeObj();
    y(object);
    console.log(performance.now() - start);
  }
}, 5000);

function x(object: any) {
  for (let i = 0; i < 100; i++) {
    decode(encode(object));
  }
}

function y(object: any) {
  for (let i = 0; i < 100; i++) {
    deserialize(new Reader(serialize(object).buffer));
  }
}
