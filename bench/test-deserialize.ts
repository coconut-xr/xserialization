import { getLargeObj } from "../object.js";
import { serialize, deserialize } from "../src/index.js";

const object = getLargeObj();

deserialize(serialize(object));
