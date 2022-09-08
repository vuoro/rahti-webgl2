import { Buffer } from "./buffer.js";

export const Elements = function (context, data) {
  return this.run(Buffer, context, data, "ELEMENT_ARRAY_BUFFER", undefined, [
    "UNSIGNED_SHORT",
    "int",
  ]);
};
