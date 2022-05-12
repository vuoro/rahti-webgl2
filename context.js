import { cleanup, update, component } from "@vuoro/rahti";
import { cancelJobsAndStopFrame, requestRenderJob } from "./animation-frame.js";

const defaultAttributes = {
  antialias: false,
};

const defaultOptions = {
  clearColor: [0, 0, 0, 1],
  pixelRatio: 1,
  debug: false,
};

export const context = component(function context(canvas, inputAttributes, options) {
  if (!canvas || !(canvas instanceof Node)) throw new Error("Missing canvas");

  const attributes = { ...defaultAttributes, ...inputAttributes };
  const { clearColor, pixelRatio, debug } = { ...defaultOptions, ...options };

  const gl = canvas.getContext("webgl2", attributes);
  const textureIndexes = new Map();
  const resizeSubscribers = new Set();

  // Caches and setters
  let currentProgram = null;
  let currentVao = null;
  let currentBuffer = null;
  let currentTexture = null;
  let currentFramebuffer = null;
  let currentDepth = null;
  let currentCull = null;
  let currentBlend = null;

  const setProgram = (program) => {
    if (currentProgram !== program) {
      gl.useProgram(program);
      currentProgram = program;
    }
  };
  const setVao = (vao = null) => {
    if (currentVao !== vao) {
      gl.bindVertexArray(vao);
      currentVao = vao;
    }
  };
  const setBuffer = (buffer, type = gl.ARRAY_BUFFER) => {
    if (currentBuffer !== buffer) {
      gl.bindBuffer(type, buffer);
      currentBuffer = buffer;
    }
  };
  const setDepth = (depth) => {
    if (currentDepth !== depth) {
      if (depth) {
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl[depth]);
      } else {
        gl.disable(gl.DEPTH_TEST);
      }
      currentDepth = depth;
    }
  };
  const setCull = (cull) => {
    if (currentCull !== cull) {
      if (cull) {
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl[cull]);
      } else {
        gl.disable(gl.CULL_FACE);
      }
      currentCull = cull;
    }
  };

  const setBlend = (sourceFactor, destinationFactor) => {
    if (currentBlend !== sourceFactor + destinationFactor) {
      if (sourceFactor && destinationFactor) {
        gl.enable(gl.BLEND);
        gl.blendFunc(gl[sourceFactor], gl[destinationFactor]);
      } else {
        gl.disable(gl.BLEND);
      }
      currentBlend = sourceFactor + destinationFactor;
    }
  };

  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);

  const setTexture = (texture, TARGET = gl.TEXTURE_2D) => {
    if (currentTexture !== texture) {
      if (!textureIndexes.has(texture)) {
        textureIndexes.set(texture, textureIndexes.size);
      }

      const index = textureIndexes.get(texture);
      gl.activeTexture(gl[`TEXTURE${index}`]);
      gl.bindTexture(TARGET, texture);
    }

    currentTexture = texture;
  };

  const setFramebuffer = (framebuffer) => {
    if (currentFramebuffer !== framebuffer) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      currentFramebuffer = framebuffer;
    }
  };

  // Clearing
  let lastDepth = 1;
  const setClear = (color = clearColor, depth = lastDepth) => {
    color.forEach((value, index) => {
      clearColor[index] = value;
    });
    gl.clearColor(...clearColor);
    if (lastDepth.current !== depth) {
      gl.clearDepth(depth);
      lastDepth = depth;
    }
  };
  setClear();
  const clear = (value = 16640) => {
    gl.clear(value);
  };

  // Without a set width, the ResizeObserver will end up in an infinite loop
  const width = canvas.style.getPropertyValue("width");
  if (!width) {
    console.warn(
      "Canvas doesn't seem to have a set CSS width. It needs one to make rahti-webgl2's ResizeObserver work properly. It will now be set to `width: 100%`."
    );
    canvas.style.setProperty("width", "100%");
  }

  const observer = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const width = entry.contentBoxSize?.[0]?.inlineSize || entry.width || 0;
      const height = entry.contentBoxSize?.[0]?.blockSize || entry.height || 0;
      const ratio = (globalThis?.devicePixelRatio || 1) * pixelRatio;

      canvas.width = width * ratio;
      canvas.height = height * ratio;
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

      for (const subscriber of resizeSubscribers) {
        subscriber(0, 0, width, height, ratio);
      }

      requestRendering();
    }
  });

  try {
    observer.observe(canvas, { box: "device-pixel-content-box" });
  } catch {
    observer.observe(canvas);
  }

  const handleLost = (event) => {
    console.log("context lost");
    event.preventDefault();
    stopped = true;
    cancelJobsAndStopFrame();
  };
  const handleRestored = () => {
    console.log("restoring context");
    update(this);
  };

  canvas.addEventListener("webglcontextlost", handleLost);
  canvas.addEventListener("webglcontextrestored", handleRestored);

  cleanup(this, () => {
    stopped = true;
    cancelJobsAndStopFrame();
    observer.disconnect();
    canvas.removeEventListener("webglcontextlost", handleLost);
    canvas.removeEventListener("webglcontextrestored", handleRestored);
  });

  let renderFunction;
  let stopped = false;
  const frame = (renderPass) => {
    renderFunction = renderPass;
    requestRendering();
  };
  const executeRender = () => {
    if (renderFunction && !stopped) renderFunction();
  };

  const requestRendering = () => {
    requestRenderJob(executeRender);
  };

  return {
    gl,
    setProgram,
    setVao,
    setBuffer,
    setDepth,
    setCull,
    setBlend,
    setTexture,
    textureIndexes,
    setFramebuffer,
    setClear,
    clear,
    resizeSubscribers,
    uniformBindIndexCounter: 0,
    frame,
    requestRendering,
    debug,
  };
});
