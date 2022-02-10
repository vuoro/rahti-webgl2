import { effect, isServer, onCleanup } from "@vuoro/rahti";
import { cancelPreRenderJob, preRenderJobs, requestPreRenderJob } from "./animation-frame.js";

export const buffer = effect(
  (
    { gl, setBuffer, requestRendering },
    data,
    binding = "ARRAY_BUFFER",
    usage = "STATIC_DRAW",
    types = dataToTypes(data[0])
  ) => {
    if (isServer) return {};
    const BINDING = gl[binding];

    const [bufferType, shaderType] = types;
    const Constructor = bufferTypeToConstructor(bufferType);

    const buffer = gl.createBuffer();
    setBuffer(buffer, BINDING);

    const dimensions = data[0].length || 1;
    let allData = new Constructor(data.length * dimensions);

    for (let index = 0; index < data.length; index++) {
      const datum = data[index];

      if (dimensions > 1) {
        allData.set(datum, index * dimensions);
      } else {
        allData[index] = datum;
      }
    }

    const { BYTES_PER_ELEMENT } = allData;
    const count = data.length;
    const USAGE = gl[usage];

    const countSubscribers = new Set();

    const bufferObject = {
      allData,
      buffer,
      bufferType,
      shaderType,
      Constructor,
      count,
      dimensions,
      countSubscribers,
    };

    let firstDirty = Infinity;
    let lastDirty = 0;

    const set = (data = allData) => {
      allData = data;
      bufferObject.allData = allData;
      bufferObject.count = data.length / dimensions;
      setBuffer(buffer, BINDING);
      gl.bufferData(BINDING, data, USAGE);

      for (const subscriber of countSubscribers) {
        subscriber(bufferObject.count);
      }

      if (preRenderJobs.has(commitUpdates)) {
        preRenderJobs.delete(commitUpdates);
        firstDirty = Infinity;
        lastDirty = 0;
      }

      requestRendering();
    };

    requestPreRenderJob(set);

    const update = (data, offset) => {
      const length = data.length;

      firstDirty = Math.min(offset, firstDirty);
      lastDirty = Math.max(offset + length, lastDirty);

      if (length) {
        allData.set(data, offset);
      } else {
        allData[offset] = data;
      }

      requestPreRenderJob(commitUpdates);
    };

    const commitUpdates = () => {
      setBuffer(buffer, BINDING);
      gl.bufferSubData(
        BINDING,
        firstDirty * BYTES_PER_ELEMENT,
        allData,
        firstDirty,
        lastDirty - firstDirty
      );

      firstDirty = Infinity;
      lastDirty = 0;
    };

    onCleanup(() => {
      gl.deleteBuffer(buffer);
      cancelPreRenderJob(commitUpdates);
      cancelPreRenderJob(set);
    });

    bufferObject.set = set;
    bufferObject.update = update;

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
