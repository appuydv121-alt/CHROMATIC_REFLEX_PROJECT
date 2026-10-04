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

let lastCompletionTime = 0;

/** GAME COMPLETION: triumphant, celebratory victory fanfare (~1.6 s) */
export function playCompletion() {
  if (muted) return;
  const nowMs = performance.now();
  if (nowMs - lastCompletionTime < 2500) return; // prevent duplicate trigger
  lastCompletionTime = nowMs;
  lastSoundTime = nowMs;

  initAudio();
  if (!ctx) return;

  const trigger = () => {
    // 1. Flourish fanfare roll (brass/bright lead)
    const fanfareNotes = [
      { f: 523.25, start: 0.00, dur: 0.12, vol: 0.26 }, // C5
      { f: 659.25, start: 0.11, dur: 0.12, vol: 0.26 }, // E5
      { f: 783.99, start: 0.22, dur: 0.12, vol: 0.28 }, // G5
      { f: 1046.50, start: 0.33, dur: 0.18, vol: 0.32 }, // C6
      { f: 783.99, start: 0.48, dur: 0.12, vol: 0.24 }, // G5
      { f: 1046.50, start: 0.58, dur: 0.22, vol: 0.34 }, // C6
    ];

    fanfareNotes.forEach(({ f, start, dur, vol }) => {
      tone({ freq: f, type: "sine", start, dur, vol });
      tone({ freq: f * 1.5, type: "triangle", start, dur: dur * 0.8, vol: vol * 0.20 });
    });

    // 2. Grand celebratory chord (held major chord with rich foundation)
    const chordStart = 0.76;
    const chordDur   = 0.85;
    const chord = [
      { f: 261.63, vol: 0.24 }, // C4 warm bass
      { f: 392.00, vol: 0.20 }, // G4
      { f: 523.25, vol: 0.26 }, // C5
      { f: 659.25, vol: 0.24 }, // E5
      { f: 783.99, vol: 0.26 }, // G5
      { f: 1046.50, vol: 0.28 }, // C6
    ];

    chord.forEach(({ f, vol }) => {
      tone({ freq: f, type: "sine", start: chordStart, dur: chordDur, vol });
      tone({ freq: f * 2, type: "triangle", start: chordStart, dur: chordDur * 0.7, vol: vol * 0.15 });
    });

    // 3. Shimmering high victory sparkle chimes
    const sparkles = [
      { f: 1318.51, start: 0.88, dur: 0.25, vol: 0.18 }, // E6
      { f: 1567.98, start: 1.02, dur: 0.28, vol: 0.18 }, // G6
      { f: 2093.00, start: 1.16, dur: 0.45, vol: 0.22 }, // C7 sparkling finale
    ];

    sparkles.forEach(({ f, start, dur, vol }) => {
      tone({ freq: f, type: "triangle", start, dur, vol });
    });
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