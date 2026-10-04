import { classifyGesture, getGestureConfidence } from '../gesture/gestureClassifier.js';
import { drawHand } from '../hands/overlay.js';
import { playCorrect } from '../audio/soundManager.js';

const REQUIRED = [
  { label: 'two_fingers', name: 'Two Fingers', emoji: '✌️' },
  { label: 'fist',        name: 'Fist',        emoji: '✊' },
  { label: 'thumbs_up',  name: 'Thumbs Up',   emoji: '👍' },
  { label: 'point',       name: 'Pointing',    emoji: '☝️' },
];

const HOLD_FRAMES    = 25;    
const CONF_THRESHOLD = 0.45;  
const MIN_PASS_RATE  = 0.70;  

function injectCalibStyles() {
  if (document.getElementById('calib-styles')) return;
  const s = document.createElement('style');
  s.id = 'calib-styles';
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');

    #calib-overlay {
      position: fixed; inset: 0; z-index: 200;
      background: rgba(6,6,18,0.97);
      backdrop-filter: blur(6px);
      display: flex; align-items: center; justify-content: center;
      font-family: 'Inter', system-ui, sans-serif;
      transition: background 0.3s ease, align-items 0.3s ease;
    }
    #calib-overlay.calib-cam-mode {
      background: rgba(6,6,18,0.35);
      align-items: flex-end;
    }
    .calib-card {
      background: rgba(15,15,30,0.95);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 20px; padding: 28px 36px;
      width: min(540px, 92vw); color: #f1f5f9;
      box-shadow: 0 28px 72px rgba(0,0,0,.7);
      display: flex; flex-direction: column; gap: 18px;
      box-sizing: border-box;
      transition: all 0.3s ease;
    }
    #calib-overlay.calib-cam-mode .calib-card {
      border-radius: 20px 20px 0 0;
      width: 640px; max-width: 95vw;
      padding: 16px 24px 20px;
      gap: 12px;
    }
    .calib-logo {
      font-size: 22px; font-weight: 900; letter-spacing: -0.5px;
      background: linear-gradient(90deg,#818cf8,#38bdf8);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .calib-sub { font-size: 13px; color: #94a3b8; margin-top: 4px; line-height: 1.4; }
    .calib-list { display: flex; flex-direction: column; gap: 8px; }
    .calib-item {
      display: flex; align-items: center; gap: 14px;
      padding: 10px 14px; border-radius: 12px;
      background: rgba(255,255,255,0.04);
      border: 1.5px solid transparent;
      transition: all .2s;
    }
    .calib-item.calib-active {
      border-color: #818cf8;
      background: rgba(129,140,248,0.12);
      box-shadow: 0 0 16px rgba(129,140,248,0.25);
    }
    .calib-item.calib-pass {
      border-color: #22c55e;
      background: rgba(34,197,94,0.18);
      box-shadow: 0 0 18px rgba(34,197,94,0.3);
    }
    .calib-item.calib-fail {
      border-color: #ef4444;
      background: rgba(239,68,68,0.15);
    }
    .calib-emoji { font-size: 24px; flex-shrink: 0; }
    .calib-info { flex: 1; display: flex; flex-direction: column; gap: 4px; }
    .calib-name { font-size: 14px; font-weight: 700; color: #f8fafc; }
    .calib-progress-wrap {
      height: 6px; border-radius: 99px;
      background: rgba(255,255,255,0.1); overflow: hidden;
    }
    .calib-progress-bar {
      height: 100%; border-radius: 99px;
      background: linear-gradient(90deg,#818cf8,#22c55e);
      width: 0%; transition: width .05s linear;
    }
    .calib-status-icon { font-size: 18px; flex-shrink: 0; width: 24px; text-align:center; }
    .calib-instruction {
      font-size: 14px; color: #cbd5e1; text-align: center; line-height: 1.5; margin: 4px 0 0;
    }
    .calib-btn {
      padding: 13px 0; border-radius: 12px; border: none; cursor: pointer;
      font-size: 15px; font-weight: 700; font-family: inherit;
      transition: all .2s;
    }
    .calib-btn.calib-primary {
      background: linear-gradient(135deg,#818cf8,#38bdf8); color: #fff;
      box-shadow: 0 4px 20px rgba(129,140,248,.35);
    }
    .calib-btn.calib-primary:hover:not(:disabled) {
      transform: translateY(-2px); box-shadow: 0 8px 28px rgba(129,140,248,.5);
    }
    .calib-btn.calib-primary:disabled {
      background: rgba(255,255,255,.08); color: #475569;
      box-shadow: none; cursor: not-allowed;
    }
  `;
  document.head.appendChild(s);
}

export function runCalibration(videoEl, canvasEl, tracker) {
  injectCalibStyles();

  return new Promise((resolve) => {
    const ctx = canvasEl.getContext('2d');
    let rafId = null;
    let isTerminated = false;

    const scaleReadings = [];
    const gesturePasses = {};   

    const ov = document.createElement('div');
    ov.id = 'calib-overlay';

    const itemsHTML = REQUIRED.map((g, i) => `
      <div class="calib-item" id="calib-item-${i}">
        <span class="calib-emoji">${g.emoji}</span>
        <div class="calib-info">
          <span class="calib-name">${g.name}</span>
          <div class="calib-progress-wrap">
            <div class="calib-progress-bar" id="calib-bar-${i}"></div>
          </div>
        </div>
        <span class="calib-status-icon" id="calib-icon-${i}">○</span>
      </div>`).join('');

    ov.innerHTML = `
      <div class="calib-card">
        <div>
          <div class="calib-logo">Practice Calibration</div>
          <div class="calib-sub">
            Hold each gesture steadily for about 1 second.<br>
            Your hand must stay fully visible to the camera.
          </div>
        </div>
        <div class="calib-list">${itemsHTML}</div>
        <p class="calib-instruction" id="calib-instr">
          Click <strong>Begin</strong> when you are ready.
        </p>
        <button class="calib-btn calib-primary" id="calib-btn">Begin Calibration</button>
      </div>`;

    document.body.appendChild(ov);

    const itemEls = REQUIRED.map((_, i) => ({
      wrap: document.getElementById(`calib-item-${i}`),
      bar:  document.getElementById(`calib-bar-${i}`),
      icon: document.getElementById(`calib-icon-${i}`),
    }));
    const instr  = document.getElementById('calib-instr');
    const btn    = document.getElementById('calib-btn');

    let gestureIdx   = 0;   
    let consecFrames = 0;   
    let totalFrames  = 0;   
    let confSum      = 0;   

    function setItemState(i, state) {

      const cls = state ? `calib-item calib-${state}` : 'calib-item';
      itemEls[i].wrap.className = cls;
      const icons = { active: '●', pass: '✅', fail: '❌' };
      itemEls[i].icon.textContent = icons[state] ?? '○';
    }

    function activateGesture(i) {
      const g = REQUIRED[i];
      setItemState(i, 'active');
      instr.innerHTML =
        `Hold <strong>${g.emoji}&nbsp;${g.name}</strong> steadily until the bar fills…`;
    }

    function recordAndAdvance() {
      const g      = REQUIRED[gestureIdx];
      const passed = consecFrames >= HOLD_FRAMES;
      gesturePasses[g.label] = {
        passRate: totalFrames > 0 ? consecFrames / HOLD_FRAMES : 0,
        avgConf:  confSum / Math.max(totalFrames, 1),
      };
      itemEls[gestureIdx].bar.style.width = '100%';
      setItemState(gestureIdx, passed ? 'pass' : 'fail');

      if (passed) {
        playCorrect();
      }

      gestureIdx++;
      consecFrames = 0; totalFrames = 0; confSum = 0;

      while (gestureIdx < REQUIRED.length &&
             gesturePasses[REQUIRED[gestureIdx]?.label]?.passRate >= MIN_PASS_RATE) {
        gestureIdx++;
      }

      if (gestureIdx >= REQUIRED.length) {
        finishCalibration();
      } else {
        activateGesture(gestureIdx);
        rafId = requestAnimationFrame(loop);
      }
    }

    function loop() {
      if (isTerminated) return;
      if (videoEl.readyState < 2) { rafId = requestAnimationFrame(loop); return; }

      const det = tracker.detect(videoEl);
      ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
      if (det.landmarks) drawHand(ctx, det.landmarks);

      if (det.landmarks) {
        const lm = det.landmarks;
        const dx = lm[9].x - lm[0].x, dy = lm[9].y - lm[0].y;
        scaleReadings.push(Math.sqrt(dx * dx + dy * dy));
      }

      if (gestureIdx >= REQUIRED.length) {
        return; 
      }

      const target = REQUIRED[gestureIdx];
      const label  = classifyGesture(det.landmarks);
      const conf   = getGestureConfidence(det.landmarks, label);

      if (det.landmarks) totalFrames++;

      if (label === target.label && conf >= CONF_THRESHOLD) {
        consecFrames = Math.min(HOLD_FRAMES, consecFrames + 1);
        confSum += conf;
      } else {

        consecFrames = Math.max(0, consecFrames - 2);
      }

      const pct = Math.min(100, (consecFrames / HOLD_FRAMES) * 100);
      itemEls[gestureIdx].bar.style.width = `${pct}%`;

      if (consecFrames >= HOLD_FRAMES) {
        recordAndAdvance();
        return;
      }

      rafId = requestAnimationFrame(loop);
    }

    function finishCalibration() {
      isTerminated = true;
      if (rafId) cancelAnimationFrame(rafId);
      ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
      ov.classList.remove('calib-cam-mode');

      const allPass = REQUIRED.every(
        g => (gesturePasses[g.label]?.passRate ?? 0) >= MIN_PASS_RATE);

      const sorted = [...scaleReadings].sort((a, b) => a - b);
      const handScale = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0.15;

      instr.innerHTML = allPass
        ? '🎉 All gestures verified — you\'re ready to play!'
        : '⚠️ Some gestures didn\'t pass. Retry the failed ones.';

      btn.disabled = false;
      btn.textContent = allPass ? 'Start Game →' : 'Retry Failed Gestures';

      btn.onclick = () => {
        if (allPass) {
          isTerminated = true;
          if (rafId) cancelAnimationFrame(rafId);
          ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
          ov.remove();
          resolve({ handScale, gesturePasses });
        } else {
          isTerminated = false;

          REQUIRED.forEach((g, i) => {
            const p = gesturePasses[g.label];
            if (!p || p.passRate < MIN_PASS_RATE) {
              delete gesturePasses[g.label];
              itemEls[i].bar.style.width = '0%';
              setItemState(i, '');
            }
          });
          gestureIdx = REQUIRED.findIndex(g => !gesturePasses[g.label]);
          consecFrames = 0; totalFrames = 0; confSum = 0;
          activateGesture(gestureIdx);
          ov.classList.add('calib-cam-mode');
          btn.disabled = true;
          rafId = requestAnimationFrame(loop);
        }
      };
    }

    btn.onclick = () => {
      btn.disabled = true;
      ov.classList.add('calib-cam-mode');
      gestureIdx   = 0;
      consecFrames = 0; totalFrames = 0; confSum = 0;
      activateGesture(0);
      rafId = requestAnimationFrame(loop);
    };
  });
}

