// Hand gesture classifier for MediaPipe Hands (21 landmarks).
// Usage (simple):
//   const tracker = new GestureTracker();
//   const { stable, confidence, thumbsUpRise } =
//     tracker.update(landmarks, video.videoWidth / video.videoHeight);

// ---------- Landmark indices ----------
const WRIST = 0;
const THUMB_MCP = 2, THUMB_TIP = 4;
const INDEX_MCP = 5, MIDDLE_MCP = 9, RING_MCP = 13, PINKY_MCP = 17;
const TIP = [4, 8, 12, 16, 20];
const MCP = [1, 5, 9, 13, 17];

// ---------- Tunables ----------
/** Rise needed to trigger the thumbs-up "rise" event, in frame-height units. */
export const THUMBS_UP_RISE_THRESHOLD = 0.15;

const USE_Z = true; // use MediaPipe's z for finger lengths (robust to hand rotation)

// Per-finger "extended" ratio (tip-to-wrist / mcp-to-wrist). Index 0 (thumb) unused.
const EXT_RATIO = [0, 1.45, 1.45, 1.40, 1.30];
const CURL_FULL = 1.10;
const EXT_FULL = 1.80;
// When we were already showing a thumbs-up, fingers must be *clearly* extended
// to break it (hysteresis), so a slightly loose fist doesn't flip to "fist".
const STAY_EXT_SCALE = 1.10;

// Thumbs-up thresholds: [enter, stay]. "stay" is looser (hysteresis).
const THUMB = {
  reach: [0.75, 0.60], // thumb tip to index MCP, in palm units
  dir:   [0.55, 0.35], // vertical component of thumb direction (1 = straight up)
  above: [0.03, -0.05] // thumb tip above the knuckles, in palm units
};

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const valid = (lm) => lm && lm.length >= 21;

