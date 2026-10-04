// src/ui/gameUI.js
// Injects and manages all in-game UI elements:
//   • Game bar  – round counter, score, streak, mute toggle, exit button (above stage)
//   • Cue panel – colour block or state message (above stage)
//   • Feedback  – absolute overlay on stage (correct / wrong / timeout)
//   • Results   – full-page overlay at the end (with Play Again and Exit to Home)

import { initAudio, toggleMute, getMuted } from '../audio/soundManager.js';

// ── Constants (mirrors config/gestures.json colorMap) ────────────────────────
const COLOR_META = {
  RED:    { bg: '#dc2626', fg: '#fff',  name: 'RED'    },
  BLUE:   { bg: '#1d4ed8', fg: '#fff',  name: 'BLUE'   },
  YELLOW: { bg: '#d97706', fg: '#111',  name: 'YELLOW' },
  GREEN:  { bg: '#15803d', fg: '#fff',  name: 'GREEN'  },
};

const GESTURE_EMOJI = {
  two_fingers: '✌️', fist: '✊', thumbs_up: '👍', point: '☝️',
  open: '✋', none: '–',
};

// ── Style injection ───────────────────────────────────────────────────────────
function injectGameStyles() {
  if (document.getElementById('gu-styles')) return;
  const s = document.createElement('style');
  s.id = 'gu-styles';
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap');

    body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }

    /* ── Wrapper ── */
    #gu-wrap {
      display: flex; flex-direction: column; align-items: center;
      gap: 0;
    }

    /* ── Game bar ── */
    #gu-bar {
      width: 640px;
      display: flex; align-items: center; justify-content: space-between;
      background: rgba(15,15,30,0.95);
      border: 1px solid rgba(255,255,255,0.08);
      border-bottom: none;
      border-radius: 14px 14px 0 0;
      padding: 10px 20px;
      color: #f1f5f9;
      box-sizing: border-box;
    }
    .gu-bar-item { display: flex; flex-direction: column; align-items: center; gap: 2px; }
    .gu-bar-label { font-size: 10px; font-weight: 700; letter-spacing: .1em;
                    text-transform: uppercase; color: #475569; }
    .gu-bar-val   { font-size: 18px; font-weight: 900; color: #f1f5f9; }
    #gu-streak-val { color: #f97316; }

    .gu-bar-exit {
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #fca5a5;
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 800;
      cursor: pointer;
      transition: all 0.2s;
      font-family: inherit;
    }
    .gu-bar-exit:hover {
      background: rgba(239, 68, 68, 0.25);
      color: #fff;
      border-color: #ef4444;
      transform: translateY(-1px);
    }

    .gu-bar-mute {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #cbd5e1;
      padding: 6px 10px;
      border-radius: 8px;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.2s;
      font-family: inherit;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .gu-bar-mute:hover {
      background: rgba(255, 255, 255, 0.18);
      color: #fff;
      transform: translateY(-1px);
    }

    /* ── Cue panel ── */
    #gu-cue {
      width: 640px; height: 120px;
      display: flex; align-items: center; justify-content: center;
      background: rgba(10,10,22,0.97);
      border: 1px solid rgba(255,255,255,0.08);
      border-bottom: none;
      transition: background 0.12s ease;
      box-sizing: border-box;
      position: relative; overflow: hidden;
    }
    #gu-cue-text {
      font-size: 22px; font-weight: 700; color: rgba(255,255,255,0.3);
      letter-spacing: .04em; text-align: center; user-select: none;
      transition: color .2s;
    }
    #gu-cue.gu-cue-active #gu-cue-text { color: #fff; font-size: 28px; font-weight: 900; }
    #gu-cue.gu-false-start { animation: gu-blink-yellow 0.4s ease 3; }
    @keyframes gu-blink-yellow {
      0%,100% { border-color: rgba(255,255,255,0.08); }
      50%      { border-color: #f59e0b; box-shadow: 0 0 24px #f59e0b66; }
    }
    .gu-dots { display: flex; gap: 10px; }
    .gu-dot  {
      width: 10px; height: 10px; border-radius: 50%;
      background: rgba(255,255,255,0.2);
      animation: gu-pulse-dot 1.2s ease-in-out infinite;
    }
    .gu-dot:nth-child(2) { animation-delay: .2s; }
    .gu-dot:nth-child(3) { animation-delay: .4s; }
    @keyframes gu-pulse-dot {
      0%,80%,100% { transform: scale(1); opacity: .3; }
      40%         { transform: scale(1.6); opacity: 1; }
    }
    #gu-timeout-bar {
      position: absolute; bottom: 0; left: 0; height: 4px;
      background: linear-gradient(90deg,#818cf8,#38bdf8);
      width: 100%;
      transition: width linear;
    }

    /* ── Feedback overlay ── */
    #gu-feedback {
      position: absolute; inset: 0; z-index: 10;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      pointer-events: none; opacity: 0;
      transition: opacity 0.15s ease;
    }
    #gu-feedback.gu-show { opacity: 1; }
    #gu-feedback-bg {
      position: absolute; inset: 0; opacity: 0.88;
      backdrop-filter: blur(2px);
    }
    #gu-feedback-content {
      position: relative; z-index: 1;
      display: flex; flex-direction: column; align-items: center; gap: 8px;
    }
    #gu-feedback-icon   { font-size: 64px; }
    #gu-feedback-result { font-size: 32px; font-weight: 900; letter-spacing: -0.5px; color: #fff; }
    #gu-feedback-rt     { font-size: 20px; font-weight: 700; color: rgba(255,255,255,0.85); font-family: 'JetBrains Mono', monospace; }

    /* ── Results overlay ── */
    #gu-results {
      position: fixed; inset: 0; z-index: 300;
      background: rgba(4,5,15,0.95);
      backdrop-filter: blur(8px);
      display: flex; align-items: center; justify-content: center;
      padding: 20px; box-sizing: border-box;
    }
    #gu-results.gu-hidden { display: none; }
    .gu-res-card {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 20px; padding: 32px 36px;
      width: min(560px, 94vw); color: #f1f5f9;
      box-shadow: 0 28px 72px rgba(0,0,0,.65);
      display: flex; flex-direction: column; gap: 20px;
    }
    .gu-res-title {
      font-size: 28px; font-weight: 900; letter-spacing: -0.5px;
      background: linear-gradient(90deg,#818cf8,#38bdf8);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .gu-res-player {
      display: inline-flex; align-items: center; gap: 10px;
      margin-top: 6px;
    }
    .gu-res-pname {
      font-size: 24px; font-weight: 800; color: #38bdf8;
      letter-spacing: -0.01em;
    }
    .gu-res-phand {
      font-size: 13px; font-weight: 700; color: #cbd5e1;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.18);
      padding: 4px 14px; border-radius: 99px;
      text-transform: capitalize;
    }
    .gu-res-stats  { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .gu-stat {
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 12px; padding: 12px 16px;
    }
    .gu-stat-label { font-size: 10px; font-weight: 700; letter-spacing: .1em;
                     text-transform: uppercase; color: #64748b; }
    .gu-stat-val   { font-size: 24px; font-weight: 900; color: #f1f5f9; margin-top: 2px; }
    .gu-stat.gu-highlight { border-color: #818cf8; background: rgba(129,140,248,.1); }
    .gu-stat.gu-highlight .gu-stat-val { color: #a5b4fc; }
    .gu-res-history { display: flex; flex-direction: column; gap: 6px; max-height: 160px; overflow-y: auto; }
    .gu-res-row {
      display: flex; align-items: center; gap: 10px;
      padding: 6px 10px; border-radius: 8px; font-size: 13px;
      background: rgba(255,255,255,0.04);
    }
    .gu-res-row.gu-correct { color: #4ade80; }
    .gu-res-row.gu-wrong   { color: #f87171; }
    .gu-res-row.gu-timeout { color: #94a3b8; }
    .gu-res-row .gu-rn { font-weight: 700; width: 24px; flex-shrink: 0; }
    .gu-res-row .gu-rt { margin-left: auto; font-weight: 600; font-variant-numeric: tabular-nums; }

    .gu-res-actions { display: flex; gap: 12px; width: 100%; margin-top: 6px; }
    .gu-res-btn {
      flex: 1; padding: 14px 0; border-radius: 12px; border: none; cursor: pointer;
      font-size: 15px; font-weight: 700; font-family: inherit;
      transition: all .2s;
    }
    .gu-res-btn.gu-res-primary {
      background: linear-gradient(135deg,#818cf8,#38bdf8); color: #fff;
      box-shadow: 0 4px 20px rgba(129,140,248,.35);
    }
    .gu-res-btn.gu-res-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(129,140,248,.5); }
    .gu-res-btn.gu-res-secondary {
      background: rgba(255,255,255,0.06); color: #cbd5e1;
      border: 1px solid rgba(255,255,255,0.12);
    }
    .gu-res-btn.gu-res-secondary:hover {
      background: rgba(239,68,68,0.2); color: #fff; border-color: rgba(239,68,68,0.4);
      transform: translateY(-2px);
    }
  `;
  document.head.appendChild(s);
}

// ── createGameUI ──────────────────────────────────────────────────────────────

/**
 * Creates and inserts game UI elements into the DOM around the stage element.
 *
 * @param {HTMLElement} stageEl  – existing #stage element
 * @param {HTMLElement} hudEl    – existing #hud element (hidden during game)
 * @param {Function}    onExit   – callback when Exit button is clicked
 * @returns {GameUI}
 */
export function createGameUI(stageEl, hudEl, onExit) {
  injectGameStyles();
  hudEl.style.display = 'none';

  // Cleanup any old leftovers if they exist
  const existingWrap = document.getElementById('gu-wrap');
  if (existingWrap) {
    if (stageEl.parentNode === existingWrap && existingWrap.parentNode) {
      existingWrap.parentNode.insertBefore(stageEl, existingWrap);
    }
    existingWrap.remove();
  }
  const existingResults = document.getElementById('gu-results');
  if (existingResults) existingResults.remove();
  const existingFb = document.getElementById('gu-feedback');
  if (existingFb) existingFb.remove();

  // ── Inject wrapper + game bar + cue panel above stage ────────────────────
  const wrap = document.createElement('div');
  wrap.id = 'gu-wrap';
  stageEl.parentNode.insertBefore(wrap, stageEl);
  wrap.appendChild(stageEl);

  // Game bar
  const bar = document.createElement('div');
  bar.id = 'gu-bar';
  bar.innerHTML = `
    <div class="gu-bar-item">
      <span class="gu-bar-label">Player</span>
      <span class="gu-bar-val" id="gu-player-val" style="font-size:15px;color:#38bdf8;font-weight:800;">–</span>
    </div>
    <div class="gu-bar-item">
      <span class="gu-bar-label">Round</span>
      <span class="gu-bar-val" id="gu-round-val">– / –</span>
    </div>
    <div class="gu-bar-item">
      <span class="gu-bar-label">Score</span>
      <span class="gu-bar-val" id="gu-score-val">0</span>
    </div>
    <div class="gu-bar-item">
      <span class="gu-bar-label">Streak</span>
      <span class="gu-bar-val" id="gu-streak-val">🔥 0</span>
    </div>
    <div style="display: flex; gap: 8px; align-items: center;">
      <button class="gu-bar-mute" id="gu-btn-mute" title="Toggle Sound">🔊</button>
      <button class="gu-bar-exit" id="gu-btn-exit" title="Exit to Home Screen">✕ Exit</button>
    </div>
  `;
  wrap.insertBefore(bar, stageEl);

  // Cue panel
  const cue = document.createElement('div');
  cue.id = 'gu-cue';
  cue.innerHTML = `
    <div id="gu-cue-text">⏳ Get Ready…</div>
    <div id="gu-timeout-bar" style="width:0%"></div>
  `;
  wrap.insertBefore(cue, stageEl);

  // Feedback overlay (inside stage, absolute)
  stageEl.style.position = 'relative';
  const fb = document.createElement('div');
  fb.id = 'gu-feedback';
  fb.innerHTML = `
    <div id="gu-feedback-bg"></div>
    <div id="gu-feedback-content">
      <div id="gu-feedback-icon"></div>
      <div id="gu-feedback-result"></div>
      <div id="gu-feedback-rt"></div>
    </div>
  `;
  stageEl.appendChild(fb);

  // Results overlay (full page, hidden initially)
  const results = document.createElement('div');
  results.id = 'gu-results';
  results.classList.add('gu-hidden');
  results.innerHTML = `
    <div class="gu-res-card">
      <div>
        <div class="gu-res-title">Game Over!</div>
        <div class="gu-res-player" id="gu-res-player"></div>
      </div>
      <div class="gu-res-stats" id="gu-res-stats"></div>
      <div>
        <div class="gu-bar-label" style="margin-bottom:8px">Round History</div>
        <div class="gu-res-history" id="gu-res-history"></div>
      </div>
      <div class="gu-res-actions">
        <button class="gu-res-btn gu-res-primary" id="gu-res-play-again">Play Again 🎮</button>
        <button class="gu-res-btn gu-res-secondary" id="gu-res-exit">Exit to Home 🏠</button>
      </div>
    </div>
  `;
  document.body.appendChild(results);

  // ── Convenience refs ─────────────────────────────────────────────────────
  const roundVal   = document.getElementById('gu-round-val');
  const scoreVal   = document.getElementById('gu-score-val');
  const streakVal  = document.getElementById('gu-streak-val');
  const cueText    = document.getElementById('gu-cue-text');
  const timeoutBar = document.getElementById('gu-timeout-bar');
  const fbEl       = document.getElementById('gu-feedback');
  const fbBg       = document.getElementById('gu-feedback-bg');
  const fbIcon     = document.getElementById('gu-feedback-icon');
  const fbResult   = document.getElementById('gu-feedback-result');
  const fbRt       = document.getElementById('gu-feedback-rt');
  const btnExit    = document.getElementById('gu-btn-exit');
  const btnMute    = document.getElementById('gu-btn-mute');

  let currentExitHandler = onExit;
  btnExit.onclick = () => { currentExitHandler?.(); };

  if (btnMute) {
    btnMute.textContent = getMuted() ? '🔇' : '🔊';
    btnMute.setAttribute('title', getMuted() ? 'Unmute Sound' : 'Mute Sound');
    btnMute.onclick = () => {
      initAudio();
      const muted = toggleMute();
      btnMute.textContent = muted ? '🔇' : '🔊';
      btnMute.setAttribute('title', muted ? 'Unmute Sound' : 'Mute Sound');
    };
  }

  let fbTimer = null;

  // ── Public interface ──────────────────────────────────────────────────────
  return {
    setExitHandler(fn) {
      currentExitHandler = fn;
    },

    setPlayerName(name) {
      const el = document.getElementById('gu-player-val');
      if (el) el.textContent = name || '–';
    },

    setRound(n, total) { roundVal.textContent = `${n} / ${total}`; },
    setScore(score)    { scoreVal.textContent = score; },
    setStreak(s)       { streakVal.textContent = `🔥 ${s}`; },

    showArm() {
      cue.style.background = 'rgba(10,10,22,0.97)';
      cue.className = '';
      cueText.textContent = '✋  Lower your hand to arm…';
      timeoutBar.style.width = '0%';
      timeoutBar.style.transition = 'none';
    },

    showDelay() {
      cue.style.background = 'rgba(10,10,22,0.97)';
      cue.className = '';
      cueText.innerHTML = '<div class="gu-dots"><div class="gu-dot"></div><div class="gu-dot"></div><div class="gu-dot"></div></div>';
      timeoutBar.style.width = '0%';
    },

    showCue(colorName, timeoutMs) {
      const meta = COLOR_META[colorName] ?? { bg: '#334155', fg: '#fff', name: colorName };
      cue.style.background = meta.bg;
      cue.classList.add('gu-cue-active');
      cueText.style.color = meta.fg;
      cueText.textContent = meta.name;
      timeoutBar.style.transition = 'none';
      timeoutBar.style.width = '100%';
      requestAnimationFrame(() => {
        timeoutBar.style.transition = `width ${timeoutMs}ms linear`;
        timeoutBar.style.width = '0%';
      });
    },

    showFalseStart() {
      cue.classList.add('gu-false-start');
      cueText.textContent = '⚠️  FALSE START';
      cueText.style.color = '#f59e0b';
      setTimeout(() => cue.classList.remove('gu-false-start'), 1200);
    },

    showFeedback(type, rt, targetGesture, detectedGesture) {
      clearTimeout(fbTimer);
      const configs = {
        correct: { bg: '#16a34a', icon: '✅', label: 'CORRECT!',   rtText: rt != null ? `${Math.round(rt)} ms` : '' },
        wrong:   { bg: '#dc2626', icon: '❌', label: 'WRONG',      rtText: targetGesture ? `Expected: ${GESTURE_EMOJI[targetGesture] ?? ''} ${targetGesture}` : '' },
        timeout: { bg: '#7c3aed', icon: '⏱️', label: 'TOO SLOW',   rtText: 'Timeout' },
      };
      const cfg = configs[type] ?? configs.timeout;
      fbBg.style.background = cfg.bg;
      fbIcon.textContent   = cfg.icon;
      fbResult.textContent = cfg.label;
      fbRt.textContent     = cfg.rtText;
      fbEl.classList.add('gu-show');
    },

    hideFeedback() {
      fbEl.classList.remove('gu-show');
    },

    showResults(stats, playerInfo, rounds, onPlayAgain, onExitCallback) {
      const accuracy = stats.total > 0 ? Math.round(stats.correct / stats.total * 100) : 0;
      const avgRt = stats.reactionTimes.length
        ? Math.round(stats.reactionTimes.reduce((a, b) => a + b, 0) / stats.reactionTimes.length)
        : '–';
      const bestRt = stats.reactionTimes.length
        ? Math.round(Math.min(...stats.reactionTimes))
        : '–';

      document.getElementById('gu-res-player').innerHTML =
        `<span class="gu-res-pname">👤 ${playerInfo.name}</span>` +
        `<span class="gu-res-phand">${playerInfo.hand} Hand</span>`;

      document.getElementById('gu-res-stats').innerHTML = `
        <div class="gu-stat gu-highlight">
          <div class="gu-stat-label">Score</div>
          <div class="gu-stat-val">${stats.score}</div>
        </div>
        <div class="gu-stat">
          <div class="gu-stat-label">Accuracy</div>
          <div class="gu-stat-val">${accuracy}%</div>
        </div>
        <div class="gu-stat">
          <div class="gu-stat-label">Avg Reaction</div>
          <div class="gu-stat-val">${avgRt}<small style="font-size:14px;font-weight:600;color:#64748b"> ms</small></div>
        </div>
        <div class="gu-stat">
          <div class="gu-stat-label">Best Reaction</div>
          <div class="gu-stat-val">${bestRt}<small style="font-size:14px;font-weight:600;color:#64748b"> ms</small></div>
        </div>
        <div class="gu-stat">
          <div class="gu-stat-label">Longest Streak</div>
          <div class="gu-stat-val">🔥 ${stats.longestStreak}</div>
        </div>
        <div class="gu-stat">
          <div class="gu-stat-label">Correct / Total</div>
          <div class="gu-stat-val">${stats.correct} / ${stats.total}</div>
        </div>
      `;

      const hist = document.getElementById('gu-res-history');
      hist.innerHTML = rounds.map((r, i) => {
        const cls = r.outcome;
        const rtStr = r.rt != null ? `${Math.round(r.rt)} ms` : (r.outcome === 'timeout' ? 'timeout' : '–');
        const correctGesture = r.target ? (GESTURE_EMOJI[r.target] ?? '') : '';
        return `<div class="gu-res-row gu-${cls}">
          <span class="gu-rn">${i + 1}</span>
          <span>${r.color ?? ''}</span>
          <span>${correctGesture}</span>
          <span class="gu-rt">${rtStr}</span>
        </div>`;
      }).join('');

      results.classList.remove('gu-hidden');

      document.getElementById('gu-res-play-again').onclick = () => {
        results.classList.add('gu-hidden');
        onPlayAgain?.();
      };

      document.getElementById('gu-res-exit').onclick = () => {
        results.classList.add('gu-hidden');
        (onExitCallback ?? currentExitHandler)?.();
      };
    },

    destroy() {
      clearTimeout(fbTimer);
      if (wrap.parentNode) {
        wrap.parentNode.insertBefore(stageEl, wrap);
        wrap.remove();
      }
      fb.remove();
      results.remove();
      hudEl.style.display = 'block';
    }
  };
}
