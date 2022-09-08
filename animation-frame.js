import { CleanUp } from "@vuoro/rahti";

const animationFrameSets = new Map();
export const preRenderJobs = new Set();
export const renderJobs = new Set();
export const postRenderJobs = new Set();
let frameNumber = 0;
let totalSubscribers = 0;
let frame = null;

export const subscribeToAnimationFrame = (callback, nthFrame = 1) => {
  if (!animationFrameSets.has(nthFrame)) {
    animationFrameSets.set(nthFrame, new Set());
  }
  const set = animationFrameSets.get(nthFrame);
  set.add(callback);
  totalSubscribers++;

  frame = frame || requestAnimationFrame(runAnimationFrame);
};

export const unsubscribeFromAnimationFrame = (callback, nthFrame = 1) => {
  animationFrameSets.get(nthFrame).delete(callback);
  totalSubscribers--;
};

export const AnimationFrame = function (callback, nthFrame = 1) {
  subscribeToAnimationFrame(callback, nthFrame);
  callbacks.set(this, callback);
  nthFrames.set(this, nthFrame);
  this.run(CleanUp, { cleaner: cleanAnimationFrame });
};

const callbacks = new Map();
const nthFrames = new Map();

function cleanAnimationFrame(isFinal) {
  unsubscribeFromAnimationFrame(callbacks.get(this), nthFrames.get(this));

  if (isFinal) {
    callbacks.delete(this);
    nthFrames.delete(this);
  }
}

export const requestPreRenderJob = (job) => {
  preRenderJobs.add(job);
  frame = frame || requestAnimationFrame(runAnimationFrame);
};
export const requestRenderJob = (job) => {
  renderJobs.add(job);
  frame = frame || requestAnimationFrame(runAnimationFrame);
};
export const requestPostRenderJob = (job) => {
  postRenderJobs.add(job);
  frame = frame || requestAnimationFrame(runAnimationFrame);
};

export const cancelPreRenderJob = (job) => preRenderJobs.delete(job);
export const cancelRenderJob = (job) => renderJobs.delete(job);

export const cancelJobsAndStopFrame = () => {
  if (frame) {
    cancelAnimationFrame(frame);
    frame = null;
  }

  preRenderJobs.clear();
  renderJobs.clear();
  postRenderJobs.clear();
};

const runSets = new Set();
let lastTime = performance.now();

const runAnimationFrame = (timestamp) => {
  const sinceLastFrame = timestamp - lastTime;
  lastTime = timestamp;

  for (const [nthFrame, set] of animationFrameSets) {
    if (frameNumber % nthFrame === 0) {
      for (const subscriber of set) {
        subscriber(timestamp, sinceLastFrame, frameNumber);
      }
      runSets.add(set);
    }
  }

  for (const job of preRenderJobs) {
    preRenderJobs.delete(job);
    job();
  }

  for (const job of renderJobs) {
    renderJobs.delete(job);
    job(timestamp, sinceLastFrame, frameNumber);
  }

  for (const job of postRenderJobs) {
    postRenderJobs.delete(job);
    job();
  }

  frameNumber++;
  runSets.clear();

  if (totalSubscribers !== 0) {
    frame = requestAnimationFrame(runAnimationFrame);
  } else {
    frame = null;
  }
};
