/* eslint-disable @typescript-eslint/no-explicit-any */
import { serializeInto, deserializeFrom } from "./serialization.js";
import { Reader } from "./reader.js";
import { Writer } from "./writer.js";

export type SerializationOptions = {
  custom?: {
    isCustom(data: any): boolean;
    /**
     * custom serilization function
     * @param serialize allows to serialize any value inside the custom serialization function
     * @returns the data type of the serialized value
     */
    serialize(writer: Writer, data: any, serialize: (data: any) => void): number;
    /**
     * custom deserialization function
     */
    deserialize(reader: Reader, dataType: number, deserialize: () => any): any;
  };
};

export { Writer, Reader, serializeInto, deserializeFrom };
