import { createHomeScreen }               from './ui/home.js';
import { runSetup }                         from './ui/setup.js';
import { createGameUI }                  from './ui/gameUI.js';
import { runCalibration }                from './game/calibration.js';
import { runGame }                       from './game/gameLoop.js';
import { initAudio, enableClickSounds }  from "./audio/soundManager.js";
enableClickSounds(); 

const video  = document.getElementById('video');
const canvas = document.getElementById('overlay');
const stage  = document.getElementById('stage');
const hud    = document.getElementById('hud');

async function main() {
  hud.textContent = '';

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

  let cachedTracker = null;

  function launchGameFlow() {
    homeScreen.show(async () => {
      initAudio();
      let ui = null;
      let exited = false;

      function handleExitToHome() {
        if (exited) return;
        exited = true;
        if (ui) {
          ui.destroy();
          ui = null;
        }
        launchGameFlow();
      }

      try {

        const setupResult = await runSetup(video, canvas);
        const { name, hand, tracker } = setupResult;
        cachedTracker = tracker;

        const baseline = await runCalibration(video, canvas, cachedTracker);

        ui = createGameUI(stage, hud, handleExitToHome);

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

