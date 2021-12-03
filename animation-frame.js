import { isServer } from "@vuoro/rahti";

const animationFrameSets = new Map();
const preRenderJobs = new Set();
const renderJobs = new Set();
let frameNumber = 0;
let totalSubscribers = 0;
let frame = null;
const now = new Date();
const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
const navigationStart = performance?.timing?.navigationStart || 0;
const timeOffset = navigationStart - startOfMonth.valueOf();

export const subscribeToAnimationFrame = (callback, nthFrame) => {
  if (isServer) return;
  if (!animationFrameSets.has(nthFrame)) {
    animationFrameSets.set(nthFrame, new Set());
  }
  const set = animationFrameSets.get(nthFrame);
  set.add(callback);
  totalSubscribers++;

  frame = frame || requestAnimationFrame(animationFrame);
};

export const unsubscribeFromAnimationFrame = (callback, nthFrame) => () => {
  animationFrameSets.get(nthFrame).delete(callback);
  totalSubscribers--;
};

export const requestPreRenderJob = (job) => {
  preRenderJobs.add(job);
  frame = frame || requestAnimationFrame(animationFrame);
};
export const requestRenderJob = (job) => {
  renderJobs.add(job);
  frame = frame || requestAnimationFrame(animationFrame);
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
};

const animationFrame = (timestamp) => {
  for (const [nthFrame, set] of animationFrameSets) {
    if (frameNumber % nthFrame === 0) {
      for (const subscriber of set) {
        subscriber(timestamp, timestamp + navigationStart, timestamp + timeOffset, frameNumber);
      }
    }
  }

  for (const job of preRenderJobs) {
    job();
  }
  preRenderJobs.clear();

  for (const job of renderJobs) {
    job();
  }
  renderJobs.clear();

  frameNumber++;

  if (totalSubscribers !== 0) {
    frame = requestAnimationFrame(animationFrame);
  } else {
    frame = null;
  }
};
