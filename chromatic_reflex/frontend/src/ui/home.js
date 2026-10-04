// src/ui/home.js
// Clean, professional landing screen for CSES NIT Warangal ML Team.
// Features:
//   - Professional academic / research team header
//   - 4 gesture preview cards styled directly in their respective colors (Red, Blue, Yellow, Green)
//   - Clean summary brief
//   - "Start Benchmark" button

import { playClick } from '../audio/soundManager.js';

function injectHomeStyles() {
  if (document.getElementById('home-styles')) return;
  const s = document.createElement('style');
  s.id = 'home-styles';
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');

    #home-overlay {
      position: fixed; inset: 0; z-index: 100;
      background: #07090e;
      color: #f8fafc;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      overflow-y: auto;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 32px 20px;
      box-sizing: border-box;
    }
    #home-overlay.home-hidden { display: none; }

    .home-container {
      width: 100%; max-width: 780px;
      display: flex; flex-direction: column; align-items: center;
      gap: 28px;
      animation: home-fade-in 0.3s ease;
    }
    @keyframes home-fade-in {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* ── Header ── */
    .home-header {
      display: flex; flex-direction: column; align-items: center;
      text-align: center; gap: 10px;
    }
    .home-org-badge {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 6px 16px; border-radius: 99px;
      background: rgba(56, 189, 248, 0.08);
      border: 1px solid rgba(56, 189, 248, 0.25);
      color: #7dd3fc; font-size: 12px; font-weight: 700;
      letter-spacing: 0.06em; text-transform: uppercase;
    }
    .home-title {
      font-size: clamp(34px, 5.5vw, 48px); font-weight: 900;
      letter-spacing: -0.03em; margin: 0; line-height: 1.1;
      color: #ffffff;
    }
    .home-subtitle {
      font-size: 15px; color: #94a3b8; font-weight: 500;
      max-width: 540px; margin: 0; line-height: 1.5;
    }

    /* ── Colored Gesture Cards (Each box in its true color) ── */
    .home-gestures-grid {
      width: 100%;
      display: grid; grid-template-columns: repeat(4, 1fr);
      gap: 14px;
    }
    @media (max-width: 680px) {
      .home-gestures-grid { grid-template-columns: repeat(2, 1fr); }
    }

    .home-gcard {
      border-radius: 14px; padding: 22px 14px 18px;
      display: flex; flex-direction: column; align-items: center;
      text-align: center; gap: 8px;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      cursor: default;
    }
    .home-gcard:hover {
      transform: translateY(-3px);
    }

    /* RED Card */
    .home-gcard-red {
      background: linear-gradient(150deg, #dc2626 0%, #991b1b 100%);
      border: 2px solid #f87171;
      box-shadow: 0 10px 28px rgba(220, 38, 38, 0.35);
    }
    .home-gcard-red .home-gcard-tag {
      background: rgba(0, 0, 0, 0.3); color: #fee2e2;
      border: 1px solid rgba(255, 255, 255, 0.25);
    }

    /* BLUE Card */
    .home-gcard-blue {
      background: linear-gradient(150deg, #2563eb 0%, #1e40af 100%);
      border: 2px solid #60a5fa;
      box-shadow: 0 10px 28px rgba(37, 99, 235, 0.35);
    }
    .home-gcard-blue .home-gcard-tag {
      background: rgba(0, 0, 0, 0.3); color: #dbeafe;
      border: 1px solid rgba(255, 255, 255, 0.25);
    }

    /* YELLOW Card */
    .home-gcard-yellow {
      background: linear-gradient(150deg, #d97706 0%, #92400e 100%);
      border: 2px solid #fbbf24;
      box-shadow: 0 10px 28px rgba(217, 119, 6, 0.35);
    }
    .home-gcard-yellow .home-gcard-tag {
      background: rgba(0, 0, 0, 0.3); color: #fef3c7;
      border: 1px solid rgba(255, 255, 255, 0.25);
    }

    /* GREEN Card */
    .home-gcard-green {
      background: linear-gradient(150deg, #16a34a 0%, #166534 100%);
      border: 2px solid #4ade80;
      box-shadow: 0 10px 28px rgba(22, 163, 74, 0.35);
    }
    .home-gcard-green .home-gcard-tag {
      background: rgba(0, 0, 0, 0.3); color: #dcfce7;
      border: 1px solid rgba(255, 255, 255, 0.25);
    }

    .home-gcard-tag {
      font-size: 11px; font-weight: 800; letter-spacing: 0.1em;
      text-transform: uppercase; padding: 4px 12px; border-radius: 99px;
    }
    .home-gcard-emoji {
      font-size: 40px; line-height: 1; margin: 4px 0;
    }
    .home-gcard-name {
      font-size: 14px; font-weight: 700; color: #ffffff;
      letter-spacing: -0.01em;
    }

    /* ── Challenge Brief ── */
    .home-brief {
      display: flex; align-items: center; justify-content: center;
      gap: 16px; font-size: 13px; font-weight: 600; color: #64748b;
      flex-wrap: wrap;
    }
    .home-brief-divider { color: #334155; }
    .home-brief-highlight { color: #94a3b8; font-weight: 700; }

    /* ── Action Button ── */
    .home-actions {
      display: flex; flex-direction: column; align-items: center;
      gap: 10px; width: 100%; max-width: 340px;
    }
    .home-btn-play {
      width: 100%;
      padding: 16px 0; border-radius: 12px; border: none;
      background: #ffffff; color: #090d16;
      font-size: 16px; font-weight: 800; font-family: inherit;
      cursor: pointer; letter-spacing: -0.01em;
      box-shadow: 0 6px 20px rgba(255, 255, 255, 0.15);
      transition: all 0.2s ease;
      display: flex; align-items: center; justify-content: center; gap: 8px;
    }
    .home-btn-play:hover {
      background: #f1f5f9;
      transform: translateY(-2px);
      box-shadow: 0 10px 28px rgba(255, 255, 255, 0.25);
    }
    .home-btn-play:active {
      transform: translateY(0);
    }

    .home-footer-note {
      font-size: 12px; color: #475569; font-weight: 500;
    }
  `;
  document.head.appendChild(s);
}

export function createHomeScreen() {
  injectHomeStyles();

  const ov = document.createElement('div');
  ov.id = 'home-overlay';

  ov.innerHTML = `
    <div class="home-container">
      <!-- Institutional Attribution -->
      <div class="home-header">
        <div class="home-org-badge">
          CSES • NIT WARANGAL • ML TEAM
        </div>
        <h1 class="home-title">Chromatic Reflex</h1>
        <p class="home-subtitle">
          Real-time computer vision reflex benchmark with accelerating round tempo.
        </p>
      </div>

      <!-- Colored Gesture Mapping Cards -->
      <div class="home-gestures-grid">
        <div class="home-gcard home-gcard-red">
          <span class="home-gcard-tag">RED</span>
          <span class="home-gcard-emoji">✌️</span>
          <span class="home-gcard-name">Two Fingers</span>
        </div>
        <div class="home-gcard home-gcard-blue">
          <span class="home-gcard-tag">BLUE</span>
          <span class="home-gcard-emoji">✊</span>
          <span class="home-gcard-name">Fist</span>
        </div>
        <div class="home-gcard home-gcard-yellow">
          <span class="home-gcard-tag">YELLOW</span>
          <span class="home-gcard-emoji">👍</span>
          <span class="home-gcard-name">Thumbs Up</span>
        </div>
        <div class="home-gcard home-gcard-green">
          <span class="home-gcard-tag">GREEN</span>
          <span class="home-gcard-emoji">☝️</span>
          <span class="home-gcard-name">Pointing</span>
        </div>
      </div>

      <!-- Quick Benchmark Info -->
      <div class="home-brief">
        <span class="home-brief-highlight">20 Timed Rounds</span>
        <span class="home-brief-divider">•</span>
        <span class="home-brief-highlight">Accelerating Speed (2.8s → 1.5s)</span>
        <span class="home-brief-divider">•</span>
        <span class="home-brief-highlight">Hand Tracking</span>
      </div>

      <!-- Action Button -->
      <div class="home-actions">
        <button class="home-btn-play" id="home-btn-play">
          Start Benchmark 🚀
        </button>
        <span class="home-footer-note">Webcam required • Stand 40–70 cm away</span>
      </div>
    </div>
  `;

  document.body.appendChild(ov);

  return {
    show(onPlay) {
      ov.classList.remove('home-hidden');
      const btn = document.getElementById('home-btn-play');
      btn.onclick = () => {
        playClick();
        ov.classList.add('home-hidden');
        onPlay?.();
      };
    },
    hide() {
      ov.classList.add('home-hidden');
    },
  };
}
