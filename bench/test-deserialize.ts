import { getLargeObj } from "../object.js";
import { serialize, deserialize, Reader } from "../src/index.js";

const object = getLargeObj();

deserialize(new Reader(serialize(object).buffer));
