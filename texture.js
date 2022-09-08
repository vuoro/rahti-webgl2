import { CleanUp } from "@vuoro/rahti";
import { cancelPreRenderJob, requestPreRenderJob } from "./animation-frame.js";

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

export const Texture = function ({
  context,
  shaderType = "sampler2D",
  target = "TEXTURE_2D",
  storer = "texStorage2D",
  updater = "texSubImage2D",
  levels = 1,
  format = "RGBA",
  internalFormat = "RGBA4",
  type = "UNSIGNED_BYTE",
  pixels = null,
  width = 64,
  height = 64,
  mipmaps = false,
  flipY = false,
  premultiplyAlpha = false,
  unpackAlignment,
  parameters = mipmaps ? defaultMipParameters : defaultParameters,
}) {
  const { gl, setTexture, requestRendering, textureIndexes } = context;

  const TARGET = gl[target];
  const FORMAT = gl[format];
  const INTERNAL_FORMAT = gl[internalFormat];
  const TYPE = gl[type];

  const texture = gl.createTexture();
  setTexture(texture, TARGET);

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

  const update = (data, x = 0, y = 0, width = 1, height = 1, dataOffset, level = 0) => {
    setTexture(texture, TARGET);
    gl[updater](TARGET, level, x, y, width, height, FORMAT, TYPE, data, dataOffset);
    if (hasMipmaps) requestPreRenderJob(generateMipmaps);
    requestRendering();
  };

  gl[storer](TARGET, levels, INTERNAL_FORMAT, width, height);
  if (pixels) update(pixels, 0, 0, width, height);

  this.run(CleanUp, {
    cleaner: () => {
      cancelPreRenderJob(generateMipmaps);
      gl.deleteTexture(texture);
    },
  });

  return { shaderType, update, index: textureIndexes.get(texture) };
};
