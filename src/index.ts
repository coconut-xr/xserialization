/* eslint-disable @typescript-eslint/no-explicit-any */
import { serializeInto, deserializeFrom } from "./serialization.js";
import { Reader } from "./reader.js";
import { Writer } from "./writer.js";

export type SerializationOptions = {
  custom?: {
    getDataType(data: any): number | undefined;
    serialize(writer: Writer, data: any, serialize: (data: any) => void): void;
    deserialize(reader: Reader, dataType: number, deserialize: () => any): any;
  };
};

export { Writer, Reader, serializeInto, deserializeFrom };
