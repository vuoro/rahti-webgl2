import { isServer } from "@vuoro/rahti";

const animationFrameSets = new Map();
const animationFrameJobs = new Set();
const animationFrameRenderJobs = new Set();
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
  animationFrameJobs.add(job);
  frame = frame || requestAnimationFrame(animationFrame);
};

export const requestRenderJob = (job) => {
  animationFrameRenderJobs.add(job);
  frame = frame || requestAnimationFrame(animationFrame);
};

export const cancelJobsAndStopFrame = () => {
  if (frame) {
    cancelAnimationFrame(frame);
    frame = null;
  }

  animationFrameJobs.clear();
  animationFrameRenderJobs.clear();
};

const animationFrame = (timestamp) => {
  for (const [nthFrame, set] of animationFrameSets) {
    if (frameNumber % nthFrame === 0) {
      for (const subscriber of set) {
        subscriber(timestamp, timestamp + navigationStart, timestamp + timeOffset, frameNumber);
      }
    }
  }

  for (const job of animationFrameJobs) {
    job();
  }
  animationFrameJobs.clear();

  for (const job of animationFrameRenderJobs) {
    job();
  }
  animationFrameRenderJobs.clear();

  frameNumber++;

  if (totalSubscribers !== 0) {
    frame = requestAnimationFrame(animationFrame);
  } else {
    frame = null;
  }
};
