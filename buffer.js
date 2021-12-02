import { effect, isServer, onCleanup } from "@vuoro/rahti";
import { requestPreRenderJob } from "./animation-frame.js";

export const buffer = effect(
  (
    { gl, setBuffer },
    data,
    binding = "ARRAY_BUFFER",
    usage = "STATIC_DRAW",
    types = dataToTypes(data[0])
  ) => {
    if (isServer) return;
    const BINDING = gl[binding];

    const [bufferType, shaderType] = types;
    const Constructor = bufferTypeToConstructor(bufferType);

    const buffer = gl.createBuffer();
    setBuffer(buffer, BINDING);

    onCleanup(() => {
      gl.deleteBuffer(buffer);
    });

    let dataForBuffer = new Constructor(data.flatMap((v) => v));
    const { BYTES_PER_ELEMENT } = dataForBuffer;
    const count = data.length;
    const USAGE = gl[usage];
    const dimensions = data[0].length || 1;

    const countSubscribers = new Set();

    const set = (data = dataForBuffer) => {
      dataForBuffer = data;
      bufferObject.count = data.length / dimensions;
      setBuffer(buffer, BINDING);
      gl.bufferData(BINDING, data, USAGE);

      for (const subscriber of countSubscribers) {
        subscriber(bufferObject.count);
      }
    };

    requestPreRenderJob(set);

    const bufferObject = {
      buffer,
      bufferType,
      shaderType,
      Constructor,
      set,
      update,
      count,
      dimensions,
      countSubscribers,
    };

    let firstDirty = Infinity;
    let lastDirty = 0;

    const update = (data, offset) => {
      const length = data.length;

      firstDirty = Math.min(offset, firstDirty);
      lastDirty = Math.max(offset + length, lastDirty);

      if (length) {
        dataForBuffer.set(data, offset);
      } else {
        dataForBuffer[offset] = data;
      }

      requestPreRenderJob(commitUpdates);
    };

    const commitUpdates = () => {
      setBuffer(buffer, BINDING);
      gl.bufferSubData(
        BINDING,
        firstDirty * BYTES_PER_ELEMENT,
        dataForBuffer,
        firstDirty,
        lastDirty - firstDirty
      );

      firstDirty = Infinity;
      lastDirty = 0;
    };

    return bufferObject;
  }
);

export const dataToTypes = (data) => {
  if (typeof data === "number") {
    return ["FLOAT", "float"];
  }

  if (typeof data === "boolean") {
    return ["BYTE", "bool"];
  }

  if (Array.isArray(data)) {
    return ["FLOAT", data.length > 4 ? `mat${Math.sqrt(data.length)}` : `vec${data.length}`];
  }

  switch (data.constructor.name) {
    case "Float32Array":
      return ["FLOAT", data.length > 4 ? `mat${Math.sqrt(data.length)}` : `vec${data.length}`];
    case "Int8Array":
      return ["BYTE", `ivec${data.length}`];
    case "Uint8Array":
    case "Uint8ClampedArray":
      return ["UNSIGNED_BYTE", `uvec${data.length}`];
    case "Int16Array":
      return ["SHORT", `ivec${data.length}`];
    case "Uint16Array":
      return ["UNSIGNED_SHORT", `uvec${data.length}`];
    default:
      throw new Error("Finding types failed");
  }
};

export const bufferTypeToConstructor = (type) => {
  switch (type) {
    case "BYTE":
      return Int8Array;
    case "UNSIGNED_BYTE":
      return Uint8Array;
    case "SHORT":
      return Int16Array;
    case "UNSIGNED_SHORT":
      return Uint16Array;
    default:
      return Float32Array;
  }
};
