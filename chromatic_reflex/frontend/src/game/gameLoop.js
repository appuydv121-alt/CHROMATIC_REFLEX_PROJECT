import { classifyGesture, getGestureConfidence } from '../gesture/gestureClassifier.js';
import { drawHand } from '../hands/overlay.js';
import { playCorrect, playWrong, playCompletion } from '../audio/soundManager.js';
import { sendSessionToBackend } from '../api/apiService.js';

const COLOR_GESTURE_MAP = {
  RED:    'two_fingers',
  BLUE:   'fist',
  YELLOW: 'thumbs_up',
  GREEN:  'point',
};
const COLORS          = Object.keys(COLOR_GESTURE_MAP);   
const TOTAL_ROUNDS    = 20;
export const CONFIRM_N       = 5;       
export const CONFIRM_WRONG_N = 6;       
const CONF_THRESH     = 0.65;    
export const FEEDBACK_MS     = 1600;    
const ARM_HOLD_MS     = 500;     
const DELAY_MIN_MS    = 1000;    
const DELAY_MAX_MS    = 3000;    
const SCORE_BASE      = 10;      

function getRoundTimeout(roundIdx, totalRounds) {
  const startMs = 2800;
  const endMs   = 1500;
  const t = Math.min(1, Math.max(0, roundIdx / Math.max(1, totalRounds - 1)));
  return Math.round(startMs - t * (startMs - endMs));
}

const MAPPED = new Set(Object.values(COLOR_GESTURE_MAP));
function isRest(label) { return !MAPPED.has(label); }

