// Hand gesture classifier for MediaPipe Hands (21 landmarks).
// Usage:
//   const g = classifyGesture(landmarks, video.videoWidth / video.videoHeight);
//   const stable = stabilizer.update(g);

// ---------- Landmark indices ----------
const WRIST = 0;
const THUMB_IP = 3, THUMB_TIP = 4, THUMB_MCP = 2;
const INDEX_MCP = 5, MIDDLE_MCP = 9, RING_MCP = 13, PINKY_MCP = 17;
const TIP = [4, 8, 12, 16, 20];
const MCP = [1, 5, 9, 13, 17];

// ---------- Tunables ----------
export const THUMBS_UP_RISE_THRESHOLD = 0.15; // normalized units of palm scale... see RiseDetector

// Per-finger "extended" ratio (tip-to-wrist / mcp-to-wrist). Index 0 (thumb) unused.
// Pinky runs shorter, so it gets a lower threshold.
const EXT_RATIO = [0, 1.45, 1.45, 1.40, 1.30];
const CURL_FULL = 1.10;   // ratio at which a finger is fully curled
const EXT_FULL  = 1.80;   // ratio at which a finger is fully extended

const THUMB_REACH_MIN = 0.80; // thumb tip to index MCP, in palm units
const THUMB_UP_DIR    = 0.60; // vertical component of thumb direction (1 = straight up)
const THUMB_ABOVE_MIN = 0.10; // thumb tip must sit this far above the knuckles (palm units)

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

// ---------- Feature extraction (computed once per frame) ----------
function analyze(lm, aspect = 1) {
  // Aspect correction: MediaPipe x is normalized by width, y by height.
  const d = (a, b) => Math.hypot((a.x - b.x) * aspect, a.y - b.y);

  const wrist = lm[WRIST];
  const palm = Math.max(d(wrist, lm[MIDDLE_MCP]), 0.08);

  // Per-finger extension score in [0,1] and boolean (fingers 1..4)
  const ext = [0, 0, 0, 0, 0];
  const up = [false, false, false, false, false];
  let extCount = 0;
  for (let i = 1; i < 5; i++) {
    const r = d(wrist, lm[TIP[i]]) / Math.max(d(wrist, lm[MCP[i]]), 1e-6);
    ext[i] = clamp01((r - CURL_FULL) / (EXT_FULL - CURL_FULL));
    up[i] = r > EXT_RATIO[i];
    if (up[i]) extCount++;
  }

  // Thumb
  const reach = d(lm[THUMB_TIP], lm[INDEX_MCP]) / palm;
  const vx = (lm[THUMB_TIP].x - lm[THUMB_MCP].x) * aspect;
  const vy = lm[THUMB_TIP].y - lm[THUMB_MCP].y;
  const dir = -vy / Math.max(Math.hypot(vx, vy), 1e-6); // 1 = up, -1 = down

  const topKnuckleY = Math.min(
    lm[INDEX_MCP].y, lm[MIDDLE_MCP].y, lm[RING_MCP].y, lm[PINKY_MCP].y
  );
  const thumbAbove = (topKnuckleY - lm[THUMB_TIP].y) / palm;

  const thumbsUp =
    reach > THUMB_REACH_MIN && dir >= THUMB_UP_DIR && thumbAbove > THUMB_ABOVE_MIN;

  return { ext, up, extCount, reach, dir, thumbsUp, palm };
}

// ---------- Classification ----------
function labelFrom(f) {
  const { up, extCount, thumbsUp } = f;

  if (extCount === 0) return thumbsUp ? "thumbs_up" : "fist";
  if (extCount === 4) return "open";
  if (extCount === 2 && up[1] && up[2]) return "two_fingers";
  if (extCount === 1 && up[1]) return "point";
  return "none";
}

