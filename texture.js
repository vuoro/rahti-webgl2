import { isServer } from "@vuoro/rahti";

const defaultParameters = {
  TEXTURE_MAG_FILTER: "NEAREST",
  TEXTURE_MIN_FILTER: "NEAREST",
};

export const texture = (
  { gl, setTexture, textureIndexes, requestRendering },
  {
    shaderType = "sampler2D",
    target = "TEXTURE_2D",
    setter = "texImage2D",
    updater = "texSubImage2D",
    level = 0,
    format = "RGBA",
    internalFormat = "RGBA32F",
    type = "FLOAT",
    border = 0,
    offset,
    pixels = null,
    width: inputWidth,
    height: inputHeight,
    parameters = defaultParameters,
  }
) => {
  if (isServer) return;

  const TARGET = gl[target];
  const FORMAT = gl[format];
  const INTERNAL_FORMAT = gl[internalFormat];
  const TYPE = gl[type];

  const texture = gl.createTexture();
  setTexture(texture, TARGET);

  const pixelsAreABuffer = !pixels || ArrayBuffer.isView(pixels);
  const width = pixelsAreABuffer && (inputWidth || 64);
  const height = pixelsAreABuffer && (inputHeight || 64);
  let allData = pixels || null;

  for (const key in parameters) {
    gl.texParameteri(gl.TEXTURE_2D, gl[key], gl[parameters[key]]);
  }

  if (pixelsAreABuffer) {
    gl.texImage2D(
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
    gl[setter](TARGET, level, INTERNAL_FORMAT, FORMAT, TYPE, allData);
  }

  const set = (data) => {
    allData = data;

    setTexture(texture, TARGET);
    gl[setter](TARGET, level, INTERNAL_FORMAT, FORMAT, TYPE, allData);
    requestRendering();
  };

  const update = (data, x = 0, y = 0, width = 1, height = 1, dataOffset) => {
    setTexture(texture, TARGET);
    gl[updater](TARGET, level, x, y, width, height, FORMAT, TYPE, data, dataOffset);
  };

  return { shaderType, set, update };
};
