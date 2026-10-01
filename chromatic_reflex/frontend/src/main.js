// Throwaway Step 1 test page: camera -> hand tracking -> skeleton + FPS.
// Later, Member B's React app will import the same modules instead.
import { startCamera, onFrame } from "./camera/camera.js";
import { createHandTracker } from "./hands/handTracker.js";
import { drawHand } from "./hands/overlay.js";

const video = document.getElementById("video");
const canvas = document.getElementById("overlay");
const hud = document.getElementById("hud");
const ctx = canvas.getContext("2d");

async function main() {
  hud.textContent = "Starting camera...";
  await startCamera(video);
  hud.textContent = "Loading hand model...";
  const tracker = await createHandTracker();

  let frames = 0, fps = 0, lastFpsTime = performance.now();
  let lastCapture = 0;

  onFrame(video, ({ captureTs }) => {
    const t0 = performance.now();
    const res = tracker.detect(video);
    const inferMs = performance.now() - t0;
    drawHand(ctx, res.landmarks);

    frames++;
    const now = performance.now();
    if (now - lastFpsTime >= 1000) {
      fps = frames; frames = 0; lastFpsTime = now;
    }
    const gap = lastCapture ? (captureTs - lastCapture).toFixed(1) : "-";
    lastCapture = captureTs;

    hud.textContent =
      `FPS: ${fps}\n` +
      `Inference: ${inferMs.toFixed(1)} ms\n` +
      `Frame gap: ${gap} ms\n` +
      `Hand: ${res.landmarks ? "YES" : "no"}  Handedness: ${res.handedness ?? "-"}  Score: ${res.score.toFixed(2)}`;
  });
}

main().catch((e) => { hud.textContent = "Error: " + e.message; console.error(e); });
