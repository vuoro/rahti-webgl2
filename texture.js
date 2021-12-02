import { isServer } from "@vuoro/rahti";

export const texture = ({ gl, requestRendering }, { width, height, pixels }) => {
  if (isServer) return;

  // // Texture
  // let texture;
  // let _TEXTURE_2D;
  // let _level, _format, _internalFormat, _type;

  // state.create = () => {
  //   const { gl, setTexture } = renderer;
  //   texture = gl.createTexture();
  //   setTexture(texture);
  //   state.index = textureIndexes.get(texture);

  //   const {
  //     sampler = "sampler2D",
  //     level = 0,
  //     format = "RGBA",
  //     internalFormat = "RGBA32F",
  //     type = "FLOAT",
  //     channels = 4,
  //     border = 0,
  //     offset,
  //     pixels: inputPixels,
  //     width: inputWidth,
  //     height: inputHeight,
  //     ...inputParameters
  //   } = context;

  //   const pixelsAreABuffer = !inputPixels || ArrayBuffer.isView(inputPixels);
  //   const width = pixelsAreABuffer && (inputWidth || 64);
  //   const height = pixelsAreABuffer && (inputHeight || 64);
  //   state.allData = context.pixels || null;

  //   state.shaderType = sampler;
  //   _level = level;
  //   _format = gl[format];
  //   _internalFormat = gl[internalFormat];
  //   _type = gl[type];

  //   const parameters = {
  //     TEXTURE_MAG_FILTER: "NEAREST",
  //     TEXTURE_MIN_FILTER: "NEAREST",
  //     ...inputParameters,
  //   };

  //   for (const key in parameters) {
  //     gl.texParameteri(gl.TEXTURE_2D, gl[key], gl[parameters[key]]);
  //   }

  //   if (pixelsAreABuffer) {
  //     gl.texImage2D(
  //       gl.TEXTURE_2D,
  //       level,
  //       _internalFormat,
  //       width,
  //       height,
  //       border,
  //       _format,
  //       _type,
  //       state.allData,
  //       offset
  //     );
  //   } else {
  //     gl.texImage2D(gl.TEXTURE_2D, level, _internalFormat, _format, _type, state.allData);
  //   }

  //   _TEXTURE_2D = gl.TEXTURE_2D;

  //   state.created = true;
  //   requestRendering();

  //   if (pendingUpdates.size) {
  //     for (const [isRefill, update] of pendingUpdates) {
  //       state[isRefill ? "refill" : "update"](...update);
  //     }
  //     pendingUpdates.clear();
  //   }

  //   if (renderer.debug) console.log("Created context texture", context, state);
  // };

  // state.refill = (data) => {
  //   if (state.created) {
  //     const { gl, setTexture } = renderer;

  //     state.allData = data;

  //     setTexture(texture);
  //     gl.texImage2D(gl.TEXTURE_2D, _level, _internalFormat, _format, _type, state.allData);
  //     requestRendering();
  //   } else {
  //     pendingUpdates.add([true, [data]]);
  //   }
  // };

  // state.update = (data, x = 0, y = 0, width = 1, height = 1, dataOffset) => {
  //   if (state.created) {
  //     const { gl, setTexture } = renderer;
  //     setTexture(texture);

  //     gl.texSubImage2D(
  //       _TEXTURE_2D,
  //       _level,
  //       x,
  //       y,
  //       width,
  //       height,
  //       _format,
  //       _type,
  //       data,
  //       dataOffset
  //     );
  //   } else {
  //     pendingUpdates.add([false, [data, x, y, width, height, dataOffset]]);
  //   }

  //   requestRendering();
};
