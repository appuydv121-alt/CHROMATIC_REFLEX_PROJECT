// src/gesture/gestureClassifier.js
// Rotation-tolerant, landmark-only gesture classifier.
// Labels: ["open", "fist", "two_fingers", "thumbs_up", "point", "none"]
//
// MediaPipe indices: 0 wrist | thumb 1-4 | index 5-8 | middle 9-12 | ring 13-16 | pinky 17-20

const TIP = [4, 8, 12, 16, 20];
const PIP = [2, 6, 10, 14, 18];
const MCP = [1, 5, 9, 13, 17];

// Kept for backward compatibility with other modules that import it.
export const THUMBS_UP_RISE_THRESHOLD = 0.15;

// ---- Tunable thresholds ----------------------------------------------------
const FINGER_EXTENDED_RATIO = 1.45; // tip-to-wrist / knuckle-to-wrist above this => extended
const THUMB_REACH_MIN       = 0.80; // thumb tip to index knuckle (in palm units) above this => thumb out
const THUMB_UP_DIRECTION    = 0.60; // how vertical the thumb must point (1 = straight up)

// ---- Helpers ---------------------------------------------------------------
function dist(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function palmScale(lm) {
  return Math.max(dist(lm[0], lm[9]), 0.08);
}

/** Ratio > ~1.45 means finger is straight, < ~1.2 means curled. Works at any rotation. */
function fingerRatio(lm, fingerIdx) {
  const wrist = lm[0];
  const mcpD = Math.max(dist(wrist, lm[MCP[fingerIdx]]), 1e-6);
  return dist(wrist, lm[TIP[fingerIdx]]) / mcpD;
}

/** fingerIdx: 1=index, 2=middle, 3=ring, 4=pinky */
function isExtended(lm, fingerIdx) {
  return fingerRatio(lm, fingerIdx) > FINGER_EXTENDED_RATIO;
}

/** 0 = fully extended, 1 = fully curled (continuous, for confidence scores) */
function curlAmount(lm, fingerIdx) {
  const r = fingerRatio(lm, fingerIdx);
  return Math.min(1, Math.max(0, (1.7 - r) / (1.7 - 1.1)));
}

/** Thumb stuck out away from the palm? (works for left/right hand, any rotation) */
function thumbReach(lm) {
  return dist(lm[4], lm[5]) / palmScale(lm);
}
function isThumbOut(lm) {
  return thumbReach(lm) > THUMB_REACH_MIN;
}

/** How much the thumb points straight up on screen: 1 = up, 0 = sideways, -1 = down */
function thumbUpDirection(lm) {
  const vx = lm[4].x - lm[2].x;
  const vy = lm[4].y - lm[2].y;
  const len = Math.max(Math.sqrt(vx * vx + vy * vy), 1e-6);
  return -vy / len; // image y grows downward
}

function isThumbsUpPose(lm) {
  if (!isThumbOut(lm)) return false;
  if (thumbUpDirection(lm) < THUMB_UP_DIRECTION) return false;
  // thumb tip must be clearly above all four finger knuckles
  const scale = palmScale(lm);
  const highestKnuckle = Math.min(lm[5].y, lm[9].y, lm[13].y, lm[17].y);
  return (highestKnuckle - lm[4].y) / scale > 0.10;
}

// ---- Main classifier -------------------------------------------------------
export function classifyGesture(landmarks) {
  if (!landmarks || landmarks.length < 21) return "none";
  const lm = landmarks;

  const indexUp  = isExtended(lm, 1);
  const middleUp = isExtended(lm, 2);
  const ringUp   = isExtended(lm, 3);
  const pinkyUp  = isExtended(lm, 4);
  const extCount = [indexUp, middleUp, ringUp, pinkyUp].filter(Boolean).length;

  // 1. Thumbs up: all fingers curled + thumb out and pointing up
  if (extCount === 0 && isThumbsUpPose(lm)) return "thumbs_up";

  // 2. Open hand: 4 fingers extended (thumb ignored)
  if (extCount === 4) return "open";

  // 3. Two fingers: index + middle only (thumb position doesn't matter)
  if (indexUp && middleUp && !ringUp && !pinkyUp) return "two_fingers";

  // 4. Point: index only (thumb position doesn't matter)
  if (indexUp && !middleUp && !ringUp && !pinkyUp) return "point";

  // 5. Fist: fingers curled and NOT a thumbs-up.
  //    Thumb can be tucked, across the fingers, or to the side - all count as fist.
  if (!indexUp && !middleUp && extCount <= 1 && !isThumbsUpPose(lm)) return "fist";

  return "none";
}

export const GESTURE_DISPLAY = {
  open:        "Open Hand",
  fist:        "Fist",
  two_fingers: "Two Fingers",
  thumbs_up:   "Thumbs Up",
  point:       "Pointing",
  none:        "None",
};

/** Confidence [0,1] that `landmarks` show `label`. */
export function getGestureConfidence(landmarks, label) {
  if (!landmarks || landmarks.length < 21) return 0;
  const lm = landmarks;
  const curl = (i) => curlAmount(lm, i);
  const ext  = (i) => 1 - curlAmount(lm, i);

  switch (label) {
    case "fist": {
      if (isThumbsUpPose(lm)) return 0;
      return curl(1) * 0.3 + curl(2) * 0.3 + curl(3) * 0.2 + curl(4) * 0.2;
    }
    case "thumbs_up": {
      const fingersCurled = (curl(1) + curl(2) + curl(3) + curl(4)) / 4;
      const dir = Math.min(1, Math.max(0, thumbUpDirection(lm)));
      const reach = Math.min(1, thumbReach(lm) / 1.2);
      return fingersCurled * 0.5 + dir * 0.3 + reach * 0.2;
    }
    case "two_fingers":
      return (ext(1) + ext(2)) / 2 * 0.5 + (curl(3) + curl(4)) / 2 * 0.5;
    case "point":
      return ext(1) * 0.5 + (curl(2) + curl(3) + curl(4)) / 3 * 0.5;
    case "open":
      return (ext(1) + ext(2) + ext(3) + ext(4)) / 4;
    default:
      return 0;
  }
}