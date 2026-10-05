const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:8000/api';

// ─── Inject styles once ────────────────────────────────────────────────────
function injectLeaderboardStyles() {
  if (document.getElementById('lb-styles')) return;
  const s = document.createElement('style');
  s.id = 'lb-styles';
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');

    #lb-overlay {
      position: fixed; inset: 0; z-index: 200;
      background: #07090e;
      color: #f8fafc;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      overflow-y: auto;
      display: flex; flex-direction: column; align-items: center;
      padding: 32px 20px 48px;
      box-sizing: border-box;
    }
    #lb-overlay.lb-hidden { display: none; }

    .lb-wrap {
      width: 100%; max-width: 880px;
      display: flex; flex-direction: column;
      gap: 28px;
      animation: lb-fadein 0.35s ease both;
    }
    @keyframes lb-fadein {
      from { opacity: 0; transform: translateY(16px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* Top bar */
    .lb-topbar {
      display: flex; align-items: center; justify-content: space-between;
      gap: 12px; flex-wrap: wrap;
    }
    .lb-back-btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 9px 18px; border-radius: 10px; border: none;
      background: rgba(255,255,255,0.07); color: #94a3b8;
      font-size: 13px; font-weight: 700; font-family: inherit;
      cursor: pointer; letter-spacing: 0.01em;
      transition: background 0.18s, color 0.18s;
    }
    .lb-back-btn:hover { background: rgba(255,255,255,0.13); color: #f1f5f9; }
    .lb-title-group { display: flex; flex-direction: column; align-items: center; gap: 4px; }
    .lb-eyebrow {
      font-size: 11px; font-weight: 800; letter-spacing: 0.12em;
      text-transform: uppercase; color: #38bdf8;
    }
    .lb-main-title {
      font-size: clamp(22px, 4vw, 32px); font-weight: 900;
      letter-spacing: -0.03em; margin: 0; color: #fff;
    }
    .lb-spacer { width: 90px; }

    /* Controls row */
    .lb-controls {
      display: flex; gap: 12px; flex-wrap: wrap; align-items: center;
      justify-content: space-between;
    }
    .lb-limit-group { display: flex; align-items: center; gap: 8px; }
    .lb-limit-label {
      font-size: 12px; font-weight: 700; color: #64748b;
      text-transform: uppercase; letter-spacing: 0.07em;
    }
    .lb-limit-pills { display: flex; gap: 6px; }
    .lb-pill {
      padding: 6px 14px; border-radius: 8px; border: 1.5px solid #1e293b;
      background: transparent; color: #64748b;
      font-size: 12px; font-weight: 800; font-family: inherit;
      cursor: pointer; transition: all 0.15s;
    }
    .lb-pill:hover { border-color: #38bdf8; color: #38bdf8; }
    .lb-pill.active { border-color: #38bdf8; background: rgba(56,189,248,0.12); color: #7dd3fc; }

    /* Search */
    .lb-search-wrap {
      display: flex; align-items: center; gap: 8px; flex: 1;
      min-width: 200px; max-width: 300px;
    }
    .lb-search-input {
      flex: 1; padding: 9px 14px; border-radius: 10px;
      border: 1.5px solid #1e293b;
      background: rgba(255,255,255,0.04); color: #f1f5f9;
      font-size: 13px; font-weight: 600; font-family: inherit;
      outline: none; transition: border-color 0.18s, box-shadow 0.18s;
    }
    .lb-search-input::placeholder { color: #475569; }
    .lb-search-input:focus {
      border-color: #38bdf8; box-shadow: 0 0 0 3px rgba(56,189,248,0.12);
    }
    .lb-search-btn {
      padding: 9px 16px; border-radius: 10px; border: none;
      background: linear-gradient(135deg, #0ea5e9, #6366f1);
      color: #fff; font-size: 13px; font-weight: 800; font-family: inherit;
      cursor: pointer; white-space: nowrap;
      transition: opacity 0.18s, transform 0.15s;
    }
    .lb-search-btn:hover { opacity: 0.88; transform: translateY(-1px); }
    .lb-search-btn:active { transform: translateY(0); }

    /* Found card */
    .lb-found-card {
      display: none; border-radius: 14px; padding: 18px 22px;
      background: linear-gradient(135deg, rgba(56,189,248,0.07), rgba(99,102,241,0.07));
      border: 1.5px solid rgba(56,189,248,0.3);
      animation: lb-fadein 0.25s ease both;
    }
    .lb-found-card.visible { display: block; }
    .lb-found-title {
      font-size: 10px; font-weight: 800; letter-spacing: 0.12em;
      text-transform: uppercase; color: #38bdf8; margin-bottom: 12px;
    }
    .lb-found-row { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
    .lb-found-rank {
      font-size: 30px; font-weight: 900; min-width: 56px;
      background: linear-gradient(135deg, #facc15, #fb923c);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .lb-found-name { font-size: 18px; font-weight: 800; color: #f1f5f9; }
    .lb-found-stats { display: flex; gap: 22px; flex-wrap: wrap; margin-top: 6px; }
    .lb-found-stat { display: flex; flex-direction: column; gap: 2px; }
    .lb-found-stat-label {
      font-size: 10px; font-weight: 700; color: #475569;
      text-transform: uppercase; letter-spacing: 0.08em;
    }
    .lb-found-stat-val { font-size: 15px; font-weight: 800; color: #e2e8f0; }

    .lb-not-found {
      display: none; text-align: center; padding: 12px;
      color: #f87171; font-size: 13px; font-weight: 700;
      background: rgba(239,68,68,0.07); border: 1.5px solid rgba(239,68,68,0.2);
      border-radius: 10px; animation: lb-fadein 0.25s ease both;
    }
    .lb-not-found.visible { display: block; }

    /* Table */
    .lb-table-wrap {
      border-radius: 16px; overflow: hidden;
      border: 1.5px solid #1e293b;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    }
    .lb-table { width: 100%; border-collapse: collapse; }
    .lb-table thead tr { background: #0f172a; }
    .lb-table thead th {
      padding: 12px 16px; text-align: left;
      font-size: 10px; font-weight: 800; letter-spacing: 0.12em;
      text-transform: uppercase; color: #475569;
      border-bottom: 1px solid #1e293b;
    }
    .lb-table thead th.right { text-align: right; }
    .lb-table tbody tr {
      border-bottom: 1px solid #0f172a;
      transition: background 0.15s;
    }
    .lb-table tbody tr:last-child { border-bottom: none; }
    .lb-table tbody tr:hover { background: rgba(255,255,255,0.03); }
    .lb-table tbody tr.lb-highlighted {
      background: rgba(56,189,248,0.08) !important;
      outline: 1.5px solid rgba(56,189,248,0.3);
    }
    .lb-table td {
      padding: 13px 16px; font-size: 13px; color: #cbd5e1;
      animation: lb-row-in 0.35s ease both;
    }
    .lb-table td.right { text-align: right; }
    @keyframes lb-row-in {
      from { opacity: 0; transform: translateX(-6px); }
      to   { opacity: 1; transform: translateX(0); }
    }

    /* Rank badge */
    .lb-rank {
      display: inline-flex; align-items: center; justify-content: center;
      width: 32px; height: 32px; border-radius: 8px;
      font-size: 13px; font-weight: 900;
    }
    .lb-rank-1 { background: linear-gradient(135deg,#facc15,#f59e0b); color:#422006; box-shadow:0 4px 12px rgba(251,191,36,.4); }
    .lb-rank-2 { background: linear-gradient(135deg,#cbd5e1,#94a3b8); color:#0f172a; box-shadow:0 4px 10px rgba(148,163,184,.3); }
    .lb-rank-3 { background: linear-gradient(135deg,#fb923c,#c2410c); color:#fff; box-shadow:0 4px 10px rgba(249,115,22,.35); }
    .lb-rank-other { background: rgba(255,255,255,0.05); color:#64748b; }

    .lb-player-name { font-weight: 800; color: #f1f5f9; font-size: 14px; }
    .lb-player-hand {
      display: inline-block; font-size: 9px; font-weight: 700;
      letter-spacing: 0.08em; text-transform: uppercase;
      padding: 2px 6px; border-radius: 4px;
      background: rgba(255,255,255,0.06); color: #64748b; margin-left: 6px;
    }
    .lb-score { font-weight: 900; font-size: 15px; color: #f8fafc; }
    .lb-acc-wrap { display: flex; align-items: center; gap: 8px; }
    .lb-acc-bar-bg { flex: 1; height: 5px; border-radius: 99px; background: #1e293b; max-width: 70px; }
    .lb-acc-bar-fill {
      height: 100%; border-radius: 99px;
      background: linear-gradient(90deg,#22d3ee,#6366f1);
      transition: width 0.6s ease;
    }
    .lb-acc-val { font-weight: 700; color: #94a3b8; font-size: 12px; white-space: nowrap; }
    .lb-rt { font-weight: 700; color: #94a3b8; font-size: 12px; }
    .lb-rt-null { color: #334155; }
    .lb-streak { font-weight: 800; color: #fbbf24; font-size: 13px; }

    /* Status boxes */
    .lb-status-box { text-align: center; padding: 48px 20px; color: #64748b; font-size: 14px; font-weight: 600; }
    .lb-status-icon { font-size: 40px; margin-bottom: 12px; }

    /* Refresh */
    .lb-refresh-btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 9px 18px; border-radius: 10px; border: 1.5px solid #1e293b;
      background: transparent; color: #64748b;
      font-size: 12px; font-weight: 800; font-family: inherit;
      cursor: pointer; transition: all 0.18s;
    }
    .lb-refresh-btn:hover { border-color: #38bdf8; color: #38bdf8; }
    .lb-refresh-btn.spinning .lb-refresh-icon { display: inline-block; animation: lb-spin 0.7s linear infinite; }
    @keyframes lb-spin { to { transform: rotate(360deg); } }

    .lb-footer { text-align: center; font-size: 11px; color: #334155; font-weight: 600; }

    @media (max-width: 600px) {
      .lb-table thead th:nth-child(4), .lb-table td:nth-child(4) { display: none; }
      .lb-table thead th:nth-child(5), .lb-table td:nth-child(5) { display: none; }
    }
  `;
  document.head.appendChild(s);
}

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function rankBadge(rank) {
  const cls = rank === 1 ? 'lb-rank-1' : rank === 2 ? 'lb-rank-2' : rank === 3 ? 'lb-rank-3' : 'lb-rank-other';
  const label = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
  return `<span class="lb-rank ${cls}">${label}</span>`;
}

function fmtRt(ms) {
  if (ms == null) return `<span class="lb-rt lb-rt-null">—</span>`;
  return `<span class="lb-rt">${ms.toFixed(0)} ms</span>`;
}

function accBar(acc) {
  const pct = Math.round(acc ?? 0);
  return `<div class="lb-acc-wrap">
    <div class="lb-acc-bar-bg"><div class="lb-acc-bar-fill" style="width:${pct}%"></div></div>
    <span class="lb-acc-val">${pct}%</span>
  </div>`;
}

function buildRow(row, highlighted) {
  return `
    <tr${highlighted ? ' class="lb-highlighted"' : ''}>
      <td>${rankBadge(row.rank)}</td>
      <td><span class="lb-player-name">${escHtml(row.player_name)}</span><span class="lb-player-hand">${escHtml(row.player_hand ?? '')}</span></td>
      <td class="right"><span class="lb-score">${row.score}</span></td>
      <td>${accBar(row.accuracy)}</td>
      <td class="right">${fmtRt(row.best_rt)}</td>
      <td class="right">${fmtRt(row.avg_rt)}</td>
      <td class="right"><span class="lb-streak">🔥 ${row.streak ?? 0}</span></td>
    </tr>`;
}

async function fetchLeaderboard(limit) {
  const res = await fetch(`${API_BASE_URL}/leaderboard?limit=${limit}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchPlayer(name) {
  const res = await fetch(`${API_BASE_URL}/player/${encodeURIComponent(name.trim())}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function createLeaderboardScreen() {
  injectLeaderboardStyles();

  const ov = document.createElement('div');
  ov.id = 'lb-overlay';
  ov.classList.add('lb-hidden');
  document.body.appendChild(ov);

  ov.innerHTML = `
    <div class="lb-wrap">
      <div class="lb-topbar">
        <button class="lb-back-btn" id="lb-back-btn">← Back</button>
        <div class="lb-title-group">
          <span class="lb-eyebrow">Chromatic Reflex</span>
          <h1 class="lb-main-title">🏆 Leaderboard</h1>
        </div>
        <div class="lb-spacer"></div>
      </div>

      <div class="lb-controls">
        <div class="lb-limit-group">
          <span class="lb-limit-label">Show top</span>
          <div class="lb-limit-pills" id="lb-limit-pills">
            <button class="lb-pill" data-limit="5">5</button>
            <button class="lb-pill active" data-limit="10">10</button>
            <button class="lb-pill" data-limit="25">25</button>
            <button class="lb-pill" data-limit="50">50</button>
          </div>
        </div>
        <div class="lb-search-wrap">
          <input class="lb-search-input" id="lb-search-input"
            type="text" placeholder="Search player name…" maxlength="50" />
          <button class="lb-search-btn" id="lb-search-btn">Find Rank</button>
        </div>
        <button class="lb-refresh-btn" id="lb-refresh-btn">
          <span class="lb-refresh-icon">⟳</span> Refresh
        </button>
      </div>

      <div class="lb-found-card" id="lb-found-card">
        <div class="lb-found-title">Player Found</div>
        <div class="lb-found-row">
          <div class="lb-found-rank" id="lb-found-rank">#?</div>
          <div>
            <div class="lb-found-name" id="lb-found-name">—</div>
            <div class="lb-found-stats" id="lb-found-stats"></div>
          </div>
        </div>
      </div>
      <div class="lb-not-found" id="lb-not-found">❌ Player not found on the leaderboard.</div>

      <div class="lb-table-wrap" id="lb-table-wrap">
        <div class="lb-status-box"><div class="lb-status-icon">⏳</div>Loading leaderboard…</div>
      </div>

      <div class="lb-footer">Best session per player · Ranked by Score ↓ then Avg RT ↑</div>
    </div>
  `;

  let currentLimit = 10;
  let currentData = [];
  let highlightedName = '';
  let onCloseCallback = null;

  const tableWrap   = ov.querySelector('#lb-table-wrap');
  const pillsWrap   = ov.querySelector('#lb-limit-pills');
  const searchInput = ov.querySelector('#lb-search-input');
  const searchBtn   = ov.querySelector('#lb-search-btn');
  const refreshBtn  = ov.querySelector('#lb-refresh-btn');
  const backBtn     = ov.querySelector('#lb-back-btn');
  const foundCard   = ov.querySelector('#lb-found-card');
  const notFound    = ov.querySelector('#lb-not-found');
  const foundRank   = ov.querySelector('#lb-found-rank');
  const foundName   = ov.querySelector('#lb-found-name');
  const foundStats  = ov.querySelector('#lb-found-stats');

  function renderTable(data) {
    if (!data.length) {
      tableWrap.innerHTML = `<div class="lb-status-box"><div class="lb-status-icon">📭</div>No sessions yet. Play a game first!</div>`;
      return;
    }
    const lowerHL = highlightedName.toLowerCase();
    const rows = data.map(r => buildRow(r, lowerHL && r.player_name.toLowerCase() === lowerHL)).join('');
    tableWrap.innerHTML = `
      <table class="lb-table">
        <thead><tr>
          <th style="width:46px">#</th>
          <th>Player</th>
          <th class="right">Score</th>
          <th>Accuracy</th>
          <th class="right">Best RT</th>
          <th class="right">Avg RT</th>
          <th class="right">Streak</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  function hideSearchResult() {
    foundCard.classList.remove('visible');
    notFound.classList.remove('visible');
    highlightedName = '';
  }

  async function loadLeaderboard() {
    tableWrap.innerHTML = `<div class="lb-status-box"><div class="lb-status-icon">⏳</div>Loading leaderboard…</div>`;
    refreshBtn.classList.add('spinning');
    try {
      currentData = await fetchLeaderboard(currentLimit);
      renderTable(currentData);
    } catch (e) {
      tableWrap.innerHTML = `<div class="lb-status-box"><div class="lb-status-icon">⚠️</div>Could not reach backend. Is the server running?</div>`;
    } finally {
      refreshBtn.classList.remove('spinning');
    }
  }

  async function handleSearch() {
    const name = searchInput.value.trim();
    if (!name) { hideSearchResult(); renderTable(currentData); return; }

    const inSlice = currentData.find(r => r.player_name.toLowerCase() === name.toLowerCase());
    let playerData = null;
    try { playerData = await fetchPlayer(name); } catch {}

    if (!playerData) {
      notFound.classList.add('visible');
      foundCard.classList.remove('visible');
      highlightedName = '';
      renderTable(currentData);
      return;
    }

    notFound.classList.remove('visible');
    const sessions = playerData.sessions || [];
    const best = sessions.reduce((top, s) => (!top || s.score > top.score ? s : top), null);
    const rankStr = inSlice ? `#${inSlice.rank}` : `≥ #${currentLimit + 1}`;

    foundRank.textContent = rankStr;
    foundName.textContent = playerData.player;
    foundStats.innerHTML = `
      <div class="lb-found-stat"><span class="lb-found-stat-label">Best Score</span><span class="lb-found-stat-val">${best?.score ?? '—'}</span></div>
      <div class="lb-found-stat"><span class="lb-found-stat-label">Accuracy</span><span class="lb-found-stat-val">${best?.accuracy != null ? Math.round(best.accuracy) + '%' : '—'}</span></div>
      <div class="lb-found-stat"><span class="lb-found-stat-label">Best RT</span><span class="lb-found-stat-val">${best?.best_rt != null ? best.best_rt.toFixed(0) + ' ms' : '—'}</span></div>
      <div class="lb-found-stat"><span class="lb-found-stat-label">Sessions</span><span class="lb-found-stat-val">${sessions.length}</span></div>
    `;
    foundCard.classList.add('visible');
    highlightedName = inSlice ? name : '';
    renderTable(currentData);
  }

  pillsWrap.addEventListener('click', (e) => {
    const pill = e.target.closest('.lb-pill');
    if (!pill) return;
    pillsWrap.querySelectorAll('.lb-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    currentLimit = parseInt(pill.dataset.limit);
    loadLeaderboard();
  });

  searchBtn.addEventListener('click', handleSearch);
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSearch();
    if (e.key === 'Escape') { hideSearchResult(); searchInput.value = ''; renderTable(currentData); }
  });

  refreshBtn.addEventListener('click', () => {
    hideSearchResult();
    searchInput.value = '';
    loadLeaderboard();
  });

  backBtn.addEventListener('click', () => {
    ov.classList.add('lb-hidden');
    onCloseCallback?.();
  });

  return {
    show(onClose) {
      onCloseCallback = onClose;
      ov.classList.remove('lb-hidden');
      highlightedName = '';
      searchInput.value = '';
      hideSearchResult();
      pillsWrap.querySelectorAll('.lb-pill').forEach(p => {
        p.classList.toggle('active', p.dataset.limit === '10');
      });
      currentLimit = 10;
      loadLeaderboard();
    },
    hide() { ov.classList.add('lb-hidden'); },
  };
}