export function runGame(videoEl, canvasEl, tracker, playerInfo, _baseline, ui, onExit) {
  return new Promise((resolve) => {
    const ctx = canvasEl.getContext('2d');
    let rafId = null;
    let isTerminated = false;

    const stats = {
      score: 0, correct: 0, total: 0,
      reactionTimes: [], longestStreak: 0,
    };
    let streak = 0;

    const roundHistory = [];

    let roundIdx   = 0;
    let state      = 'ARM';    
    let stateStart = performance.now();

    let currentColor   = pickColor();
    let targetGesture  = COLOR_GESTURE_MAP[currentColor];
    let cueTriggeredAt = -1;   
    let t0             = -1;   

    let runLabel  = null;   
    let runCount  = 0;      
    let runStart  = -1;     

    function handleExit() {
      if (isTerminated) return;
      isTerminated = true;
      if (rafId) cancelAnimationFrame(rafId);
      ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
      ui.hideFeedback();
      resolve({ exit: true, stats });
      onExit?.();
    }
    ui.setExitHandler(handleExit);

    ui.setPlayerName(playerInfo.name);
    ui.setRound(1, TOTAL_ROUNDS);
    ui.setScore(0);
    ui.setStreak(0);
    if (ui.updateLiveStats) {
      ui.updateLiveStats(stats, streak, 1, TOTAL_ROUNDS);
    }
    ui.showArm();

    function loop() {
      if (isTerminated) return;
      if (videoEl.readyState < 2) { rafId = requestAnimationFrame(loop); return; }

      const now = performance.now();
      const det = tracker.detect(videoEl);
      ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
      const activeColor = ui.getStageColor ? ui.getStageColor() : '#38bdf8';
      if (det.landmarks) drawHand(ctx, det.landmarks, activeColor);

      const label = classifyGesture(det.landmarks);
      const conf  = getGestureConfidence(det.landmarks, label);

      switch (state) {

        case 'ARM': {
          if (ui.updateDetection) ui.updateDetection(label, 0);
          if (isRest(label)) {
            if (now - stateStart >= ARM_HOLD_MS) {

              const delay = DELAY_MIN_MS + Math.random() * (DELAY_MAX_MS - DELAY_MIN_MS);
              cueTriggeredAt = now + delay;
              transitionTo('DELAY', now);
              ui.showDelay();
            }
          } else {
            stateStart = now; 
          }
          break;
        }

        case 'DELAY': {
          if (ui.updateDetection) ui.updateDetection(label, 0);
          if (isMapped(label) && conf >= CONF_THRESH) {

            transitionTo('ARM', now);
            ui.showFalseStart();
            setTimeout(() => { if (state === 'ARM' && !isTerminated) ui.showArm(); }, 1200);
          } else if (now >= cueTriggeredAt) {

            const currentTimeout = getRoundTimeout(roundIdx, TOTAL_ROUNDS);
            t0 = now;
            runLabel = null; runCount = 0; runStart = -1;
            transitionTo('CUE', now);
            ui.showCue(currentColor, currentTimeout);
          }
          break;
        }

        case 'CUE': {
          const currentTimeout = getRoundTimeout(roundIdx, TOTAL_ROUNDS);

          if (now - t0 >= currentTimeout) {
            if (ui.updateDetection) ui.updateDetection(label, 0);
            recordResult('timeout', null, currentColor, targetGesture, null);
            transitionTo('FEEDBACK', now);
            ui.showFeedback('timeout', null, targetGesture, null);
            break;
          }

          const isTarget  = label === targetGesture && conf >= CONF_THRESH;
          const isWrong   = isMapped(label)          && conf >= CONF_THRESH && label !== targetGesture;

          if (isTarget || isWrong) {
            if (label === runLabel) {
              runCount++;
              if (runCount === 1) runStart = now;
              const threshold = isTarget ? CONFIRM_N : CONFIRM_WRONG_N;
              const progress = Math.min(1, runCount / threshold);
              if (ui.updateDetection) ui.updateDetection(label, progress);

              if (runCount >= threshold) {
                const rt = runStart - t0;
                if (ui.updateDetection) ui.updateDetection(label, 1);
                if (isTarget) {
                  playCorrect();
                  recordResult('correct', rt, currentColor, targetGesture, label);
                  ui.showFeedback('correct', rt, targetGesture, label);
                } else {
                  playWrong();
                  recordResult('wrong', rt, currentColor, targetGesture, label);
                  ui.showFeedback('wrong', rt, targetGesture, label);
                }
                transitionTo('FEEDBACK', now);
              }
            } else {
              runLabel = label;
              runCount = 1;
              runStart = now;
              const threshold = isTarget ? CONFIRM_N : CONFIRM_WRONG_N;
              if (ui.updateDetection) ui.updateDetection(label, Math.min(1, 1 / threshold));
            }
          } else {

            if (label !== runLabel) {
              runLabel = label;
              runCount = 0;
              runStart = -1;
            }
            if (ui.updateDetection) ui.updateDetection(label, 0);
          }
          break;
        }

        case 'FEEDBACK': {
          if (ui.updateDetection) ui.updateDetection(label, 0);
          if (now - stateStart >= FEEDBACK_MS) {
            ui.hideFeedback();
            roundIdx++;
            if (roundIdx >= TOTAL_ROUNDS) {

              isTerminated = true;
              cancelAnimationFrame(rafId);
              ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
              playCompletion();

              sendSessionToBackend(playerInfo, stats, roundHistory);

              ui.showResults(
                stats,
                playerInfo,
                roundHistory,
                () => resolve({ restart: true, stats }),
                () => { resolve({ exit: true, stats }); onExit?.(); }
              );
              return;
            }

            currentColor  = pickColor();
            targetGesture = COLOR_GESTURE_MAP[currentColor];
            runLabel = null; runCount = 0; runStart = -1;
            transitionTo('ARM', now);
            ui.setRound(roundIdx + 1, TOTAL_ROUNDS);
            if (ui.updateLiveStats) {
              ui.updateLiveStats(stats, streak, roundIdx + 1, TOTAL_ROUNDS);
            }
            ui.showArm();
          }
          break;
        }
      }

      rafId = requestAnimationFrame(loop);
    }

    rafId = requestAnimationFrame(loop);

    function transitionTo(newState, now) {
      state = newState;
      stateStart = now;
    }

    function isMapped(label) { return MAPPED.has(label); }

    function pickColor() {
      return COLORS[Math.floor(Math.random() * COLORS.length)];
    }

    function recordResult(outcome, rt, color, target, detected) {
      stats.total++;
      roundHistory.push({ outcome, rt, color, target, detected });

      if (outcome === 'correct') {
        streak++;
        stats.correct++;
        stats.longestStreak = Math.max(stats.longestStreak, streak);
        if (rt != null) stats.reactionTimes.push(rt);

        const bonus = Math.floor(streak / 3) * 5;
        stats.score += SCORE_BASE + bonus;
      } else {
        streak = 0;
      }

      ui.setScore(stats.score);
      ui.setStreak(streak);
      if (ui.updateLiveStats) {
        ui.updateLiveStats(stats, streak, roundIdx + 1, TOTAL_ROUNDS);
      }
    }
  });
}