// ---------- Feature extraction (computed once per frame) ----------
function analyze(lm, aspect = 1, prev = "none") {
  const wasThumbsUp = prev === "thumbs_up";
  const k = wasThumbsUp ? 1 : 0;

  // x is normalized by width, y by height: correct x (and z) by aspect.
  const d2 = (a, b) => Math.hypot((a.x - b.x) * aspect, a.y - b.y);
  const d3 = (a, b) => {
    const dz = USE_Z ? ((a.z || 0) - (b.z || 0)) * aspect : 0;
    return Math.hypot((a.x - b.x) * aspect, a.y - b.y, dz);
  };

  const wrist = lm[WRIST];
  const palm = Math.max(d2(wrist, lm[MIDDLE_MCP]), 0.08);

  const ext = [0, 0, 0, 0, 0];
  const up = [false, false, false, false, false];
  let extCount = 0;
  for (let i = 1; i < 5; i++) {
    const r = d3(wrist, lm[TIP[i]]) / Math.max(d3(wrist, lm[MCP[i]]), 1e-6);
    ext[i] = clamp01((r - CURL_FULL) / (EXT_FULL - CURL_FULL));
    const thr = EXT_RATIO[i] * (wasThumbsUp ? STAY_EXT_SCALE : 1);
    up[i] = r > thr;
    if (up[i]) extCount++;
  }

  // Thumb
  const reach = d2(lm[THUMB_TIP], lm[INDEX_MCP]) / palm;
  const vx = (lm[THUMB_TIP].x - lm[THUMB_MCP].x) * aspect;
  const vy = lm[THUMB_TIP].y - lm[THUMB_MCP].y;
  const dir = -vy / Math.max(Math.hypot(vx, vy), 1e-6); // 1 = up, -1 = down

  const topKnuckleY = Math.min(
    lm[INDEX_MCP].y, lm[MIDDLE_MCP].y, lm[RING_MCP].y, lm[PINKY_MCP].y
  );
  const thumbAbove = (topKnuckleY - lm[THUMB_TIP].y) / palm;

  const thumbsUp =
    reach > THUMB.reach[k] && dir >= THUMB.dir[k] && thumbAbove > THUMB.above[k];

  return { ext, up, extCount, reach, dir, thumbAbove, thumbsUp, palm };
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
      return curled * 0.5 + clamp01(f.dir) * 0.3 + clamp01(f.reach / 1.2) * 0.2;
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

/**
 * @param prev  last *stable* label. Pass it to enable hysteresis
 *              (makes thumbs-up much less flickery).
 */
export function classifyGesture(landmarks, aspect = 1, prev = "none") {
  if (!valid(landmarks)) return "none";
  return labelFrom(analyze(landmarks, aspect, prev));
}

/** Label + confidence in one pass. */
export function classifyWithConfidence(landmarks, aspect = 1, prev = "none") {
  if (!valid(landmarks)) return { label: "none", confidence: 0 };
  const f = analyze(landmarks, aspect, prev);
  const label = labelFrom(f);
  return { label, confidence: confidenceFrom(f, label) };
}

export function getGestureConfidence(landmarks, label, aspect = 1, prev = "none") {
  if (!valid(landmarks)) return 0;
  return confidenceFrom(analyze(landmarks, aspect, prev), label);
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
 * Debounces per-frame labels. A new label must be seen `holdFrames` times
 * (net of frames agreeing with the current stable label) before it takes over.
 * One-frame glitches no longer reset progress toward a new gesture.
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
      if (this.count > 0) this.count--; // decay instead of hard reset
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
 * Fires once when a thumbs-up hand rises by >= threshold (frame-height units)
 * within `windowMs`. Re-arms when the gesture ends. Feed it the *stable* label.
 * Brief dropouts (<= graceMs) don't reset tracking.
 */
export class ThumbsUpRiseDetector {
  constructor({ threshold = THUMBS_UP_RISE_THRESHOLD, windowMs = 800, graceMs = 250 } = {}) {
    this.threshold = threshold;
    this.windowMs = windowMs;
    this.graceMs = graceMs;
    this.reset();
  }
  reset() {
    this.samples = []; // [t, smoothedWristY]
    this.fired = false;
    this.ema = null;
    this.lastSeen = -Infinity;
  }
  /** @returns {boolean} true on the frame the rise is detected */
  update(landmarks, label, t = performance.now()) {
    if (!valid(landmarks)) {
      if (t - this.lastSeen > this.graceMs) this.reset();
      return false;
    }
    if (label !== "thumbs_up") {
      if (t - this.lastSeen > this.graceMs) this.reset();
      return false;
    }
    this.lastSeen = t;

    // Light smoothing to ignore landmark jitter
    const raw = landmarks[WRIST].y;
    this.ema = this.ema == null ? raw : this.ema + 0.5 * (raw - this.ema);
    const y = this.ema;

    this.samples.push([t, y]);
    while (this.samples.length && t - this.samples[0][0] > this.windowMs) {
      this.samples.shift();
    }
    if (this.fired) return false;

    // y grows downward, so a rise is (lowest y in window - current y) > 0
    let maxY = -Infinity;
    for (const s of this.samples) if (s[1] > maxY) maxY = s[1];
    if (maxY - y >= this.threshold) {
      this.fired = true;
      return true;
    }
    return false;
  }
}

// ---------- Convenience wrapper ----------
/** Wires classifier + hysteresis + stabilizer + rise detector together. */
export class GestureTracker {
  constructor({ stabilizer, rise } = {}) {
    this.stabilizer = new GestureStabilizer(stabilizer);
    this.rise = new ThumbsUpRiseDetector(rise);
  }
  reset() {
    this.stabilizer.reset();
    this.rise.reset();
  }
  update(landmarks, aspect = 1, t = performance.now()) {
    const { label, confidence } = classifyWithConfidence(
      landmarks, aspect, this.stabilizer.stable
    );
    const stable = this.stabilizer.update(label);
    const thumbsUpRise = this.rise.update(landmarks, stable, t);
    return { raw: label, stable, confidence, thumbsUpRise };
  }
}