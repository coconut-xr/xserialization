import { decode, encode } from "@msgpack/msgpack";
import { serialize, deserialize, Reader } from "../src/index.js";
import { getLargeObj } from "../object.js";


setTimeout(() => {
  const record = getLargeObj();
  for (let i = 0; i < 100; i++) {
    decode(encode(record));
  }
}, 6000);

setTimeout(() => {
  const record = getLargeObj();
  for (let i = 0; i < 100; i++) {
    deserialize(new Reader(serialize(record).buffer));
  }
}, 1000);
