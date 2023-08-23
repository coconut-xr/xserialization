import { encode } from "@msgpack/msgpack";
import { serialize } from "../src/index.js";
import { getLargeObj } from "../object.js";

const object = getLargeObj();

const xserializationSize = serialize(object).byteLength;
const msgPackSize = encode(object).byteLength;
const jsonSize = new TextEncoder().encode(JSON.stringify(object)).byteLength;

const smallest = Math.min(xserializationSize, msgPackSize, jsonSize);

console.log(
  "size comparison (lower is better):\n",
  "xserialization",
  ((100 * xserializationSize) / smallest).toFixed(2) + "%",
  "\n",
  "msgPack",
  ((100 * msgPackSize) / smallest).toFixed(2) + "%",
  "\n",
  "json",
  ((100 * jsonSize) / smallest).toFixed(2) + "%",
);
