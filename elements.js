import { buffer } from "./buffer.js";

export const elements = function (context, data) {
  const bufferObject = this(buffer)(context, data, "ELEMENT_ARRAY_BUFFER", undefined, [
    "UNSIGNED_SHORT",
    "int",
  ]);

  return bufferObject;
};
