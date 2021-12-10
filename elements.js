import { effect, isServer } from "@vuoro/rahti";
import { buffer } from "./buffer.js";

export const elements = effect((context, data) => {
  if (isServer) return {};

  const bufferObject = buffer(context, data, "ELEMENT_ARRAY_BUFFER", undefined, [
    "UNSIGNED_SHORT",
    "int",
  ]);

  return bufferObject;
});
