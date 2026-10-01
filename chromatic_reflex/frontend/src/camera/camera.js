// Camera module: opens the webcam and gives us a per-frame callback
// with the real CAPTURE timestamp (needed for accurate reaction time).

export async function startCamera(videoEl, { width = 640, height = 480, fps = 60 } = {}) {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      width: { ideal: width },
      height: { ideal: height },
      frameRate: { ideal: fps },
      facingMode: "user",
    },
    audio: false,
  });
  videoEl.srcObject = stream;
  await videoEl.play();
  return stream;
}

// Calls cb({ captureTs }) once per NEW camera frame.
// captureTs is in the performance.now() timebase, same clock as the game cue.
export function onFrame(videoEl, cb) {
  if ("requestVideoFrameCallback" in videoEl) {
    const loop = (now, meta) => {
      const captureTs = meta.captureTime ?? meta.expectedDisplayTime ?? now;
      cb({ captureTs });
      videoEl.requestVideoFrameCallback(loop);
    };
    videoEl.requestVideoFrameCallback(loop);
  } else {
    // Fallback for browsers without requestVideoFrameCallback (less accurate)
    const loop = () => {
      cb({ captureTs: performance.now() });
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}
