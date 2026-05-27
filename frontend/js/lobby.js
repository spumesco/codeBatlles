/* ────────────────────────────────────────────────────────────
   lobby.js — 인증 페이지 공용 로비 WebSocket + 매칭 진행 플로터

   목적:
     - 페이지 이동에도 끊기지 않는 매칭 상태 유지(localStorage)
     - 모든 페이지에서 동작하는 하단 우측 "매칭 진행 중" 플로터
     - /ws/lobby 단일 WS 연결 + 자동 재연결 + 25초 ping
     - 메시지 수신 시 custom event 로 위임 (페이지별 모듈이 구독)

   사용:
     Lobby.startMatching('auto')                 — 자동 매칭 진입
     Lobby.startMatching('request', '닉네임', 'user_id')
     Lobby.setMatchingRequestId(id)              — 신청 요청 ID 저장
     Lobby.cancelMatching()                      — 서버 취소 + 상태 클리어
     Lobby.stopMatching()                        — 클라이언트 상태만 클리어
     Lobby.isMatching() / Lobby.getMatchingState()
     window.addEventListener('lobby:match_found',    e => ...)
     window.addEventListener('lobby:battle_request', e => ...)
     window.addEventListener('lobby:battle_rejected',e => ...)
──────────────────────────────────────────────────────────── */

