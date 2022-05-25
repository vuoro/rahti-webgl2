import { component } from "@vuoro/rahti";
import { buffer } from "./buffer.js";

export const elements = component(function elements(context, data) {
  return buffer(this)(context, data, "ELEMENT_ARRAY_BUFFER", undefined, ["UNSIGNED_SHORT", "int"]);
});
