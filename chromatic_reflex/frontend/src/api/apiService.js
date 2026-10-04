const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:8000/api';

export function buildSessionPayload(playerInfo, stats, roundHistory) {
  const total = stats.total || 0;
  const correct = stats.correct || 0;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  const rts = stats.reactionTimes || [];
  const avgRt = rts.length > 0
    ? Number((rts.reduce((a, b) => a + b, 0) / rts.length).toFixed(1))
    : null;
  const bestRt = rts.length > 0
    ? Number(Math.min(...rts).toFixed(1))
    : null;

  return {
    player: {
      name: (playerInfo?.name || 'Anonymous').trim(),
      hand: playerInfo?.hand || 'right',
    },
    summary: {
      score: stats.score || 0,
      total_rounds: total,
      correct_rounds: correct,
      accuracy_percent: accuracy,
      avg_reaction_time_ms: avgRt,
      best_reaction_time_ms: bestRt,
      longest_streak: stats.longestStreak || 0,
    },
    rounds: (roundHistory || []).map((r, idx) => ({
      round_number: idx + 1,
      color: r.color || 'UNKNOWN',
      target_gesture: r.target || 'none',
      detected_gesture: r.detected || null,
      outcome: r.outcome || 'timeout', 
      reaction_time_ms: r.rt != null ? Number(r.rt.toFixed(1)) : null,
    })),
    client_timestamp: new Date().toISOString(),
  };
}

export async function sendSessionToBackend(playerInfo, stats, roundHistory) {
  const payload = buildSessionPayload(playerInfo, stats, roundHistory);

  try {
    localStorage.setItem('chromatic_last_session', JSON.stringify(payload));
  } catch (e) {

  }

  console.log('📤 [Chromatic Reflex] Prepared session payload to send:', payload);

  try {

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${API_BASE_URL}/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody.detail || `HTTP ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ [Chromatic Reflex] Session successfully saved by backend:', data);
    return data;
  } catch (err) {
    if (err.name === 'AbortError') {
      console.warn('⚠️ [Chromatic Reflex] Backend request timed out after 5s (backend not running yet).');
    } else {
      console.warn('⚠️ [Chromatic Reflex] Backend connection failed (backend not running yet):', err.message);
    }
    console.info('💡 Note: Game completed normally. Payload is cached in localStorage ("chromatic_last_session").');
    return null;
  }
}

export function getLastSavedSession() {
  try {
    const raw = localStorage.getItem('chromatic_last_session');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