(function () {
  if (window.Lobby) return;  /* 중복 로드 방지 */

  const STORAGE_KEY = 'matching_state';
  const SUPPRESS_PATHS = ['/matching', '/battle', '/login', '/register', '/result'];

  let ws = null;
  let reconnectTimer = null;
  let heartbeatTimer = null;
  let floaterTickTimer = null;
  let stopped = false;          /* 토큰 없거나 명시적으로 stop */

  /* ── 토큰 헬퍼 ── */
  function token() {
    if (typeof getToken === 'function') return getToken();
    return sessionStorage.getItem('access_token') || localStorage.getItem('access_token');
  }

  /* ── 상태 저장 ── */
  function readState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) { return null; }
  }
  function writeState(state) {
    if (state) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    else       localStorage.removeItem(STORAGE_KEY);
    updateFloater();
  }

  /* ── 공개 API ── */
  const Lobby = {
    startMatching(mode, opponent, targetUserId) {
      writeState({
        active: true,
        mode: mode || 'auto',
        opponent: opponent || '',
        targetUserId: targetUserId || '',
        requestId: null,
        startedAt: Date.now(),
      });
    },
    setMatchingRequestId(id) {
      const s = readState();
      if (!s) return;
      s.requestId = id;
      writeState(s);
    },
    stopMatching() {
      writeState(null);
    },
    async cancelMatching() {
      const s = readState();
      writeState(null);
      if (!s) return;
      try {
        if (s.mode === 'request' && s.requestId) {
          await apiRequest(`/match/request/${s.requestId}`, { method: 'DELETE' });
        } else if (s.mode === 'auto') {
          await apiRequest('/match/queue', { method: 'DELETE' });
        }
      } catch (err) {
        console.warn('[lobby] cancel failed:', err.message);
      }
    },
    isMatching() {
      const s = readState();
      return !!(s && s.active);
    },
    getMatchingState() { return readState(); },
    /* 강제 재연결 — 필요 시 디버그용 */
    reconnect() { closeWs(); connect(); },
  };
  window.Lobby = Lobby;

  /* ── WS ── */
  function wsUrl(path) {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${location.host}${path}`;
  }

  function closeWs() {
    if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
    if (ws) {
      try { ws.onclose = null; ws.close(); } catch (_) {}
      ws = null;
    }
  }

  function scheduleReconnect() {
    if (reconnectTimer || stopped) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      if (!stopped && token()) connect();
    }, 3000);
  }

  function connect() {
    const t = token();
    if (!t) return;
    closeWs();

    const sock = new WebSocket(wsUrl(`/ws/lobby?token=${encodeURIComponent(t)}`));
    ws = sock;

    sock.onopen = () => {
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      heartbeatTimer = setInterval(() => {
        if (sock.readyState === WebSocket.OPEN) {
          try { sock.send('ping'); } catch (_) {}
        }
      }, 25000);
      window.dispatchEvent(new CustomEvent('lobby:open'));
    };

    sock.onmessage = (event) => {
      if (event.data === 'pong') return;
      let data;
      try { data = JSON.parse(event.data); }
      catch (_) { return; }

      if (data.type === 'match_found') {
        /* 매칭 완료 → 항상 배틀 페이지로 이동, 어느 페이지에 있든 */
        Lobby.stopMatching();
        window.dispatchEvent(new CustomEvent('lobby:match_found', { detail: data }));
        if (location.pathname !== '/battle') {
          window.location.href = `/battle?battle_id=${data.battle_id}`;
        }
      } else if (data.type === 'battle_rejected') {
        Lobby.stopMatching();
        window.dispatchEvent(new CustomEvent('lobby:battle_rejected', { detail: data }));
        alert(data.message || '상대방이 배틀 신청을 거절했습니다.');
        if (location.pathname === '/matching') window.location.href = '/main';
      } else if (data.type === 'battle_request') {
        window.dispatchEvent(new CustomEvent('lobby:battle_request', { detail: data }));
      } else {
        window.dispatchEvent(new CustomEvent('lobby:message', { detail: data }));
      }
    };

    sock.onerror = (err) => console.warn('[lobby] ws error', err);

    sock.onclose = () => {
      window.dispatchEvent(new CustomEvent('lobby:close'));
      ws = null;
      scheduleReconnect();
    };
  }

  /* ── 플로터 UI ── */
  function injectStyles() {
    if (document.getElementById('lobby-floater-style')) return;
    const style = document.createElement('style');
    style.id = 'lobby-floater-style';
    style.textContent = `
      #lobby-floater {
        position: fixed;
        right: 16px;
        bottom: 16px;
        z-index: 9999;
        display: none;
        align-items: center;
        gap: 10px;
        padding: 10px 14px;
        background: #0058bc;
        color: #ffffff;
        border-radius: 12px;
        box-shadow: 0 6px 18px rgba(0,0,0,0.25);
        font-family: "Space Grotesk", sans-serif;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        max-width: 320px;
      }
      html.dark #lobby-floater,
      body.dark-preview #lobby-floater {
        background: #1f2a44;
        color: #f4f7fb;
      }
      #lobby-floater.visible { display: inline-flex; }
      #lobby-floater .lf-spinner {
        width: 14px;
        height: 14px;
        border: 2px solid rgba(255,255,255,0.35);
        border-top-color: #ffffff;
        border-radius: 50%;
        animation: lf-spin 1s linear infinite;
        flex-shrink: 0;
      }
      #lobby-floater .lf-body {
        display: flex;
        flex-direction: column;
        line-height: 1.2;
        min-width: 0;
      }
      #lobby-floater .lf-title {
        font-weight: 700;
        font-size: 13px;
      }
      #lobby-floater .lf-sub {
        font-size: 11px;
        opacity: 0.85;
        margin-top: 2px;
      }
      #lobby-floater .lf-cancel {
        margin-left: 8px;
        background: rgba(0,0,0,0.18);
        color: inherit;
        border: none;
        border-radius: 8px;
        padding: 4px 10px;
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
        flex-shrink: 0;
      }
      #lobby-floater .lf-cancel:hover { background: rgba(0,0,0,0.32); }
      @keyframes lf-spin { to { transform: rotate(360deg); } }

      /* ── 수신 배틀 신청 알림 (모든 페이지 공용) ── */
      #lobby-incoming-stack {
        position: fixed;
        top: 80px;
        right: 16px;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-width: 360px;
      }
      .lobby-incoming {
        background: #ffffff;
        color: #1c1b1b;
        border: 1px solid #c1c6d7;
        border-left: 4px solid #0058bc;
        border-radius: 12px;
        padding: 12px 14px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.18);
        font-family: "Space Grotesk", sans-serif;
        font-size: 13px;
        animation: li-slide 0.25s ease-out;
      }
      html.dark .lobby-incoming,
      body.dark-preview .lobby-incoming {
        background: #1f2a44;
        color: #f4f7fb;
        border-color: #2f3743;
        border-left-color: #8ab4ff;
      }
      .lobby-incoming .li-title {
        font-weight: 700;
        margin-bottom: 4px;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .lobby-incoming .li-dot {
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #0058bc;
        animation: li-pulse 1.2s ease-in-out infinite;
      }
      html.dark .lobby-incoming .li-dot,
      body.dark-preview .lobby-incoming .li-dot { background: #8ab4ff; }
      .lobby-incoming .li-text { margin-bottom: 10px; line-height: 1.35; }
      .lobby-incoming .li-text strong { color: #0058bc; }
      html.dark .lobby-incoming .li-text strong,
      body.dark-preview .lobby-incoming .li-text strong { color: #8ab4ff; }
      .lobby-incoming .li-buttons { display: flex; gap: 8px; }
      .lobby-incoming .li-btn {
        flex: 1;
        padding: 8px 12px;
        border-radius: 8px;
        font-weight: 700;
        font-size: 12px;
        cursor: pointer;
        border: none;
        transition: filter 0.15s;
      }
      .lobby-incoming .li-btn:hover { filter: brightness(0.92); }
      .lobby-incoming .li-accept { background: #0058bc; color: #ffffff; }
      .lobby-incoming .li-reject { background: transparent; color: #5e5e5e; border: 1px solid #c1c6d7; }
      html.dark .lobby-incoming .li-reject,
      body.dark-preview .lobby-incoming .li-reject { color: #c9d1dc; border-color: #2f3743; }
      @keyframes li-slide { from { transform: translateX(20px); opacity: 0; } to { transform: none; opacity: 1; } }
      @keyframes li-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }
    `;
    document.head.appendChild(style);
  }

  function ensureFloater() {
    if (document.getElementById('lobby-floater')) return document.getElementById('lobby-floater');
    if (!document.body) return null;

    injectStyles();
    const el = document.createElement('div');
    el.id = 'lobby-floater';
    el.title = '매칭 페이지로 돌아가기';
    el.innerHTML = `
      <span class="lf-spinner"></span>
      <div class="lf-body">
        <span class="lf-title">매칭 진행 중…</span>
        <span class="lf-sub" id="lobby-floater-sub">대기 시간 00:00</span>
      </div>
      <button type="button" class="lf-cancel" id="lobby-floater-cancel">취소</button>
    `;
    document.body.appendChild(el);

    el.addEventListener('click', (e) => {
      if (e.target.closest('#lobby-floater-cancel')) return;
      const s = readState();
      if (!s) return;
      const params = new URLSearchParams();
      params.set('mode', s.mode === 'request' ? 'request' : 'auto');
      if (s.opponent)     params.set('opponent', s.opponent);
      if (s.targetUserId) params.set('target',   s.targetUserId);
      window.location.href = `/matching?${params.toString()}`;
    });

    el.querySelector('#lobby-floater-cancel').addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm('매칭을 취소하시겠습니까?')) return;
      await Lobby.cancelMatching();
    });

    return el;
  }

  function fmtElapsed(ms) {
    const sec = Math.max(0, Math.floor(ms / 1000));
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

  function updateFloater() {
    const el = ensureFloater();
    if (!el) return;

    const state = readState();
    const onSuppressedPath = SUPPRESS_PATHS.includes(location.pathname);
    const shouldShow = !!(state && state.active) && !onSuppressedPath;

    el.classList.toggle('visible', shouldShow);

    if (!shouldShow) {
      if (floaterTickTimer) { clearInterval(floaterTickTimer); floaterTickTimer = null; }
      return;
    }

    const sub = el.querySelector('#lobby-floater-sub');
    const renderSub = () => {
      const s = readState();
      if (!s) return;
      const label = s.mode === 'request'
        ? `${s.opponent || '상대'}님 응답 대기`
        : '자동 매칭';
      if (sub) sub.textContent = `${label} · ${fmtElapsed(Date.now() - (s.startedAt || Date.now()))}`;
    };
    renderSub();
    if (!floaterTickTimer) floaterTickTimer = setInterval(renderSub, 1000);
  }

  /* ── 수신 배틀 신청 알림 — 모든 페이지 공용 ── */
  const incomingShown = new Map();   /* request_id -> DOM element */
  let incomingSyncTimer = null;

  function ensureIncomingStack() {
    let stack = document.getElementById('lobby-incoming-stack');
    if (stack) return stack;
    if (!document.body) return null;
    injectStyles();
    stack = document.createElement('div');
    stack.id = 'lobby-incoming-stack';
    document.body.appendChild(stack);
    return stack;
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }

  function renderIncoming(req) {
    /* req: { id, requester_nickname, requester_user_id, created_at } */
    if (incomingShown.has(req.id)) return;
    const stack = ensureIncomingStack();
    if (!stack) return;

    const nickname = req.requester_nickname || req.requester?.nickname || '상대';
    const card = document.createElement('div');
    card.className = 'lobby-incoming';
    card.dataset.requestId = String(req.id);
    card.innerHTML = `
      <div class="li-title"><span class="li-dot"></span>새 배틀 신청</div>
      <div class="li-text"><strong>${escapeHtml(nickname)}</strong>님이 배틀을 신청했습니다.</div>
      <div class="li-buttons">
        <button type="button" class="li-btn li-accept">수락</button>
        <button type="button" class="li-btn li-reject">거절</button>
      </div>
    `;
    stack.appendChild(card);
    incomingShown.set(req.id, card);

    card.querySelector('.li-accept').addEventListener('click', async () => {
      card.querySelectorAll('button').forEach(b => b.disabled = true);
      try {
        const result = await apiRequest(`/match/request/${req.id}/accept`, { method: 'POST' });
        removeIncoming(req.id);
        Lobby.stopMatching();
        window.location.href = `/battle?battle_id=${result.battle_id}`;
      } catch (err) {
        alert(err.message);
        card.querySelectorAll('button').forEach(b => b.disabled = false);
      }
    });

    card.querySelector('.li-reject').addEventListener('click', async () => {
      card.querySelectorAll('button').forEach(b => b.disabled = true);
      try {
        await apiRequest(`/match/request/${req.id}/reject`, { method: 'POST' });
      } catch (err) {
        console.warn('[lobby] reject failed:', err.message);
      }
      removeIncoming(req.id);
    });
  }

  function removeIncoming(requestId) {
    const el = incomingShown.get(requestId);
    if (el) { el.remove(); incomingShown.delete(requestId); }
  }

  async function syncIncomingRequests() {
    if (!token()) return;
    try {
      const requests = await apiRequest('/match/requests/pending');
      const activeIds = new Set(requests.map(r => r.id));

      /* 더 이상 pending 아닌 알림 제거 */
      for (const id of Array.from(incomingShown.keys())) {
        if (!activeIds.has(id)) removeIncoming(id);
      }
      /* 새 요청 표시 */
      requests.forEach(renderIncoming);
    } catch (err) {
      /* 401 등 — 조용히 무시 */
    }
  }

  /* WS 수신: 즉시 동기화 */
  window.addEventListener('lobby:battle_request', () => syncIncomingRequests());
  window.addEventListener('lobby:open',           () => syncIncomingRequests());

  /* ── 토큰 변경(다른 탭에서 로그아웃 등) ── */
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) updateFloater();
    if (e.key === 'access_token' && !token()) {
      stopped = true;
      closeWs();
      Lobby.stopMatching();
    }
  });

  /* ── 초기화 ── */
  function init() {
    if (!token()) return;
    stopped = false;
    connect();

    const onReady = () => {
      updateFloater();
      /* 페이지 진입 즉시 백로그 동기화 */
      syncIncomingRequests();
    };
    if (document.body) onReady();
    else document.addEventListener('DOMContentLoaded', onReady, { once: true });

    /* WS 가 끊겨도 알림이 누락되지 않도록 5초 폴링(백업) */
    if (!incomingSyncTimer) {
      incomingSyncTimer = setInterval(() => {
        if (!stopped && token()) syncIncomingRequests();
      }, 5000);
    }
  }

  init();
})();
