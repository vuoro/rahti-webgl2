import { isServer } from "@vuoro/rahti";
import { requestPreRenderJob } from "./animation-frame.js";

const defaultParameters = {
  TEXTURE_MIN_FILTER: "LINEAR",
  TEXTURE_MAG_FILTER: "LINEAR",
  TEXTURE_WRAP_S: "REPEAT",
  TEXTURE_WRAP_T: "REPEAT",
};
const defaultMipParameters = {
  ...defaultParameters,
  TEXTURE_MIN_FILTER: "NEAREST_MIPMAP_LINEAR",
};

export const texture = (
  { gl, setTexture, requestRendering, textureIndexes },
  {
    shaderType = "sampler2D",
    target = "TEXTURE_2D",
    setter = "texImage2D",
    updater = "texSubImage2D",
    level = 0,
    format = "RGBA",
    internalFormat = "RGBA",
    type = "UNSIGNED_BYTE",
    border = 0,
    offset,
    pixels = null,
    width = 64,
    height = 64,
    mipmaps = false,
    flipY = false,
    premultiplyAlpha = false,
    unpackAlignment,
    parameters = mipmaps ? defaultMipParameters : defaultParameters,
  } = {}
) => {
  if (isServer) return {};

  const TARGET = gl[target];
  const FORMAT = gl[format];
  const INTERNAL_FORMAT = gl[internalFormat];
  const TYPE = gl[type];

  const texture = gl.createTexture();
  setTexture(texture, TARGET);

  let allData = pixels || null;

  if (parameters) {
    for (const key in parameters) {
      gl.texParameteri(gl.TEXTURE_2D, gl[key], gl[parameters[key]]);
    }
  }

  if (flipY) gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flipY);
  if (premultiplyAlpha) gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, premultiplyAlpha);
  if (unpackAlignment !== undefined) gl.pixelStorei(gl.UNPACK_ALIGNMENT, unpackAlignment);

  const hasMipmaps = typeof mipmaps === "string";
  if (hasMipmaps) gl.hint(gl.GENERATE_MIPMAP_HINT, gl[mipmaps]);

  const generateMipmaps = () => {
    setTexture(texture, TARGET);
    gl.generateMipmap(TARGET);
  };

  const set = (data, offset) => {
    allData = data;
    setTexture(texture, TARGET);

    if (offset !== undefined) {
      gl[setter](
        TARGET,
        level,
        INTERNAL_FORMAT,
        width,
        height,
        border,
        FORMAT,
        TYPE,
        allData,
        offset
      );
    } else {
      gl[setter](TARGET, level, INTERNAL_FORMAT, width, height, border, FORMAT, TYPE, allData);
    }

    if (hasMipmaps) requestPreRenderJob(generateMipmaps);
    requestRendering();
  };

  set(allData, offset);

  const update = (data, x = 0, y = 0, width = 1, height = 1, dataOffset) => {
    setTexture(texture, TARGET);
    gl[updater](TARGET, level, x, y, width, height, FORMAT, TYPE, data, dataOffset);
    if (hasMipmaps) requestPreRenderJob(generateMipmaps);
    requestRendering();
  };

  return { shaderType, set, update, index: textureIndexes.get(texture) };
};