function confidenceFrom(f, label) {
  const { ext } = f;
  const curl = (i) => 1 - ext[i];

  switch (label) {
    case "fist":
      return curl(1) * 0.3 + curl(2) * 0.3 + curl(3) * 0.2 + curl(4) * 0.2;
    case "thumbs_up": {
      const curled = (curl(1) + curl(2) + curl(3) + curl(4)) / 4;
      return (
        curled * 0.5 +
        clamp01(f.dir) * 0.3 +
        clamp01(f.reach / 1.2) * 0.2
      );
    }
    case "two_fingers":
      return ((ext[1] + ext[2]) / 2) * 0.5 + ((curl(3) + curl(4)) / 2) * 0.5;
    case "point":
      return ext[1] * 0.5 + ((curl(2) + curl(3) + curl(4)) / 3) * 0.5;
    case "open":
      return (ext[1] + ext[2] + ext[3] + ext[4]) / 4;
    default:
      return 0;
  }
}

const valid = (lm) => lm && lm.length >= 21;

export function classifyGesture(landmarks, aspect = 1) {
  if (!valid(landmarks)) return "none";
  return labelFrom(analyze(landmarks, aspect));
}

/** Label + confidence in one pass (preferred: avoids recomputing features). */
export function classifyWithConfidence(landmarks, aspect = 1) {
  if (!valid(landmarks)) return { label: "none", confidence: 0 };
  const f = analyze(landmarks, aspect);
  const label = labelFrom(f);
  return { label, confidence: confidenceFrom(f, label) };
}

export function getGestureConfidence(landmarks, label, aspect = 1) {
  if (!valid(landmarks)) return 0;
  return confidenceFrom(analyze(landmarks, aspect), label);
}

export const GESTURE_DISPLAY = {
  open: "Open Hand",
  fist: "Fist",
  two_fingers: "Two Fingers",
  thumbs_up: "Thumbs Up",
  point: "Pointing",
  none: "None",
};

// ---------- Temporal smoothing ----------
/**
 * Debounces per-frame labels. A new label must persist for `holdFrames`
 * consecutive frames before it becomes the stable output; "none" frames
 * are tolerated for `dropoutFrames` so brief tracking glitches don't reset.
 */
export class GestureStabilizer {
  constructor({ holdFrames = 4, dropoutFrames = 6 } = {}) {
    this.holdFrames = holdFrames;
    this.dropoutFrames = dropoutFrames;
    this.reset();
  }
  reset() {
    this.stable = "none";
    this.candidate = "none";
    this.count = 0;
  }
  update(label) {
    if (label === this.stable) {
      this.candidate = label;
      this.count = 0;
      return this.stable;
    }
    if (label === this.candidate) this.count++;
    else { this.candidate = label; this.count = 1; }

    const needed = label === "none" ? this.dropoutFrames : this.holdFrames;
    if (this.count >= needed) {
      this.stable = label;
      this.count = 0;
    }
    return this.stable;
  }
}

// ---------- Thumbs-up "rise" event ----------
/**
 * Fires once when a thumbs-up hand rises by >= THUMBS_UP_RISE_THRESHOLD
 * (in frame-height units) within `windowMs`. Re-arms when the gesture ends.
 */
export class ThumbsUpRiseDetector {
  constructor({ threshold = THUMBS_UP_RISE_THRESHOLD, windowMs = 800 } = {}) {
    this.threshold = threshold;
    this.windowMs = windowMs;
    this.reset();
  }
  reset() {
    this.samples = []; // [t, wristY]
    this.fired = false;
  }
  /** @returns {boolean} true on the frame the rise is detected */
  update(landmarks, label, t = performance.now()) {
    if (label !== "thumbs_up" || !valid(landmarks)) {
      this.reset();
      return false;
    }
    const y = landmarks[WRIST].y;
    this.samples.push([t, y]);
    while (this.samples.length && t - this.samples[0][0] > this.windowMs) {
      this.samples.shift();
    }
    if (this.fired) return false;

    // y grows downward, so a rise is (oldest y - current y) > 0
    let maxY = -Infinity;
    for (const s of this.samples) if (s[1] > maxY) maxY = s[1];
    if (maxY - y >= this.threshold) {
      this.fired = true;
      return true;
    }
    return false;
  }
}