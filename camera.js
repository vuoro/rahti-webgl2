import { create, perspective, ortho, lookAt, multiply, invert } from "gl-mat4-esm";
import { uniformBlock } from "./uniformBlock.js";
import { requestPreRenderJob } from "./animation-frame.js";

export const defaultCameraIncludes = new Set([
  // "projection",
  // "view",
  "projectionView",
  "inverseProjectionView",
  "cameraPosition",
  "cameraTarget",
  "cameraDirection",
  "cameraDistanceToTarget",
  // "cameraUp",
  // "cameraNear",
  // "cameraFar",
  // "cameraZoom",
  // "cameraFov",
  // "pixelRatio",
]);

export const createCamera = async function (context, props = {}, include = defaultCameraIncludes) {
  let { fov = 60, near = 0.1, far = 1000, zoom = 1 } = props;

  let width = context?.gl?.drawingBufferWidth || 1;
  let height = context?.gl?.drawingBufferHeight || 1;
  let pixelRatio = window.devicePixelRatio;
  let projectionNeedsUpdate = true;

  const projection = create();
  const view = create();
  const projectionView = create();
  const inverseProjectionView = create();

  const position = Float32Array.from(props.position || [0, 0, 2]);
  const target = Float32Array.from(props.target || [0, 0, 0]);
  const up = Float32Array.from(props.up || [0, 0, 1]);

  const direction = Float32Array.from([0, 0, -1]);
  let distance = 1;

  const calculateDirectionAndDistance = () => {
    direction[0] = target[0] - position[0];
    direction[1] = target[1] - position[1];
    direction[2] = target[2] - position[2];

    const sum =
      direction[0] * direction[0] + direction[1] * direction[1] + direction[2] * direction[2];
    distance = Math.sqrt(sum);

    direction[0] /= distance;
    direction[1] /= distance;
    direction[2] /= distance;
  };

  const uniformMap = {};
  if (include.has("projection")) uniformMap.projection = projection;
  if (include.has("view")) uniformMap.view = view;
  if (include.has("projectionView")) uniformMap.projectionView = projectionView;
  if (include.has("inverseProjectionView"))
    uniformMap.inverseProjectionView = inverseProjectionView;
  if (include.has("cameraPosition")) uniformMap.cameraPosition = position;
  if (include.has("cameraTarget")) uniformMap.cameraTarget = target;
  if (include.has("cameraDirection")) uniformMap.cameraDirection = direction;
  if (include.has("cameraDistanceToTarget")) uniformMap.cameraDistanceToTarget = distance;
  if (include.has("cameraUp")) uniformMap.cameraUp = up;
  if (include.has("cameraNear")) uniformMap.cameraNear = near;
  if (include.has("cameraFar")) uniformMap.cameraFar = far;
  if (include.has("cameraZoom")) uniformMap.cameraZoom = zoom;
  if (include.has("cameraFov")) uniformMap.cameraFov = fov;
  if (include.has("pixelRatio")) uniformMap.pixelRatio = pixelRatio;

  const block = await this(uniformBlock)(context, uniformMap);

  const update = (key, value) => {
    if (include.has(key)) block.update(key, value);
  };

  const updateProjection = () => {
    if (fov !== undefined) {
      const aspect = width / height;
      const fovInRadians = (fov * Math.PI) / 180;
      const finalFov = aspect >= 1 ? fovInRadians : fovInRadians / (0.5 + aspect / 2);
      perspective(projection, finalFov, aspect, near, far);
    } else {
      const worldWidth = width > height ? width / height : 1;
      const worldHeight = width > height ? 1 : height / width;

      const left = -worldWidth / 2 / zoom;
      const right = worldWidth / 2 / zoom;
      const top = worldHeight / 2 / zoom;
      const bottom = -worldHeight / 2 / zoom;

      ortho(projection, left, right, bottom, top, near, far);
    }

    update("projection", projection);
    update("cameraNear", near);
    update("cameraFar", far);
    update("cameraZoom", zoom);
    update("cameraFov", fov);
  };

  const updateView = () => {
    lookAt(view, position, target, up);

    update("cameraPosition", position);
    update("cameraTarget", target);
    update("cameraUp", up);

    calculateDirectionAndDistance();
    update("cameraDirection", direction);
    update("cameraDistanceToTarget", distance);

    update("view", view);
  };

  const updateCombined = () => {
    multiply(projectionView, projection, view);
    invert(inverseProjectionView, projectionView);

    update("projectionView", projectionView);
    update("inverseProjectionView", inverseProjectionView);
  };

  const updateCamera = () => {
    if (projectionNeedsUpdate) updateProjection();
    updateView();
    updateCombined();
  };

  const updateDevicePixelRatio = () => {
    update("pixelRatio", pixelRatio);
  };

  requestPreRenderJob(updateCamera);

  context.resizeSubscribers.add((x, y, drawingBufferWidth, drawingBufferHeight, ratio) => {
    width = drawingBufferWidth;
    height = drawingBufferHeight;

    projectionNeedsUpdate = true;
    requestPreRenderJob(updateCamera);

    if (ratio !== pixelRatio) {
      pixelRatio = ratio;
      requestPreRenderJob(updateDevicePixelRatio);
    }
  });

  const proxyHandler = {
    set: function (target, prop, newValue) {
      target[prop] = newValue;

      if (prop == "0" || prop == "1" || prop == "2") {
        requestPreRenderJob(updateCamera);
      }

      return true;
    },
  };

  const camera = {
    position: new Proxy(position, proxyHandler),
    target: new Proxy(target, proxyHandler),
    up: new Proxy(up, proxyHandler),
    direction,

    get fov() {
      return fov;
    },
    get near() {
      return near;
    },
    get far() {
      return far;
    },
    get zoom() {
      return zoom;
    },

    set fov(input) {
      fov = input;
      projectionNeedsUpdate = true;
      requestPreRenderJob(updateCamera);
    },
    set near(input) {
      near = input;
      projectionNeedsUpdate = true;
      requestPreRenderJob(updateCamera);
    },
    set far(input) {
      far = input;
      projectionNeedsUpdate = true;
      requestPreRenderJob(updateCamera);
    },
    set zoom(input) {
      zoom = input;
      projectionNeedsUpdate = true;
      requestPreRenderJob(updateCamera);
    },
  };

  return [camera, block];
};
