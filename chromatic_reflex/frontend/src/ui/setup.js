import { startCamera }      from '../camera/camera.js';
import { createHandTracker } from '../hands/handTracker.js';
import { drawHand }          from '../hands/overlay.js';

const BOX = { x1: 0.18, y1: 0.05, x2: 0.82, y2: 0.95 };

const MAPPING = [
  { color: 'RED',    label: 'Two Fingers', emoji: '✌️', hex: '#ef4444' },
  { color: 'BLUE',   label: 'Fist',        emoji: '✊', hex: '#3b82f6' },
  { color: 'YELLOW', label: 'Thumbs Up',   emoji: '👍', hex: '#eab308' },
  { color: 'GREEN',  label: 'Pointing',    emoji: '☝️', hex: '#22c55e' },
];

function sampleBrightness(videoEl) {
  try {
    const c = document.createElement('canvas');
    c.width = 80; c.height = 60;
    const x = c.getContext('2d');
    x.drawImage(videoEl, 0, 0, 80, 60);
    const d = x.getImageData(0, 0, 80, 60).data;
    let s = 0;
    for (let i = 0; i < d.length; i += 4)
      s += d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
    return s / (d.length / 4);
  } catch { return 128; }
}

function handInBox(lm) {
  if (!lm) return false;
  const w = lm[0];
  return w.x >= BOX.x1 && w.x <= BOX.x2 && w.y >= BOX.y1 && w.y <= BOX.y2;
}

function drawGuideBox(ctx) {
  const { width: cw, height: ch } = ctx.canvas;
  const x  = BOX.x1 * cw,          y  = BOX.y1 * ch;
  const bw = (BOX.x2 - BOX.x1) * cw, bh = (BOX.y2 - BOX.y1) * ch;
  ctx.save();
  ctx.strokeStyle = 'rgba(0,230,118,0.8)';
  ctx.lineWidth = 3;
  ctx.setLineDash([14, 8]);
  ctx.beginPath();
  ctx.roundRect(x, y, bw, bh, 20);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(0,230,118,0.75)';
  ctx.font = 'bold 14px Inter,system-ui,sans-serif';
  ctx.fillText('Place hand here', x + 10, y + 24);
  ctx.restore();
}

function buildMapGridHTML() {
  return MAPPING.map(m => `
    <div class="su-map-card su-card-${m.color.toLowerCase()}">
      <span class="su-map-color">${m.color}</span>
      <span class="su-map-emoji">${m.emoji}</span>
      <span class="su-map-label">${m.label}</span>
    </div>`).join('');
}

