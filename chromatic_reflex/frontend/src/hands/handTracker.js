// Wrapper around MediaPipe Hand Landmarker. Everything else in the
// project talks to this wrapper, never to MediaPipe directly.
import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

// CDN for now. Before the exhibition, download these and serve locally (offline venue!).
const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

export async function createHandTracker() {
  const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
  const landmarker = await HandLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
    runningMode: "VIDEO",
    numHands: 1,
    minHandDetectionConfidence: 0.5,
    minHandPresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });

  let lastTs = -1;
  return {
    // Returns { landmarks: [21 x {x,y,z}] | null, handedness, score }
    detect(videoEl) {
      // MediaPipe requires strictly increasing timestamps
      let ts = performance.now();
      if (ts <= lastTs) ts = lastTs + 1;
      lastTs = ts;

      const r = landmarker.detectForVideo(videoEl, ts);
      const hand = r.landmarks?.[0] ?? null;
      const h = r.handednesses?.[0]?.[0];
      return {
        landmarks: hand,
        handedness: h?.categoryName ?? null, // NOTE: may be flipped for non-mirrored video, verify in Step 2
        score: h?.score ?? 0,
      };
    },
  };
}
