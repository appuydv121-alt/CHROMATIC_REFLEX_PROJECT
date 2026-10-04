import { initAudio, toggleMute, getMuted, playCompletion } from '../audio/soundManager.js';

const TARGET_COLORS = {
  RED:    { bg: '#ef4444', fg: '#ffffff', glow: 'rgba(239, 68, 68, 0.65)' },
  BLUE:   { bg: '#3b82f6', fg: '#ffffff', glow: 'rgba(59, 130, 246, 0.65)' },
  YELLOW: { bg: '#f59e0b', fg: '#451a03', glow: 'rgba(245, 158, 11, 0.65)' }, 
  GREEN:  { bg: '#22c55e', fg: '#052e16', glow: 'rgba(34, 197, 94, 0.65)' }, 
};

const GESTURE_DISPLAY_NAMES = {
  two_fingers: 'Two Fingers',
  fist:        'Fist',
  thumbs_up:   'Thumbs Up',
  point:       'Pointing',
  open:        'Open Hand',
  none:        'None',
};

function injectGameStyles() {
  if (document.getElementById('gu-styles')) return;
  const s = document.createElement('style');
  s.id = 'gu-styles';
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800;900&family=JetBrains+Mono:wght@500;700;800&display=swap');

    body {
      font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
      margin: 0;
      background: #060913;
      color: #f1f5f9;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    #gu-wrap {
      width: 100%;
      max-width: 960px;
      margin: 14px auto;
      padding: 16px 20px 20px;
      background: rgba(10, 15, 30, 0.90);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 24px;
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.7);
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: 14px;
      position: relative;
    }

    #gu-bar {
      width: 100%;
      max-width: 920px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(17, 24, 39, 0.78);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 999px;
      padding: 9px 24px;
      color: #f1f5f9;
      box-sizing: border-box;
      box-shadow: 0 6px 24px rgba(0, 0, 0, 0.45);
      gap: 16px;
    }

    .gu-bar-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      position: relative;
    }

    .gu-bar-label {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: .12em;
      text-transform: uppercase;
      color: #64748b;
    }

    .gu-bar-val {
      font-size: 18px;
      font-weight: 900;
      color: #f1f5f9;
      font-variant-numeric: tabular-nums;
    }

    #gu-player-val {
      color: #38bdf8;
      font-size: 16px;
      font-weight: 800;
      max-width: 140px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .gu-round-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
      min-width: 82px;
    }
    .gu-round-track {
      width: 100%;
      height: 4px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 99px;
      overflow: hidden;
      margin-top: 1px;
    }
    #gu-round-progress-bar {
      height: 100%;
      width: 5%;
      background: linear-gradient(90deg, #38bdf8, #818cf8);
      border-radius: 99px;
      transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .gu-score-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
    }
    #gu-score-val {
      color: #f8fafc;
      transition: transform 0.15s ease;
      display: inline-block;
    }
    #gu-score-val.gu-score-pop {
      animation: gu-score-scale 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28);
    }
    @keyframes gu-score-scale {
      0% { transform: scale(1); }
      50% { transform: scale(1.35); color: #4ade80; }
      100% { transform: scale(1); }
    }
    .gu-score-float {
      position: absolute;
      top: -12px;
      right: -24px;
      font-size: 13px;
      font-weight: 900;
      color: #22c55e;
      pointer-events: none;
      opacity: 0;
      font-family: 'JetBrains Mono', monospace;
    }
    .gu-score-float.gu-float-anim {
      animation: gu-float-fade 0.75s ease-out forwards;
    }
    @keyframes gu-float-fade {
      0% { transform: translateY(0); opacity: 1; }
      100% { transform: translateY(-24px); opacity: 0; }
    }

    .gu-streak-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
    }
    .gu-streak-row {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    #gu-streak-flame {
      font-size: 18px;
      transition: transform 0.25s ease, filter 0.25s ease;
      display: inline-block;
    }
    #gu-streak-val {
      color: #f97316;
    }
    #gu-streak-toast {
      position: absolute;
      bottom: -28px;
      left: 50%;
      transform: translateX(-50%) scale(0.8);
      background: linear-gradient(135deg, #f97316, #ef4444);
      color: #fff;
      font-size: 11px;
      font-weight: 800;
      padding: 3px 9px;
      border-radius: 99px;
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      box-shadow: 0 4px 14px rgba(249, 115, 22, 0.5);
      z-index: 50;
    }
    #gu-streak-toast.gu-toast-show {
      animation: gu-toast-pop 1.5s cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards;
    }
    @keyframes gu-toast-pop {
      0% { opacity: 0; transform: translateX(-50%) scale(0.7) translateY(4px); }
      15% { opacity: 1; transform: translateX(-50%) scale(1.05) translateY(0); }
      25% { transform: translateX(-50%) scale(1); }
      80% { opacity: 1; transform: translateX(-50%) translateY(0); }
      100% { opacity: 0; transform: translateX(-50%) translateY(-6px); }
    }

    .gu-btn, .gu-bar-exit, .gu-bar-mute {
      transition: transform 0.15s ease, background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
      font-family: inherit;
      cursor: pointer;
    }
    .gu-btn:hover, .gu-bar-exit:hover, .gu-bar-mute:hover {
      transform: scale(1.05);
    }
    .gu-btn:active, .gu-bar-exit:active, .gu-bar-mute:active {
      transform: scale(0.95);
    }

    .gu-bar-exit {
      background: rgba(239, 68, 68, 0.12);
      border: 1.5px solid rgba(239, 68, 68, 0.45);
      color: #fca5a5;
      padding: 6px 14px;
      border-radius: 99px;
      font-size: 12px;
      font-weight: 800;
    }
    .gu-bar-exit:hover {
      background: rgba(239, 68, 68, 0.25);
      border-color: #ef4444;
      color: #fff;
      box-shadow: 0 0 12px rgba(239, 68, 68, 0.4);
    }

    .gu-bar-mute {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.18);
      color: #cbd5e1;
      padding: 6px 10px;
      border-radius: 99px;
      font-size: 13px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .gu-bar-mute:hover {
      background: rgba(255, 255, 255, 0.18);
      color: #fff;
    }

    .gu-game-stack {
      width: 100%;
      max-width: 920px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
      align-items: center;
      box-sizing: border-box;
    }

    #gu-cue {
      width: 100%;
      height: 74px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(10, 14, 26, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      box-sizing: border-box;
      position: relative;
      overflow: hidden;
      transition: background 0.15s ease, box-shadow 0.25s ease;
    }
    #gu-cue-text {
      font-size: 32px;
      font-weight: 900;
      letter-spacing: 0.06em;
      text-align: center;
      user-select: none;
      transition: color 0.15s ease, transform 0.2s ease;
    }

    #gu-cue.gu-cue-active {
      animation: gu-banner-pop 0.25s cubic-bezier(0.16, 1, 0.3, 1), gu-banner-glow 2s ease-in-out infinite;
    }
    @keyframes gu-banner-pop {
      0% { transform: translateY(-4px) scale(0.97); opacity: 0.8; }
      100% { transform: translateY(0) scale(1); opacity: 1; }
    }
    @keyframes gu-banner-glow {
      0%, 100% {
        box-shadow: 0 0 16px var(--banner-glow, rgba(56, 189, 248, 0.4));
      }
      50% {
        box-shadow: 0 0 32px var(--banner-glow, rgba(56, 189, 248, 0.8)), 0 0 48px var(--banner-glow, rgba(56, 189, 248, 0.4));
      }
    }

    #gu-cue.gu-false-start {
      animation: gu-blink-yellow 0.4s ease 3;
    }
    @keyframes gu-blink-yellow {
      0%, 100% { border-color: rgba(255, 255, 255, 0.08); }
      50%      { border-color: #f59e0b; box-shadow: 0 0 24px #f59e0b66; }
    }

    .gu-dots { display: flex; gap: 8px; }
    .gu-dot  {
      width: 10px; height: 10px; border-radius: 50%;
      background: rgba(255,255,255,0.35);
      animation: gu-pulse-dot 1.2s ease-in-out infinite;
    }
    .gu-dot:nth-child(2) { animation-delay: .2s; }
    .gu-dot:nth-child(3) { animation-delay: .4s; }
    @keyframes gu-pulse-dot {
      0%,80%,100% { transform: scale(1); opacity: .3; }
      40%         { transform: scale(1.6); opacity: 1; }
    }

    #gu-timeout-bar {
      position: absolute;
      bottom: 0;
      left: 0;
      height: 5px;
      background: rgba(255, 255, 255, 0.85);
      box-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
      width: 0%;
      transition: width linear, background-color 0.2s, box-shadow 0.2s;
    }
    #gu-timeout-bar.gu-timeout-red {
      background: #ef4444 !important;
      box-shadow: 0 0 16px #ef4444 !important;
      animation: gu-pulse-bar-red 0.3s ease-in-out infinite alternate;
    }
    @keyframes gu-pulse-bar-red {
      0% { opacity: 0.8; }
      100% { opacity: 1; filter: brightness(1.25); }
    }

    .gu-stage-frame {
      margin: 0 auto !important;
      width: 100% !important;
      max-width: 920px !important;
      aspect-ratio: 4 / 3 !important;
      max-height: 72vh !important;
      height: auto !important;
      border-radius: 18px !important;
      overflow: hidden !important;
      border: 3px solid var(--stage-border, rgba(56, 189, 248, 0.4));
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.65), 0 0 24px var(--stage-glow, transparent);
      transition: border-color 0.25s ease, box-shadow 0.25s ease;
      position: relative !important;
      box-sizing: border-box !important;
      background: #000;
    }
    .gu-stage-frame video,
    .gu-stage-frame canvas {
      position: absolute !important;
      inset: 0 !important;
      width: 100% !important;
      height: 100% !important;
      object-fit: cover !important;
      transform: scaleX(-1) !important;
      border-radius: 15px !important;
    }

    .gu-corner {
      position: absolute;
      width: 22px;
      height: 22px;
      pointer-events: none;
      z-index: 10;
      border-color: var(--stage-border, #38bdf8);
      border-style: solid;
      transition: border-color 0.25s ease;
      transform: none !important; 
    }
    .gu-corner-tl { top: 10px; left: 10px; border-width: 3px 0 0 3px; border-top-left-radius: 8px; }
    .gu-corner-tr { top: 10px; right: 10px; border-width: 3px 3px 0 0; border-top-right-radius: 8px; }
    .gu-corner-bl { bottom: 10px; left: 10px; border-width: 0 0 3px 3px; border-bottom-left-radius: 8px; }
    .gu-corner-br { bottom: 10px; right: 10px; border-width: 0 3px 3px 0; border-bottom-right-radius: 8px; }

    .gu-detect-chip {
      position: absolute;
      bottom: 16px;
      left: 16px;
      z-index: 15;
      display: flex;
      align-items: center;
      gap: 10px;
      background: rgba(10, 15, 30, 0.85);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-radius: 999px;
      padding: 6px 16px 6px 10px;
      color: #f1f5f9;
      font-size: 13px;
      box-shadow: 0 4px 18px rgba(0, 0, 0, 0.5);
      pointer-events: none;
      user-select: none;
      transform: none !important; 
    }
    .gu-detect-ring {
      width: 22px;
      height: 22px;
      flex-shrink: 0;
    }
    .gu-ring-bg {
      stroke: rgba(255, 255, 255, 0.16);
    }
    .gu-ring-fg {
      stroke: #38bdf8;
      transition: stroke-dashoffset 0.08s linear, stroke 0.2s ease;
    }
    .gu-detect-label {
      font-weight: 600;
      letter-spacing: 0.01em;
    }
    .gu-detect-val {
      font-weight: 800;
      color: #38bdf8;
    }

    #gu-side-panel {
      display: none !important;
    }

    @media (max-width: 900px) {
      #gu-wrap {
        padding: 12px;
        margin: 6px auto;
      }
      #gu-bar {
        padding: 7px 14px;
        gap: 10px;
      }
      #gu-cue {
        height: 60px;
      }
      #gu-cue-text {
        font-size: 26px;
      }
    }

    #gu-feedback {
      position: absolute; inset: 0; z-index: 25;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      pointer-events: none; opacity: 0;
      transition: opacity 0.15s ease;
      transform: none !important; 
    }
    #gu-feedback.gu-show { opacity: 1; }
    #gu-feedback-bg {
      position: absolute; inset: 0; opacity: 0.90;
      backdrop-filter: blur(4px);
    }
    #gu-feedback-content {
      position: relative; z-index: 1;
      display: flex; flex-direction: column; align-items: center; gap: 8px;
    }
    #gu-feedback-icon   { font-size: 58px; }
    #gu-feedback-result { font-size: 32px; font-weight: 900; letter-spacing: -0.5px; color: #fff; }
    #gu-feedback-rt     {
      font-size: 18px; font-weight: 700; color: rgba(255,255,255,0.9);
      font-family: 'JetBrains Mono', monospace; text-align: center;
    }

    #gu-results {
      position: fixed; inset: 0; z-index: 300;
      background: rgba(4, 6, 16, 0.95);
      backdrop-filter: blur(10px);
      display: flex; align-items: center; justify-content: center;
      padding: 20px; box-sizing: border-box;
    }
    #gu-results.gu-hidden { display: none; }
    .gu-res-card {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 20px; padding: 28px 32px;
      width: min(560px, 94vw); color: #f1f5f9;
      box-shadow: 0 28px 72px rgba(0, 0, 0, 0.7);
      display: flex; flex-direction: column; gap: 16px;
    }
    .gu-res-title {
      font-size: 26px; font-weight: 900; letter-spacing: -0.5px;
      background: linear-gradient(90deg, #818cf8, #38bdf8);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .gu-res-player {
      display: inline-flex; align-items: center; gap: 10px;
      margin-top: 4px;
    }
    .gu-res-pname {
      font-size: 22px; font-weight: 800; color: #38bdf8;
    }
    .gu-res-phand {
      font-size: 13px; font-weight: 700; color: #cbd5e1;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.18);
      padding: 3px 12px; border-radius: 99px;
      text-transform: capitalize;
    }
    .gu-res-stats {
      display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
    }
    .gu-stat {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px; padding: 10px 14px;
    }
    .gu-stat-label {
      font-size: 10px; font-weight: 700; letter-spacing: .1em;
      text-transform: uppercase; color: #64748b;
    }
    .gu-stat-val {
      font-size: 22px; font-weight: 900; color: #f1f5f9; margin-top: 2px;
      font-family: 'JetBrains Mono', monospace;
    }
    .gu-stat.gu-highlight {
      border-color: #818cf8; background: rgba(129, 140, 248, 0.1);
    }
    .gu-stat.gu-highlight .gu-stat-val { color: #a5b4fc; }

    .gu-res-history {
      display: flex; flex-direction: column; gap: 5px;
      max-height: 140px; overflow-y: auto; padding-right: 4px;
    }
    .gu-res-row {
      display: flex; align-items: center; gap: 12px;
      padding: 6px 12px; border-radius: 8px; font-size: 13px;
      background: rgba(255, 255, 255, 0.04);
      font-family: 'JetBrains Mono', monospace;
    }
    .gu-res-row.gu-correct { color: #4ade80; border-left: 3px solid #22c55e; }
    .gu-res-row.gu-wrong   { color: #f87171; border-left: 3px solid #ef4444; }
    .gu-res-row.gu-timeout { color: #94a3b8; border-left: 3px solid #64748b; }
    .gu-res-row .gu-rn     { font-weight: 700; width: 24px; flex-shrink: 0; color: #cbd5e1; }
    .gu-res-row .gu-rt     { margin-left: auto; font-weight: 700; }

    .gu-res-actions { display: flex; gap: 12px; width: 100%; margin-top: 4px; }
    .gu-res-btn {
      flex: 1; padding: 12px 0; border-radius: 12px; border: none; cursor: pointer;
      font-size: 15px; font-weight: 700; font-family: inherit;
      transition: all .2s;
    }
    .gu-res-btn.gu-res-primary {
      background: linear-gradient(135deg, #818cf8, #38bdf8); color: #fff;
      box-shadow: 0 4px 20px rgba(129, 140, 248, 0.35);
    }
    .gu-res-btn.gu-res-primary:hover {
      transform: scale(1.03); box-shadow: 0 8px 28px rgba(129, 140, 248, 0.5);
    }
    .gu-res-btn.gu-res-secondary {
      background: rgba(255, 255, 255, 0.06); color: #cbd5e1;
      border: 1px solid rgba(255, 255, 255, 0.12);
    }
    .gu-res-btn.gu-res-secondary:hover {
      background: rgba(239, 68, 68, 0.2); color: #fff; border-color: rgba(239, 68, 68, 0.4);
      transform: scale(1.03);
    }
  `;
  document.head.appendChild(s);
}

export function createGameUI(stageEl, hudEl, onExit) {
  injectGameStyles();
  hudEl.style.display = 'none';

  const existingWrap = document.getElementById('gu-wrap');
  if (existingWrap) {
    if (stageEl.parentNode === existingWrap || stageEl.closest('#gu-wrap')) {
      existingWrap.parentNode?.insertBefore(stageEl, existingWrap);
    }
    existingWrap.remove();
  }
  const existingResults = document.getElementById('gu-results');
  if (existingResults) existingResults.remove();
  const existingFb = document.getElementById('gu-feedback');
  if (existingFb) existingFb.remove();

  stageEl.classList.add('gu-stage-frame');
  stageEl.style.position = 'relative';

  const wrap = document.createElement('div');
  wrap.id = 'gu-wrap';
  stageEl.parentNode.insertBefore(wrap, stageEl);

  const bar = document.createElement('div');
  bar.id = 'gu-bar';
  bar.innerHTML = `
    <div class="gu-bar-item">
      <span class="gu-bar-label">Player</span>
      <span class="gu-bar-val" id="gu-player-val">–</span>
    </div>

    <div class="gu-bar-item gu-round-wrap">
      <div style="display:flex;align-items:center;gap:6px;">
        <span class="gu-bar-label">Round</span>
        <span class="gu-bar-val" id="gu-round-val">– / –</span>
      </div>
      <div class="gu-round-track">
        <div id="gu-round-progress-bar"></div>
      </div>
    </div>

    <div class="gu-bar-item gu-score-wrap">
      <span class="gu-bar-label">Score</span>
      <span class="gu-bar-val" id="gu-score-val">0</span>
      <div class="gu-score-float" id="gu-score-float">+10</div>
    </div>

    <div class="gu-bar-item gu-streak-wrap">
      <span class="gu-bar-label">Streak</span>
      <div class="gu-streak-row">
        <span id="gu-streak-flame">🔥</span>
        <span class="gu-bar-val" id="gu-streak-val">0</span>
      </div>
      <div id="gu-streak-toast">On fire!</div>
    </div>

    <div style="display: flex; gap: 8px; align-items: center;">
      <button class="gu-bar-mute" id="gu-btn-mute" title="Toggle Sound">🔊</button>
      <button class="gu-bar-exit" id="gu-btn-exit" title="Exit to Home Screen">✕ Exit</button>
    </div>
  `;
  wrap.appendChild(bar);

  const stack = document.createElement('div');
  stack.id = 'gu-game-stack';
  stack.className = 'gu-game-stack';
  wrap.appendChild(stack);

  const cue = document.createElement('div');
  cue.id = 'gu-cue';
  cue.innerHTML = `
    <div id="gu-cue-text">⏳ Get Ready…</div>
    <div id="gu-timeout-bar"></div>
  `;
  stack.appendChild(cue);

  stack.appendChild(stageEl);

  const cornersWrap = document.createElement('div');
  cornersWrap.id = 'gu-corners-wrap';
  cornersWrap.innerHTML = `
    <div class="gu-corner gu-corner-tl"></div>
    <div class="gu-corner gu-corner-tr"></div>
    <div class="gu-corner gu-corner-bl"></div>
    <div class="gu-corner gu-corner-br"></div>
  `;
  stageEl.appendChild(cornersWrap);

  const detectChip = document.createElement('div');
  detectChip.id = 'gu-detect-chip';
  detectChip.className = 'gu-detect-chip';
  detectChip.innerHTML = `
    <svg class="gu-detect-ring" viewBox="0 0 24 24">
      <circle class="gu-ring-bg" cx="12" cy="12" r="9" stroke-width="2.5" fill="none" />
      <circle class="gu-ring-fg" id="gu-ring-fg" cx="12" cy="12" r="9" stroke-width="2.5" fill="none"
        stroke-dasharray="56.55" stroke-dashoffset="56.55" stroke-linecap="round"
        transform="rotate(-90 12 12)" />
    </svg>
    <span class="gu-detect-label" id="gu-detect-label">Detected: <span class="gu-detect-val">None</span></span>
  `;
  stageEl.appendChild(detectChip);

  const sidePanelDummy = document.createElement('div');
  sidePanelDummy.id = 'gu-side-panel';
  sidePanelDummy.style.display = 'none';
  sidePanelDummy.innerHTML = `
    <div id="gu-card-acc"><span id="gu-stat-acc"></span></div>
    <div id="gu-card-best-streak"><span id="gu-stat-best-streak"></span></div>
    <div id="gu-card-avg-rt"><span id="gu-stat-avg-rt"></span></div>
    <div id="gu-card-rounds-left"><span id="gu-stat-rounds-left"></span></div>
  `;
  wrap.appendChild(sidePanelDummy);

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

  const results = document.createElement('div');
  results.id = 'gu-results';
  results.classList.add('gu-hidden');
  results.innerHTML = `
    <div class="gu-res-card">
      <div>
        <div class="gu-res-title">Benchmark Complete!</div>
        <div class="gu-res-player" id="gu-res-player"></div>
      </div>
      <div class="gu-res-stats" id="gu-res-stats"></div>
      <div>
        <div class="gu-bar-label" style="margin-bottom:8px">Round Breakdown</div>
        <div class="gu-res-history" id="gu-res-history"></div>
      </div>
      <div class="gu-res-actions">
        <button class="gu-res-btn gu-res-primary" id="gu-res-play-again">Play Again 🎮</button>
        <button class="gu-res-btn gu-res-secondary" id="gu-res-exit">Exit to Home 🏠</button>
      </div>
    </div>
  `;
  document.body.appendChild(results);

  const roundVal         = document.getElementById('gu-round-val');
  const roundProgressBar = document.getElementById('gu-round-progress-bar');
  const scoreVal         = document.getElementById('gu-score-val');
  const scoreFloat       = document.getElementById('gu-score-float');
  const streakVal        = document.getElementById('gu-streak-val');
  const streakFlame      = document.getElementById('gu-streak-flame');
  const streakToast      = document.getElementById('gu-streak-toast');
  const cueText          = document.getElementById('gu-cue-text');
  const timeoutBar       = document.getElementById('gu-timeout-bar');
  const fbEl             = document.getElementById('gu-feedback');
  const fbBg             = document.getElementById('gu-feedback-bg');
  const fbIcon           = document.getElementById('gu-feedback-icon');
  const fbResult         = document.getElementById('gu-feedback-result');
  const fbRt             = document.getElementById('gu-feedback-rt');
  const btnExit          = document.getElementById('gu-btn-exit');
  const btnMute          = document.getElementById('gu-btn-mute');

  const statAcc        = document.getElementById('gu-stat-acc');
  const statBestStreak = document.getElementById('gu-stat-best-streak');
  const statAvgRt      = document.getElementById('gu-stat-avg-rt');
  const statRoundsLeft = document.getElementById('gu-stat-rounds-left');

  const ringFg      = document.getElementById('gu-ring-fg');
  const detectLabel = document.getElementById('gu-detect-label');

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
  let timeoutWarnTimer = null;
  let currentScore = 0;
  let currentStageColor = '#38bdf8';
  let activeScoreRaf = null;

  function setStageBorderColor(color, glow = null) {
    currentStageColor = color;
    stageEl.style.setProperty('--stage-border', color);
    stageEl.style.setProperty('--stage-glow', glow || color);
  }

  setStageBorderColor('rgba(56, 189, 248, 0.4)', 'rgba(56, 189, 248, 0.2)');

  return {
    setExitHandler(fn) {
      currentExitHandler = fn;
    },

    setPlayerName(name) {
      const el = document.getElementById('gu-player-val');
      if (el) el.textContent = name || '–';
    },

    setRound(n, total) {
      roundVal.textContent = `${n} / ${total}`;
      const pct = Math.min(100, Math.max(5, Math.round((n / total) * 100)));
      roundProgressBar.style.width = `${pct}%`;
      if (statRoundsLeft) statRoundsLeft.textContent = Math.max(0, total - n + 1);
    },

    setScore(score) {
      const targetScore = Math.max(0, score || 0);
      const diff = targetScore - currentScore;

      if (diff > 0) {

        scoreFloat.textContent = `+${diff}`;
        scoreFloat.classList.remove('gu-float-anim');
        void scoreFloat.offsetWidth; 
        scoreFloat.classList.add('gu-float-anim');

        scoreVal.classList.remove('gu-score-pop');
        void scoreVal.offsetWidth;
        scoreVal.classList.add('gu-score-pop');

        if (activeScoreRaf) cancelAnimationFrame(activeScoreRaf);
        const startVal = currentScore;
        const startTime = performance.now();
        const duration = 300;

        const animateScore = (now) => {
          const elapsed = now - startTime;
          const progress = Math.min(1, elapsed / duration);
          const val = Math.round(startVal + diff * progress);
          scoreVal.textContent = val;
          if (progress < 1) {
            activeScoreRaf = requestAnimationFrame(animateScore);
          } else {
            scoreVal.textContent = targetScore;
            activeScoreRaf = null;
          }
        };
        activeScoreRaf = requestAnimationFrame(animateScore);
      } else {
        scoreVal.textContent = targetScore;
      }

      currentScore = targetScore;
    },

    setStreak(s) {
      streakVal.textContent = s;

      if (s <= 0) {
        streakFlame.style.transform = 'scale(1)';
        streakFlame.style.filter = 'grayscale(0.6) opacity(0.6)';
      } else if (s < 3) {
        streakFlame.style.transform = 'scale(1.15)';
        streakFlame.style.filter = 'drop-shadow(0 0 6px rgba(249, 115, 22, 0.7))';
      } else if (s < 5) {
        streakFlame.style.transform = 'scale(1.3)';
        streakFlame.style.filter = 'drop-shadow(0 0 12px rgba(249, 115, 22, 0.9)) drop-shadow(0 0 18px rgba(234, 88, 12, 0.6))';
      } else if (s < 10) {
        streakFlame.style.transform = 'scale(1.45)';
        streakFlame.style.filter = 'drop-shadow(0 0 16px rgba(249, 115, 22, 1)) drop-shadow(0 0 24px rgba(234, 179, 8, 0.8))';
      } else {
        streakFlame.style.transform = 'scale(1.65)';
        streakFlame.style.filter = 'drop-shadow(0 0 20px rgba(239, 68, 68, 1)) drop-shadow(0 0 30px rgba(234, 179, 8, 1))';
      }

      if (s === 3 || s === 5 || s === 10) {
        const messages = {
          3: '🔥 ON FIRE! 3x',
          5: '⚡ SUPER STREAK! 5x',
          10: '💥 UNSTOPPABLE! 10x',
        };
        streakToast.textContent = messages[s];
        streakToast.classList.remove('gu-toast-show');
        void streakToast.offsetWidth;
        streakToast.classList.add('gu-toast-show');
      }
    },

    showArm() {
      clearTimeout(timeoutWarnTimer);
      cue.style.background = 'rgba(10, 14, 26, 0.95)';
      cue.className = '';
      cueText.style.color = 'rgba(255, 255, 255, 0.4)';
      cueText.textContent = 'Lower hand to arm…';
      timeoutBar.style.width = '0%';
      timeoutBar.style.transition = 'none';
      timeoutBar.classList.remove('gu-timeout-red');
      setStageBorderColor('rgba(56, 189, 248, 0.4)', 'rgba(56, 189, 248, 0.2)');
    },

    showDelay() {
      clearTimeout(timeoutWarnTimer);
      cue.style.background = 'rgba(10, 14, 26, 0.95)';
      cue.className = '';
      cueText.innerHTML = '<div class="gu-dots"><div class="gu-dot"></div><div class="gu-dot"></div><div class="gu-dot"></div></div>';
      timeoutBar.style.width = '0%';
      timeoutBar.classList.remove('gu-timeout-red');
      setStageBorderColor('rgba(56, 189, 248, 0.4)', 'rgba(56, 189, 248, 0.2)');
    },

    showCue(colorName, timeoutMs) {
      clearTimeout(timeoutWarnTimer);
      const meta = TARGET_COLORS[colorName] ?? { bg: '#3b82f6', fg: '#fff', glow: 'rgba(59, 130, 246, 0.6)' };

      cue.style.background = meta.bg;
      cue.style.setProperty('--banner-glow', meta.glow);
      cue.classList.remove('gu-cue-active');
      void cue.offsetWidth; 
      cue.classList.add('gu-cue-active');

      cueText.style.color = meta.fg;
      cueText.textContent = colorName.toUpperCase();

      setStageBorderColor(meta.bg, meta.glow);

      timeoutBar.classList.remove('gu-timeout-red');
      timeoutBar.style.transition = 'none';
      timeoutBar.style.width = '100%';

      requestAnimationFrame(() => {
        timeoutBar.style.transition = `width ${timeoutMs}ms linear`;
        timeoutBar.style.width = '0%';
      });

      timeoutWarnTimer = setTimeout(() => {
        timeoutBar.classList.add('gu-timeout-red');
      }, timeoutMs * 0.75);
    },

    showFalseStart() {
      cue.classList.add('gu-false-start');
      cueText.textContent = '⚠️  FALSE START';
      cueText.style.color = '#f59e0b';
      setTimeout(() => cue.classList.remove('gu-false-start'), 1200);
    },

    showFeedback(type, rt, _targetGesture, detectedGesture) {
      clearTimeout(fbTimer);
      clearTimeout(timeoutWarnTimer);

      const showedText = (detectedGesture && detectedGesture !== 'none')
        ? (GESTURE_DISPLAY_NAMES[detectedGesture] ?? detectedGesture)
        : 'None';

      const configs = {
        correct: {
          bg: '#16a34a',
          borderColor: '#22c55e',
          icon: '✅',
          label: 'CORRECT!',
          rtText: rt != null ? `${Math.round(rt)} ms` : '',
        },
        wrong: {
          bg: '#dc2626',
          borderColor: '#ef4444',
          icon: '❌',
          label: 'WRONG',
          rtText: `You showed: ${showedText}`, 
        },
        timeout: {
          bg: '#7c3aed',
          borderColor: '#a855f7',
          icon: '⏱️',
          label: 'TOO SLOW',
          rtText: 'Timeout',
        },
      };

      const cfg = configs[type] ?? configs.timeout;
      fbBg.style.background = cfg.bg;
      fbIcon.textContent   = cfg.icon;
      fbResult.textContent = cfg.label;
      fbRt.textContent     = cfg.rtText;
      fbEl.classList.add('gu-show');

      setStageBorderColor(cfg.borderColor, cfg.bg);
    },

    hideFeedback() {
      fbEl.classList.remove('gu-show');
      setStageBorderColor('rgba(56, 189, 248, 0.4)', 'rgba(56, 189, 248, 0.2)');
    },

    updateDetection(label, progressRatio = 0) {
      const name = GESTURE_DISPLAY_NAMES[label] ?? (label || 'None');
      detectLabel.innerHTML = `Detected: <span class="gu-detect-val">${name}</span>`;

      const circumference = 56.55;
      const p = Math.max(0, Math.min(1, progressRatio));
      ringFg.style.strokeDashoffset = (circumference * (1 - p)).toFixed(2);
      ringFg.style.stroke = p >= 1 ? '#22c55e' : (p > 0.5 ? '#38bdf8' : '#64748b');
    },

    updateLiveStats(stats, currentStreak, currentRound, totalRounds) {
      if (statAcc) {
        const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 100;
        statAcc.textContent = `${accuracy}%`;
      }
      if (statBestStreak) statBestStreak.textContent = stats.longestStreak || currentStreak || 0;
      if (statAvgRt) {
        const avgRt = stats.reactionTimes.length > 0
          ? Math.round(stats.reactionTimes.reduce((a, b) => a + b, 0) / stats.reactionTimes.length)
          : '–';
        statAvgRt.innerHTML = `${avgRt} <small>ms</small>`;
      }
      if (statRoundsLeft) statRoundsLeft.textContent = Math.max(0, totalRounds - currentRound);
    },

    getStageColor() {
      return currentStageColor;
    },

    setStageColor(color, glow) {
      setStageBorderColor(color, glow);
    },

    showResults(stats, playerInfo, rounds, onPlayAgain, onExitCallback) {
      playCompletion();
      const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
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
        const outcomeLabel = r.outcome ? r.outcome.toUpperCase() : '–';
        return `<div class="gu-res-row gu-${cls}">
          <span class="gu-rn">${i + 1}</span>
          <span>${r.color ?? ''}</span>
          <span>${outcomeLabel}</span>
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
      clearTimeout(timeoutWarnTimer);
      if (activeScoreRaf) cancelAnimationFrame(activeScoreRaf);

      stageEl.classList.remove('gu-stage-frame');
      const corners = document.getElementById('gu-corners-wrap');
      if (corners) corners.remove();
      const chip = document.getElementById('gu-detect-chip');
      if (chip) chip.remove();

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

