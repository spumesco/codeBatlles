/* ────────────────────────────────────────────────────────────
   match.js  — 배틀 요청 수신/수락/거절 + 받은 신청 목록
   WS 연결은 lobby.js 가 공용으로 담당 — 여기서는 이벤트만 구독.
──────────────────────────────────────────────────────────── */

/* ── 수락 ── */
async function acceptRequest(requestId) {
  try {
    const result = await apiRequest(`/match/request/${requestId}/accept`, { method: 'POST' });
    /* 수락한 측은 매칭 상태가 아님 — 혹시 남아있던 상태가 있으면 정리 */
    if (window.Lobby) Lobby.stopMatching();
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

/* ── lobby 이벤트 구독 ── */
window.addEventListener('lobby:battle_request', () => loadPendingRequests());
window.addEventListener('lobby:open',           () => {
  loadPendingRequests();
  if (typeof loadMyProfile === 'function') loadMyProfile();
});

/* ── 초기 로드 + 폴링 (WS 유실 시 백업) ── */
loadPendingRequests();
setInterval(loadPendingRequests, 3000);
