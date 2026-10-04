// src/audio/soundManager.js
// Synthesized game sounds (Web Audio API). No audio files needed.
//   playCorrect() -> bright rising arpeggio (success)
//   playWrong()   -> low double "buzz" (fail)
//   playClick()   -> soft short tick (buttons)

let ctx = null;
let master = null;
let muted = false;

/** Call once on the first user interaction (click / keypress / Start button). */
export function initAudio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();

    // Master chain: gain -> gentle compressor -> speakers (prevents harsh clipping)
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.8;
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp);
    comp.connect(ctx.destination);
  }
  if (ctx.state === "suspended") ctx.resume();
}

export function setMuted(value) {
  muted = !!value;
  if (master) master.gain.value = muted ? 0 : 0.8;
}

export function isMuted() {
  return muted;
}

export function toggleMute() {
  setMuted(!muted);
  return muted;
}

export const getMuted = isMuted;

let lastSoundTime = 0;
export const SOUND_COOLDOWN_MS = 600;

/**
 * One enveloped tone. Quick attack + exponential fade-out = no clicks/pops.
 */
function tone({ freq, endFreq, type = "sine", start = 0, dur = 0.2, vol = 0.3, filterHz }) {
  if (!ctx || muted) return;
  const t0 = ctx.currentTime + start;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, t0 + dur);

  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  let node = osc;
  if (filterHz) {
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = filterHz;
    osc.connect(lp);
    node = lp;
  }
  node.connect(gain);
  gain.connect(master);

  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

let lastClickTime = 0;

/** SUCCESS: C5 -> E5 -> G5 -> C6, bright and happy (~0.5 s) */
export function playCorrect() {
  if (muted) return;
  const nowMs = performance.now();
  if (nowMs - lastSoundTime < SOUND_COOLDOWN_MS) return;
  lastSoundTime = nowMs;

  initAudio();
  if (!ctx) return;

  const trigger = () => {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => {
      const last = i === notes.length - 1;
      const start = i * 0.07;
      const dur = last ? 0.32 : 0.14;
      tone({ freq: f, type: "sine", start, dur, vol: 0.28 });          // clean body
      tone({ freq: f * 2, type: "triangle", start, dur, vol: 0.08 });   // sparkle on top
    });
  };

  if (ctx.state === "suspended") {
    ctx.resume().then(trigger).catch(() => {});
  } else {
    trigger();
  }
}

/** FAIL: two short low buzzes, each sliding down (~0.45 s) */
export function playWrong() {
  if (muted) return;
  const nowMs = performance.now();
  if (nowMs - lastSoundTime < SOUND_COOLDOWN_MS) return;
  lastSoundTime = nowMs;

  initAudio();
  if (!ctx) return;

  const trigger = () => {
    [0, 0.2].forEach((start) => {
      tone({ freq: 220, endFreq: 120, type: "sawtooth", start, dur: 0.16, vol: 0.22, filterHz: 900 });
      tone({ freq: 207, endFreq: 110, type: "square", start, dur: 0.16, vol: 0.10, filterHz: 700 });
    });
  };

  if (ctx.state === "suspended") {
    ctx.resume().then(trigger).catch(() => {});
  } else {
    trigger();
  }
}

/** BUTTON CLICK: tiny soft tick (~60 ms), guaranteed on first click */
export function playClick() {
  initAudio();
  if (!ctx || muted) return;

  const now = performance.now();
  if (now - lastClickTime < 60) return; // avoid duplicate triggers
  lastClickTime = now;

  const trigger = () => {
    tone({ freq: 1400, endFreq: 900, type: "triangle", dur: 0.06, vol: 0.16 });
  };

  if (ctx.state === "suspended") {
    ctx.resume().then(trigger).catch(() => {});
  } else {
    trigger();
  }
}

/**
 * Plays playClick() for EVERY button on the page (including ones added later).
 * Call once at startup. Also unlocks audio on the first press.
 */
export function enableClickSounds() {
  document.addEventListener(
    "pointerdown",
    (e) => {
      initAudio();
      if (e.target.closest("button, [role='button'], a, .btn, input[type='button'], input[type='submit']")) {
        playClick();
      }
    },
    true
  );
}