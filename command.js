import { isServer, effect, onCleanup } from "@vuoro/rahti";

const blank = {};

export const command = effect(
  (
    { gl, setBuffer, setProgram, setVao, setDepth, setCull },
    {
      // Static
      attributes = blank,
      uniformBlocks = blank,
      textures = blank,
      instances,
      elements,

      vert,
      vertex = vert,
      frag,
      fragment = frag,

      shaderVersion = "#version 300 es",
      vertexPrecision = ``,
      fragmentPrecision = `#ifdef GL_FRAGMENT_PRECISION_HIGH
  precision highp float;
#else
  precision mediump float;
#endif`,

      // Can be overridden at runtime
      mode = "TRIANGLES",
      depth = "LESS",
      cull = "BACK",

      // Runtime-only overrides
      // count: overrideCount,
      // instanceCount: overrideInstanceCount,

      // Later
      // target, https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/framebufferTexture2D
      // attachments, https://developer.mozilla.org/en-US/docs/Web/API/WEBGL_draw_buffers
    }
  ) => {
    if (isServer) return {};
    if (!vertex || !fragment) throw new Error("missing vertex or fragment shader");
    if (attributes === blank) throw new Error("missing at least one attribute");

    const isInstanced = !!instances;
    const instanceSet = instances?.instances;
    const usesElements = !!elements;
    const UNSIGNED_SHORT = gl.UNSIGNED_SHORT;

    // Shaders
    let attributeLines = "",
      textureLines = "",
      uniformBlockLines = "";

    for (const key in attributes) {
      const { shaderType } = attributes[key];
      attributeLines += `in ${shaderType} ${key};\n`;
    }

    if (instances) {
      for (const [key, { shaderType }] of instances.attributes) {
        attributeLines += `in ${shaderType} ${key};\n`;
      }
    }

    for (const key in textures) {
      const { shaderType } = textures[key];
      textureLines += `uniform ${shaderType} ${key};\n`;
    }

    for (const key in uniformBlocks) {
      const { uniforms } = uniformBlocks[key];
      uniformBlockLines += `layout(std140) uniform ${key} {\n`;
      for (const key in uniforms) {
        const { shaderType } = uniforms[key];
        uniformBlockLines += `  ${shaderType} ${key};\n`;
      }
      uniformBlockLines += `};\n`;
    }

    const finalVertex = `${shaderVersion}
${vertexPrecision}
${attributeLines}
${textureLines}
${uniformBlockLines}
${vertex}`;
    const finalFragment = `${shaderVersion}
${fragmentPrecision}
${textureLines}
${uniformBlockLines}
${fragment}`;

    // console.log(finalVertex);
    // console.log(finalFragment);

    // Compile shaders and log errors
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(vertexShader, finalVertex);
    gl.shaderSource(fragmentShader, finalFragment);

    gl.compileShader(vertexShader);
    gl.compileShader(fragmentShader);

    const vertexLog = gl.getShaderInfoLog(vertexShader);
    const fragmentLog = gl.getShaderInfoLog(fragmentShader);
    if (vertexLog) logError(vertexLog, finalVertex);
    if (fragmentLog) logError(fragmentLog, finalFragment);

    // Compile program and log errors
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program));
    }

    setProgram(program);

    // VAO for elements and attributes
    const vao = gl.createVertexArray();
    setBuffer();
    setVao(vao);

    // Elements
    if (usesElements) setBuffer(elements.buffer, gl.ELEMENT_ARRAY_BUFFER);

    // Attribute vertex count
    let count = Infinity;
    const measureCount = () => {
      count = Infinity;
      for (const key in attributes) {
        const attribute = attributes[key];
        count = Math.min(count, attribute.count);
        attribute.countSubscribers.add(measureCount);
      }
    };
    measureCount();

    // Rahti cleanup
    onCleanup(() => {
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      gl.deleteProgram(program);
      gl.deleteVertexArray(vao);

      for (const { countSubscribers } of attributes) {
        countSubscribers.delete(measureCount);
      }
    });

    // Attributes
    for (let i = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES) - 1; i >= 0; i--) {
      const { name } = gl.getActiveAttrib(program, i);
      const location = gl.getAttribLocation(program, name);

      const instancedAttribute = instances?.attributes.get(name);
      const attribute = attributes[name] || instancedAttribute;
      const isInstanced = !!instancedAttribute;

      if (location === -1 || !attribute) {
        console.warn(`Failed linking attribute ${name}`);
        continue;
      }

      if (isInstanced) {
        gl.vertexAttribDivisor(location, 1);
      }

      gl.enableVertexAttribArray(location);
      setBuffer(attribute.buffer);
      gl.vertexAttribPointer(location, attribute.dimensions, gl[attribute.bufferType], false, 0, 0);
    }

    // Turn off vao after bindings are done
    setVao();

    // Uniform blocks
    for (let i = gl.getProgramParameter(program, gl.ACTIVE_UNIFORM_BLOCKS) - 1; i >= 0; i--) {
      const name = gl.getActiveUniformBlockName(program, i);
      const index = gl.getUniformBlockIndex(program, name);

      const uniformBlock = uniformBlocks[name];

      if (index === -1 || uniformBlock.bindIndex === undefined) {
        console.warn(`Failed linking uniform block ${name}`);
        continue;
      }

      gl.uniformBlockBinding(program, index, uniformBlock.bindIndex);
    }

    // Textures
    const totalUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    const indexes = [...Array(totalUniforms).keys()];
    const blockIndexes = gl.getActiveUniforms(program, indexes, gl.UNIFORM_BLOCK_INDEX);
    const indexesOfNonBlockUniforms = indexes.filter((index) => blockIndexes[index] === -1);

    for (const i of indexesOfNonBlockUniforms) {
      const { name } = gl.getActiveUniform(program, i);
      const location = gl.getUniformLocation(program, name);

      const texture = textures[name];

      if (location === -1 || texture.index === undefined) {
        console.warn(`Failed linking texture ${name}`);
        continue;
      }

      gl.uniform1i(location, texture.index);
    }

    // Render
    let executeRender;

    if (isInstanced) {
      if (usesElements) {
        executeRender = (mode, count, instanceCount) =>
          gl.drawElementsInstanced(mode, count, UNSIGNED_SHORT, 0, instanceCount);
      } else {
        executeRender = (mode, count, instanceCount) =>
          gl.drawArraysInstanced(mode, 0, count, instanceCount);
      }
    } else {
      if (usesElements) {
        executeRender = (mode, count) => gl.drawElements(mode, count, UNSIGNED_SHORT, 0);
      } else {
        executeRender = (mode, count) => gl.drawArrays(mode, 0, count);
      }
    }

    const render = (
      overrideMode = mode,
      overrideDepth = depth,
      overrideCull = cull,
      overrideCount = usesElements ? elements.count : count,
      overrideInstanceCount = isInstanced && instanceSet.size
    ) => {
      if (isInstanced && !overrideInstanceCount) return;

      setProgram(program);
      setVao(vao);
      setDepth(overrideDepth);
      setCull(overrideCull);
      executeRender(gl[overrideMode], overrideCount, overrideInstanceCount);
      setVao();
    };

    return render;
  }
);

const logError = (log, shader) => {
  const position = log.match(/(\d+:\d+)/g)[0];
  if (position) {
    const [, lineNumber] = position.split(":");
    let lineIndex = 1;
    for (const line of shader.split("\n")) {
      if (Math.abs(lineIndex - lineNumber) < 8) {
        console[lineIndex === +lineNumber ? "warn" : "log"](`${lineIndex} ${line}`);
      }
      lineIndex++;
    }
  }
};