function injectStyles() {
  if (document.getElementById('su-styles')) return;
  const s = document.createElement('style');
  s.id = 'su-styles';
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');

    #su-overlay {
      position: fixed; inset: 0; z-index: 200;
      display: flex; align-items: center; justify-content: center;
      background: rgba(6,6,18,0.97);
      backdrop-filter: blur(6px);
      font-family: 'Inter', system-ui, sans-serif;
      transition: background 0.4s ease, align-items 0.4s ease;
    }
    #su-overlay.su-cam-mode {
      background: rgba(6,6,18,0.18);
      align-items: flex-end;
    }

    .su-card {
      background: rgba(255,255,255,0.055);
      border: 1px solid rgba(255,255,255,0.11);
      border-radius: 22px;
      padding: 40px 48px;
      width: min(520px, 92vw);
      box-shadow: 0 28px 72px rgba(0,0,0,0.65);
      display: flex; flex-direction: column; gap: 22px;
      backdrop-filter: blur(18px);
      color: #f1f5f9;
      animation: su-fade-in 0.35s ease;
    }
    .su-card.su-hidden { display: none !important; }

    #su-overlay.su-cam-mode .su-card {
      border-radius: 18px 18px 0 0;
      padding: 22px 32px 20px;
      width: 100%; max-width: 100%;
      flex-direction: row; flex-wrap: wrap;
      gap: 14px 36px; align-items: center;
    }
    @keyframes su-fade-in {
      from { opacity:0; transform:translateY(18px); }
      to   { opacity:1; transform:translateY(0); }
    }

    .su-logo {
      font-size: 27px; font-weight: 900; letter-spacing: -1px;
      background: linear-gradient(90deg,#818cf8 0%,#38bdf8 100%);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      background-clip: text; line-height: 1.1;
    }
    .su-sub { font-size: 14px; color: #94a3b8; margin-top: -14px; line-height: 1.5; }

    .su-field { display: flex; flex-direction: column; gap: 8px; }
    .su-field > label {
      font-size: 11px; font-weight: 700; letter-spacing: .1em;
      text-transform: uppercase; color: #64748b;
    }
    .su-field input {
      background: rgba(255,255,255,0.06);
      border: 1.5px solid rgba(255,255,255,0.12);
      border-radius: 11px; padding: 13px 16px;
      color: #f1f5f9; font-size: 15px; outline: none;
      font-family: inherit; transition: border-color .2s;
    }
    .su-field input:focus { border-color: #818cf8; }
    .su-field input::placeholder { color: #374151; }

    .su-hand-toggle { display: flex; gap: 10px; }
    .su-htb {
      flex: 1; padding: 12px 0; border-radius: 11px;
      border: 1.5px solid rgba(255,255,255,0.12);
      background: transparent; color: #94a3b8;
      font-size: 14px; font-weight: 600; cursor: pointer;
      font-family: inherit; transition: all .2s;
    }
    .su-htb:hover { border-color: #818cf8; color: #c7d2fe; }
    .su-htb.su-active {
      background: rgba(129,140,248,0.18);
      border-color: #818cf8; color: #e0e7ff;
    }

    .su-btn {
      padding: 14px 0; border-radius: 12px; border: none;
      cursor: pointer; font-size: 15px; font-weight: 700;
      font-family: inherit; transition: all .2s; letter-spacing: .03em;
    }
    .su-btn.su-primary {
      background: linear-gradient(135deg,#818cf8,#38bdf8);
      color: #fff; box-shadow: 0 4px 20px rgba(129,140,248,.35);
    }
    .su-btn.su-primary:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 28px rgba(129,140,248,.55);
    }
    .su-btn.su-primary:disabled {
      background: rgba(255,255,255,0.09); color: #374151;
      box-shadow: none; cursor: not-allowed;
    }

    .su-checks { display: flex; flex-direction: column; gap: 10px; }
    .su-check-row {
      display: flex; align-items: center; gap: 12px;
      padding: 11px 14px; border-radius: 10px;
      background: rgba(255,255,255,0.04);
      font-size: 13px; font-weight: 500; transition: background .3s, color .3s;
    }
    .su-check-row.ok   { background: rgba(34,197,94,.14);  color: #4ade80; }
    .su-check-row.fail { background: rgba(239,68,68,.14);  color: #f87171; }
    .su-check-row.warn { background: rgba(234,179,8,.14);  color: #fbbf24; }
    .su-ci { font-size: 17px; flex-shrink: 0; }
    .su-hint { font-size: 12px; color: #475569; text-align: center; line-height: 1.5; }

    .su-map-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 14px;
    }
    .su-map-card {
      border-radius: 14px;
      padding: 16px 12px 14px;
      display: flex; flex-direction: column; align-items: center; gap: 6px;
      transition: transform .2s, box-shadow .2s;
    }
    .su-map-card:hover { transform: translateY(-3px); }

    .su-card-red {
      background: linear-gradient(150deg, #dc2626 0%, #991b1b 100%) !important;
      border: 2px solid #f87171 !important;
      box-shadow: 0 8px 24px rgba(220, 38, 38, 0.35) !important;
    }
    .su-card-blue {
      background: linear-gradient(150deg, #2563eb 0%, #1e40af 100%) !important;
      border: 2px solid #60a5fa !important;
      box-shadow: 0 8px 24px rgba(37, 99, 235, 0.35) !important;
    }
    .su-card-yellow {
      background: linear-gradient(150deg, #d97706 0%, #92400e 100%) !important;
      border: 2px solid #fbbf24 !important;
      box-shadow: 0 8px 24px rgba(217, 119, 6, 0.35) !important;
    }
    .su-card-green {
      background: linear-gradient(150deg, #16a34a 0%, #166534 100%) !important;
      border: 2px solid #4ade80 !important;
      box-shadow: 0 8px 24px rgba(22, 163, 74, 0.35) !important;
    }

    .su-map-color {
      font-size: 11px; font-weight: 800; letter-spacing: .12em;
      color: #fff; background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.25);
      padding: 3px 12px; border-radius: 99px;
      text-transform: uppercase;
    }
    .su-map-emoji { font-size: 40px; line-height: 1.15; margin: 2px 0; }
    .su-map-label { font-size: 14px; font-weight: 800; color: #ffffff; }

    #su-map-fab {
      position: fixed; bottom: 20px; right: 20px; z-index: 150;
      width: 52px; height: 52px; border-radius: 50%;
      background: linear-gradient(135deg,#818cf8,#38bdf8);
      border: none; cursor: pointer; font-size: 22px;
      box-shadow: 0 4px 20px rgba(129,140,248,.5);
      transition: transform .2s;
      display: flex; align-items: center; justify-content: center;
    }
    #su-map-fab:hover { transform: scale(1.12); }
    #su-map-fab title { display: none; }

    #su-map-panel {
      position: fixed; bottom: 82px; right: 20px; z-index: 150;
      background: rgba(8,8,20,0.96);
      border: 1px solid rgba(255,255,255,0.11);
      border-radius: 16px; padding: 18px 16px;
      width: 230px;
      backdrop-filter: blur(14px);
      box-shadow: 0 12px 40px rgba(0,0,0,.65);
      font-family: 'Inter', system-ui, sans-serif;
      transform: translateY(8px) scale(0.96);
      opacity: 0; pointer-events: none;
      transition: all .22s cubic-bezier(.4,0,.2,1);
    }
    #su-map-panel.su-visible {
      opacity: 1; transform: none; pointer-events: auto;
    }
    #su-map-panel .su-map-grid { grid-template-columns: 1fr 1fr; gap: 8px; }
    #su-map-panel .su-map-card { padding: 10px 8px; }
    #su-map-panel .su-map-emoji { font-size: 28px; }
    #su-map-panel .su-map-label { font-size: 11px; }
    #su-map-panel .su-map-color { font-size: 9px; }
    .su-panel-title {
      font-size: 10px; font-weight: 700; color: #475569;
      letter-spacing: .12em; text-transform: uppercase;
      margin-bottom: 10px;
      font-family: 'Inter', system-ui, sans-serif;
    }
  `;
  document.head.appendChild(s);
}

export function createMappingWidget() {
  const fab = document.createElement('button');
  fab.id = 'su-map-fab';
  fab.setAttribute('title', 'Gesture Map');
  fab.textContent = '🗺️';

  const panel = document.createElement('div');
  panel.id = 'su-map-panel';
  panel.innerHTML = `
    <div class="su-panel-title">Gesture Map</div>
    <div class="su-map-grid">${buildMapGridHTML()}</div>`;

  let timer = null;
  fab.addEventListener('click', () => {
    panel.classList.toggle('su-visible');
    clearTimeout(timer);
  });

  document.body.appendChild(fab);
  document.body.appendChild(panel);

  return {
    autoShow(ms = 4000) {
      panel.classList.add('su-visible');
      clearTimeout(timer);
      timer = setTimeout(() => panel.classList.remove('su-visible'), ms);
    },
    hide() {
      panel.classList.remove('su-visible');
      clearTimeout(timer);
    },
  };
}

export function runSetup(videoEl, canvasEl) {
  injectStyles();
  const ctx = canvasEl.getContext('2d');

  return new Promise((resolve) => {
    let tracker    = null;
    let rafId      = null;
    let selHand    = 'right';
    let playerName = '';

    const ov = document.createElement('div');
    ov.id = 'su-overlay';
    ov.innerHTML = `

      <div class="su-card" id="su-s1">
        <div class="su-logo">CHROMATIC REFLEX</div>
        <div class="su-sub">Enter your name and choose your playing hand to get started.</div>

        <div class="su-field">
          <label for="su-name-inp">Player Name</label>
          <input id="su-name-inp" type="text" maxlength="20"
                 placeholder="Enter your name…" autocomplete="off" />
        </div>

        <div class="su-field">
          <label>Playing Hand</label>
          <div class="su-hand-toggle">
            <button class="su-htb su-active" data-h="right">✋&nbsp; Right</button>
            <button class="su-htb"           data-h="left" >🤚&nbsp; Left</button>
          </div>
        </div>

        <button class="su-btn su-primary" id="su-b1">Check Camera →</button>
      </div>

      <div class="su-card su-hidden" id="su-s2">
        <div>
          <div class="su-logo" style="font-size:20px">📷&nbsp; Camera Check</div>
          <p class="su-sub" style="margin-top:6px">
            Hold your <strong>playing hand</strong> inside the green guide box.
          </p>
        </div>

        <div class="su-checks">
          <div class="su-check-row" id="su-cr-cam">
            <span class="su-ci">⏳</span> Camera access
          </div>
          <div class="su-check-row" id="su-cr-light">
            <span class="su-ci">⏳</span> Lighting
          </div>
          <div class="su-check-row" id="su-cr-hand">
            <span class="su-ci">⏳</span> Hand inside guide box
          </div>
        </div>

        <button class="su-btn su-primary" id="su-b2" disabled>
          Continue to Briefing →
        </button>
      </div>

      <div class="su-card su-hidden" id="su-s3">
        <div class="su-logo">Gesture Map</div>
        <div class="su-sub">
          Memorise these colour→gesture pairs. This card stays available
          via the 🗺️ button during play, and appears automatically before
          each timed round.
        </div>

        <div class="su-map-grid">${buildMapGridHTML()}</div>

        <button class="su-btn su-primary" id="su-b3">Let's Play! 🎮</button>
      </div>
    `;
    document.body.appendChild(ov);

    const htBtns = ov.querySelectorAll('.su-htb');
    htBtns.forEach(b => b.addEventListener('click', () => {
      htBtns.forEach(x => x.classList.remove('su-active'));
      b.classList.add('su-active');
      selHand = b.dataset.h;
    }));

    ov.querySelector('#su-b1').addEventListener('click', async () => {
      playerName = ov.querySelector('#su-name-inp').value.trim() || 'Player';
      goStep(2);
      await initCameraCheck();
    });

    async function initCameraCheck() {
      const crCam   = ov.querySelector('#su-cr-cam');
      const crLight = ov.querySelector('#su-cr-light');
      const crHand  = ov.querySelector('#su-cr-hand');
      const btnNext = ov.querySelector('#su-b2');

      try {
        await startCamera(videoEl);
        setRow(crCam, 'ok', 'Camera access ✓');
      } catch {
        setRow(crCam, 'fail', 'Camera denied — check browser permissions');
        return;
      }

      setRow(crLight, 'loading', 'Loading hand model…');
      try {
        tracker = await createHandTracker();
      } catch {
        setRow(crLight, 'fail', 'Failed to load hand model — check your connection');
        return;
      }

      let lightOk = false, handOk = false;
      let isTerminated = false;

      const loop = () => {
        if (isTerminated) return;

        if (videoEl.readyState < 2) { rafId = requestAnimationFrame(loop); return; }

        ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
        drawGuideBox(ctx);

        const det = tracker.detect(videoEl);
        if (det.landmarks) drawHand(ctx, det.landmarks);

        const br = sampleBrightness(videoEl);
        if (br < 40) {
          setRow(crLight, 'fail', 'Too dark — add more light'); lightOk = false;
        } else if (br > 215) {
          setRow(crLight, 'warn', 'Too bright — reduce glare'); lightOk = false;
        } else {
          setRow(crLight, 'ok', 'Lighting ✓'); lightOk = true;
        }

        const inBox = handInBox(det.landmarks);
        if (inBox) {
          setRow(crHand, 'ok', 'Hand detected in guide box ✓'); handOk = true;
        } else if (det.landmarks) {
          setRow(crHand, 'warn', 'Move hand into the green box'); handOk = false;
        } else {
          setRow(crHand, 'loading', 'Show your hand to the camera…'); handOk = false;
        }

        btnNext.disabled = !(lightOk && handOk);
        if (!isTerminated) {
          rafId = requestAnimationFrame(loop);
        }
      };

      rafId = requestAnimationFrame(loop);
    }

    ov.querySelector('#su-b2').addEventListener('click', () => {
      cancelAnimationFrame(rafId);
      ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
      goStep(3);
    });

    ov.querySelector('#su-b3').addEventListener('click', () => {
      cancelAnimationFrame(rafId);
      ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
      ov.remove();
      resolve({ name: playerName, hand: selHand, tracker });
    });

    function goStep(n) {
      ov.querySelectorAll('.su-card').forEach((c, i) => {
        c.classList.toggle('su-hidden', i + 1 !== n);
      });

      ov.classList.toggle('su-cam-mode', n === 2);
    }

    function setRow(el, state, text) {
      const icons = { ok: '✅', fail: '❌', warn: '⚠️', loading: '⏳' };
      el.className = `su-check-row ${state}`;
      el.innerHTML = `<span class="su-ci">${icons[state]}</span>&nbsp;${text}`;
    }
  });
}

