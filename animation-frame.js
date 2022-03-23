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

  frame = frame || requestAnimationFrame(animationFrame);
};

export const unsubscribeFromAnimationFrame = (callback, nthFrame = 1) => {
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
export const requestPostRenderJob = (job) => {
  postRenderJobs.add(job);
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

const runSets = new Set();
let lastTime = performance.now();

const animationFrame = (timestamp) => {
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

  if (renderJobs.size || preRenderJobs.size) {
    // Looks like we're going to render, so we might as well run the other sets too

    for (const [, set] of animationFrameSets) {
      if (!runSets.has(set)) {
        for (const subscriber of set) {
          subscriber(timestamp, sinceLastFrame, frameNumber);
        }
      }
    }
  }

  for (const job of preRenderJobs) {
    preRenderJobs.delete(job);
    job();
  }

  for (const job of renderJobs) {
    renderJobs.delete(job);
    job();
  }

  for (const job of postRenderJobs) {
    postRenderJobs.delete(job);
    job();
  }

  frameNumber++;
  runSets.clear();

  if (totalSubscribers !== 0) {
    frame = requestAnimationFrame(animationFrame);
  } else {
    frame = null;
  }
};
