/* ────────────────────────────────────────────────────────────
   match.js  — 배틀 요청 수신/수락/거절 + 로비 WebSocket
   main.html 에서 로드됨
──────────────────────────────────────────────────────────── */

function getMatchWsUrl(path) {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${location.host}${path}`;
}

/* ── 수락 ── */
async function acceptRequest(requestId) {
  try {
    const result = await apiRequest(`/match/request/${requestId}/accept`, { method: 'POST' });
    window.location.href = `/battle?battle_id=${result.battle_id}`;
  } catch (error) {
    alert(error.message);
  }
}

/* ── 거절 ── */
async function rejectRequest(requestId) {
  try {
    await apiRequest(`/match/request/${requestId}/reject`, { method: 'POST' });
    loadPendingRequests();
  } catch (error) {
    alert(error.message);
  }
}

/* ── 받은 배틀 신청 목록 렌더링 ── */
async function loadPendingRequests() {
  const list  = document.getElementById('request-list');
  const empty = document.getElementById('request-empty');
  if (!list || !empty) return;

  try {
    const requests = await apiRequest('/match/requests/pending');
    list.innerHTML = '';

    if (requests.length === 0) {
      empty.style.display = '';
      return;
    }

    empty.style.display = 'none';
    requests.forEach(req => {
      const div = document.createElement('div');
      div.className = 'request-box';
      div.innerHTML = `
        <span class="request-text">
          <strong class="request-user-name">${req.requester_nickname}</strong>님이 배틀을 신청했습니다.
        </span>
        <div class="request-actions">
          <button class="px-md py-sm bg-primary text-on-primary rounded-lg font-bold text-sm
                         hover:bg-primary-container transition-all btn-accept"
                  data-id="${req.id}">수락</button>
          <button class="px-md py-sm border border-outline-variant text-secondary rounded-lg text-sm
                         hover:text-red-500 transition-all btn-reject"
                  data-id="${req.id}">거절</button>
        </div>
      `;
      div.querySelector('.btn-accept').addEventListener('click', () => acceptRequest(req.id));
      div.querySelector('.btn-reject').addEventListener('click', () => rejectRequest(req.id));
      list.appendChild(div);
    });
  } catch (error) {
    console.warn('pending requests load failed:', error.message);
  }
}

/* ── 로비 WebSocket — 자동 재연결 포함 ── */
let matchLobbyWs       = null;
let matchWsReconnTimer = null;

function connectMatchLobbyWs() {
  const token = getToken();
  if (!token) return;

  /* 기존 연결 정리 */
  if (matchLobbyWs) {
    matchLobbyWs.onclose = null;
    matchLobbyWs.close();
    matchLobbyWs = null;
  }
  if (matchWsReconnTimer) {
    clearTimeout(matchWsReconnTimer);
    matchWsReconnTimer = null;
  }

  const ws = new WebSocket(getMatchWsUrl(`/ws/lobby?token=${encodeURIComponent(token)}`));
  matchLobbyWs = ws;

  ws.onopen = () => {
    console.log('[match.js] lobby WS connected');
    loadPendingRequests();   /* 연결 직후 즉시 갱신 */
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);

      if (data.type === 'battle_request') {
        /* 배틀 신청 수신 → 즉시 목록 갱신 */
        loadPendingRequests();
      } else if (data.type === 'match_found') {
        /* 자동 매칭 완료 (메인 페이지에 있는 동안 매칭된 경우) */
        window.location.href = `/battle?battle_id=${data.battle_id}`;
      }
    } catch (e) {
      console.warn('[match.js] WS parse error', e);
    }
  };

  ws.onerror = (err) => console.warn('[match.js] lobby WS error', err);

  ws.onclose = () => {
    console.warn('[match.js] lobby WS closed — 3초 후 재연결');
    matchLobbyWs = null;
    matchWsReconnTimer = setTimeout(() => {
      if (getToken()) connectMatchLobbyWs();
    }, 3000);
  };
}

/* ── 초기화 ──
   페이지 로드 시 즉시 실행
   + 3초 폴링으로 WS 유실 시에도 최대 3초 내 신청 표시 보장
─────────────────────────────────────────────────────────── */
loadPendingRequests();
connectMatchLobbyWs();
setInterval(loadPendingRequests, 3000);
