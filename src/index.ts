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

const defaultWriter = new Writer();

export function serialize(data: any, options: SerializationOptions = {}): Uint8Array {
  serializeInto(defaultWriter, data, options);
  return defaultWriter.finishReference();
}

const defaultReader = new Reader();

export function deserialize(data: Uint8Array, options: SerializationOptions = {}): any {
  defaultReader.start(data);
  const result = deserializeFrom(defaultReader, options);
  defaultReader.finish();
  return result;
}

export { Writer, Reader, serializeInto, deserializeFrom };
