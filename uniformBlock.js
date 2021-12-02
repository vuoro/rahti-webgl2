import { isServer } from "@vuoro/rahti";

export const uniformBlock = ({ gl, requestRendering }, uniformMap) => {
  if (isServer) return;

  // let buffer;
  // state.uniforms = {};
  // const offsets = new Map();

  // state.create = () => {
  //   const { gl, setBuffer } = renderer;

  //   state.bindIndex =
  //     state.bindIndex === undefined ? renderer.uniformBindIndexCounter++ : state.bindIndex;

  //   buffer = gl.createBuffer();
  //   setBuffer(buffer, gl.UNIFORM_BUFFER);
  //   gl.bindBufferBase(gl.UNIFORM_BUFFER, state.bindIndex, buffer);

  //   let byteCounter = 0;
  //   let elementCounter = 0;

  //   const uniforms = Object.entries(context).map(([name, value], index) => {
  //     const [, shaderType] = dataToTypes(value);
  //     const elementCount = value.length || 1;

  //     // std140 alignment rules
  //     const [alignment, size] =
  //       elementCount === 1 ? [1, 1] : elementCount === 2 ? [2, 2] : [4, elementCount];

  //     // std140 alignment padding
  //     // | a |...|...|...|b.x|b.y|b.z|b.w| c | d |...|...|
  //     const padding = (alignment - (elementCounter % alignment)) % alignment;
  //     elementCounter += padding;
  //     byteCounter += padding * 4;

  //     let data;
  //     if (Array.isArray(value) || ArrayBuffer.isView(value)) {
  //       data = value;
  //     } else {
  //       data = [value];
  //     }

  //     const uniform = {
  //       shaderType,
  //       padding,
  //       size,
  //       byteOffset: byteCounter,
  //       elementOffset: elementCounter,
  //       data,
  //     };

  //     state.uniforms[name] = uniform;
  //     offsets.set(name, uniform.elementOffset);

  //     elementCounter += size;
  //     byteCounter += size * 4;

  //     return uniform;
  //   });

  //   const endPadding = (4 - (elementCounter % 4)) % 4;
  //   elementCounter += endPadding;

  //   state.allData = new Float32Array(elementCounter);

  //   uniforms.forEach(({ data, elementOffset }) => state.allData.set(data, elementOffset));

  //   gl.bufferData(gl.UNIFORM_BUFFER, state.allData, gl.DYNAMIC_DRAW);

  //   state.created = true;
  //   requestRendering();

  //   if (pendingUpdates.size) {
  //     for (const update of pendingUpdates) {
  //       state.update(...update);
  //     }
  //     pendingUpdates.clear();
  //   }

  //   if (renderer.debug) console.log("Created context uniform block", context, state);
  // };

  // state.update = (key, data) => {
  //   if (state.created) {
  //     const length = data.length || 1;
  //     const offset = offsets.get(key);

  //     firstDirty = Math.min(offset, firstDirty);
  //     lastDirty = Math.max(offset + length, lastDirty);

  //     if (data.length) {
  //       state.allData.set(data, offset);
  //     } else {
  //       state.allData[offset] = data;
  //     }

  //     requestJob(state.commitUpdate);
  //   } else {
  //     pendingUpdates.add([key, data]);
  //   }
  // };

  // state.commitUpdate = () => {
  //   if (renderer.debug)
  //     console.log("Updating uniform block", state.name, state.allData, firstDirty, lastDirty);

  //   const { gl, setBuffer } = renderer;
  //   setBuffer(buffer, gl.UNIFORM_BUFFER);
  //   gl.bufferSubData(
  //     gl.UNIFORM_BUFFER,
  //     firstDirty * state.allData.BYTES_PER_ELEMENT,
  //     state.allData,
  //     firstDirty,
  //     lastDirty - firstDirty
  //   );

  //   firstDirty = Infinity;
  //   lastDirty = 0;

  //   requestRendering();
  // };
};
