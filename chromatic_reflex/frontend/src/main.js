// src/main.js
// Main entry point orchestrating:
//   1. CSES NIT Warangal ML Team Home / Landing Screen
//   2. Player Setup (name, hand, camera, guide box)
//   3. Practice & Baseline Calibration
//   4. Round-based Game Loop (with in-game & results Exit options)

import { createHomeScreen }               from './ui/home.js';
import { runSetup, createMappingWidget } from './ui/setup.js';
import { createGameUI }                  from './ui/gameUI.js';
import { runCalibration }                from './game/calibration.js';
import { runGame }                       from './game/gameLoop.js';
import { initAudio, enableClickSounds }  from "./audio/soundManager.js";
enableClickSounds(); // every button now makes the click sound, and audio is unlocked on first press

const video  = document.getElementById('video');
const canvas = document.getElementById('overlay');
const stage  = document.getElementById('stage');
const hud    = document.getElementById('hud');

async function main() {
  hud.textContent = '';

  // Resume/initialize audio on first user gesture anywhere
  const onFirstInteraction = () => {
    initAudio();
    window.removeEventListener('click', onFirstInteraction);
    window.removeEventListener('keydown', onFirstInteraction);
    window.removeEventListener('touchstart', onFirstInteraction);
  };
  window.addEventListener('click', onFirstInteraction);
  window.addEventListener('keydown', onFirstInteraction);
  window.addEventListener('touchstart', onFirstInteraction);

  const homeScreen = createHomeScreen();

  // Cached tracker instance so MediaPipe model is only downloaded once
  let cachedTracker = null;

  function launchGameFlow() {
    homeScreen.show(async () => {
      initAudio();
      let ui = null;
      let mapWidget = null;
      let exited = false;

      function handleExitToHome() {
        if (exited) return;
        exited = true;
        if (ui) {
          ui.destroy();
          ui = null;
        }
        if (mapWidget) {
          mapWidget.hide();
          mapWidget = null;
        }
        launchGameFlow();
      }

      try {
        // ── Step 1: Setup ───────────────────────────────────────────────────
        const setupResult = await runSetup(video, canvas);
        const { name, hand, tracker } = setupResult;
        cachedTracker = tracker;

        // ── Step 2: Calibration ─────────────────────────────────────────────
        const baseline = await runCalibration(video, canvas, cachedTracker);

        // ── Step 3: Game UI with Exit handler ───────────────────────────────
        ui = createGameUI(stage, hud, handleExitToHome);

        // Show mapping reminder before first round
        mapWidget = createMappingWidget();
        mapWidget.autoShow(4000);

        // ── Step 4: Game Loop (20 rounds) ───────────────────────────────────
        let keepPlaying = true;
        while (keepPlaying && !exited) {
          const result = await runGame(
            video,
            canvas,
            cachedTracker,
            { name, hand },
            baseline,
            ui,
            handleExitToHome
          );

          if (result?.exit) {
            handleExitToHome();
            break;
          }
          keepPlaying = result?.restart ?? false;
        }
      } catch (err) {
        console.error("Game flow error:", err);
        if (ui) {
          try { ui.destroy(); } catch {}
          ui = null;
        }
        if (mapWidget) {
          try { mapWidget.hide(); } catch {}
          mapWidget = null;
        }
        hud.style.display = 'block';
        hud.innerHTML = `
          <div style="background:#1e1b4b;border:2px solid #ef4444;padding:20px;border-radius:14px;color:#f8fafc;max-width:560px;margin-top:20px;box-shadow:0 12px 30px rgba(0,0,0,0.5);font-family:sans-serif;">
            <div style="font-weight:900;font-size:17px;color:#f87171;margin-bottom:8px;">⚠️ Game Flow Error</div>
            <div style="font-family:monospace;font-size:13px;white-space:pre-wrap;color:#fca5a5;background:rgba(0,0,0,0.4);padding:10px;border-radius:8px;max-height:200px;overflow-y:auto;">${err?.stack || err?.message || String(err)}</div>
            <button id="err-home-btn" style="margin-top:16px;padding:10px 20px;border-radius:10px;border:none;background:#ef4444;color:#fff;font-weight:700;cursor:pointer;font-family:inherit;">Return to Home Screen</button>
          </div>
        `;
        document.getElementById('err-home-btn')?.addEventListener('click', () => {
          hud.innerHTML = '';
          hud.style.display = 'none';
          handleExitToHome();
        });
      }
    });
  }

  launchGameFlow();
}

main().catch((e) => {
  hud.style.display = 'block';
  hud.textContent = 'Error: ' + e.message;
  console.error(e);
});
