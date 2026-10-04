import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

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

    detect(videoEl) {
      try {

        let ts = performance.now();
        if (ts <= lastTs) ts = lastTs + 1;
        lastTs = ts;

        const r = landmarker.detectForVideo(videoEl, ts);
        const hand = r.landmarks?.[0] ?? null;
        const h = r.handednesses?.[0]?.[0];
        return {
          landmarks: hand,
          handedness: h?.categoryName ?? null,
          score: h?.score ?? 0,
        };
      } catch (err) {
        console.warn("HandTracker detect recovered from error:", err);
        return {
          landmarks: null,
          handedness: null,
          score: 0,
        };
      }
    },
  };
}

