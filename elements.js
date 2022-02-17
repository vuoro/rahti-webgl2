import { buffer } from "./buffer.js";

export const elements = async function (context, data) {
  return this(buffer)(context, data, "ELEMENT_ARRAY_BUFFER", undefined, ["UNSIGNED_SHORT", "int"]);
};
