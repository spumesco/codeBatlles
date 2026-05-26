/* ── 유틸 ── */
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function getWsUrl(path) {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${location.host}${path}`;
}

/* ── 내 프로필 ── */
function renderProfileLoadFailure() {
  setText('me-nickname', '불러오기 실패');
  setText('me-user-id', '-');
  setText('me-ranking', '-');
}

function renderMyProfile(user) {
  setText('me-nickname', user.nickname || '-');
  setText('me-user-id', user.user_id || '-');
  setText('me-ranking', user.rank ? `#${user.rank}` : '-');

  const winCount = user.win_count ?? 0;
  const loseCount = user.lose_count ?? 0;
  const record = document.getElementById('me-record');
  if (record) {
    record.innerHTML = `<span class="text-win">${winCount}승</span> <span class="text-lose">${loseCount}패</span>`;
  }

  const status = document.getElementById('me-status');
  if (status) {
    status.classList.remove('status-online', 'status-battling', 'status-matching');
    if (user.is_battling) {
      status.classList.add('status-battling');
      status.textContent = '● 배틀 중';
    } else if (user.is_online) {
      status.classList.add('status-online');
      status.textContent = '● 대기 중';
    } else {
      status.classList.add('status-matching');
      status.textContent = '● 오프라인';
    }
  }
}

async function loadMyProfile() {
  if (!getToken()) { window.location.href = '/login'; return; }
  try {
    const user = await getMe();
    renderMyProfile(user);
  } catch (error) {
    console.warn(error.message);
    renderProfileLoadFailure();
    clearToken();
    window.location.href = '/login';
  }
}

/* ── 배틀 신청 수락/거절 ── */
async function acceptRequest(requestId) {
  try {
    const result = await apiRequest(`/match/request/${requestId}/accept`, { method: 'POST' });
    // 수락하면 백엔드가 battle_id 반환
    window.location.href = `/battle?battle_id=${result.battle_id}`;
  } catch (error) {
    alert(error.message);
  }
}

async function rejectRequest(requestId) {
  try {
    await apiRequest(`/match/request/${requestId}/reject`, { method: 'POST' });
    loadPendingRequests();
  } catch (error) {
    alert(error.message);
  }
}

/* ── 받은 배틀 신청 목록 ── */
async function loadPendingRequests() {
  const list = document.getElementById('request-list');
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
    requests.forEach(request => {
      const div = document.createElement('div');
      div.className = 'request-box';
      div.innerHTML = `
        <span class="request-text">
          <strong class="request-user-name">${request.requester_nickname}</strong>님이 배틀을 신청했습니다.
        </span>
        <div class="request-actions">
          <button class="px-md py-sm bg-primary text-on-primary rounded-lg font-bold text-sm hover:bg-primary-container transition-all btn-accept" data-id="${request.id}">수락</button>
          <button class="px-md py-sm border border-outline-variant text-secondary rounded-lg text-sm hover:text-red-500 transition-all btn-reject" data-id="${request.id}">거절</button>
        </div>
      `;
      div.querySelector('.btn-accept').addEventListener('click', () => acceptRequest(request.id));
      div.querySelector('.btn-reject').addEventListener('click', () => rejectRequest(request.id));
      list.appendChild(div);
    });
  } catch (error) {
    console.warn('pending requests load failed:', error.message);
  }
}

/* ── 온라인 유저 목록 ── */
function statusClass(user) {
  if (user.is_battling) return 'status-battling';
  if (user.is_online) return 'status-online';
  return 'status-matching';
}

function statusLabel(user) {
  if (user.is_battling) return '● 배틀 중';
  if (user.is_online) return '● 대기 중';
  return '● 매칭 중';
}

async function loadOnlineUsers() {
  const tbody = document.getElementById('online-users-tbody');
  if (!tbody) return;

  try {
    const users = await apiRequest('/users/online');
    if (users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center text-secondary py-4">온라인 사용자 없음</td></tr>';
      return;
    }

    tbody.innerHTML = users.map(user => {
      const canRequest = user.is_online && !user.is_battling;
      const button = canRequest
        ? `<button class="btn-request-user px-sm py-1 border border-outline-variant text-secondary rounded text-xs hover:border-primary hover:text-primary transition-all"
             data-user-id="${user.user_id}" data-nickname="${user.nickname}">배틀 신청</button>`
        : '<button class="px-sm py-1 border border-outline-variant text-secondary rounded text-xs opacity-40" disabled>신청 불가</button>';

      return `<tr>
        <td>${user.nickname}</td>
        <td class="text-muted-mono">${user.user_id}</td>
        <td><span class="${statusClass(user)}">${statusLabel(user)}</span></td>
        <td>${button}</td>
      </tr>`;
    }).join('');

    tbody.querySelectorAll('.btn-request-user').forEach(btn => {
      btn.addEventListener('click', () =>
        goBattleRequest(btn.dataset.userId, btn.dataset.nickname)
      );
    });
  } catch (error) {
    console.warn('online users load failed:', error.message);
    tbody.innerHTML = '<tr><td colspan="4" class="text-center text-secondary py-4">불러오기 실패</td></tr>';
  }
}

/* ── 배틀 신청 이동 ── */
const requestButton = document.getElementById('btn-request-battle');
const opponentInput = document.getElementById('opponent-nickname');

function goBattleRequest(userId, nickname) {
  const targetId = (userId || opponentInput?.value || '').trim();
  const displayName = nickname || targetId;
  if (!targetId) return;
  window.location.href = `/matching?mode=request&opponent=${encodeURIComponent(displayName)}&target=${encodeURIComponent(targetId)}`;
}

if (requestButton && opponentInput) {
  requestButton.addEventListener('click', () => goBattleRequest(opponentInput.value));
  opponentInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') goBattleRequest(opponentInput.value);
  });
}

/* ── 로비 WebSocket (실시간 배틀 신청 수신 + match_found) ── */
function connectLobbyWs() {
  const token = getToken();
  if (!token) return;

  const ws = new WebSocket(getWsUrl(`/ws/lobby?token=${encodeURIComponent(token)}`));

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'battle_request') {
        // 새 배틀 신청 도착 → 목록 갱신
        loadPendingRequests();
      } else if (data.type === 'match_found') {
        window.location.href = `/battle?battle_id=${data.battle_id}`;
      }
    } catch (e) {
      console.warn('WS 파싱 오류', e);
    }
  };

  ws.onerror = (err) => console.warn('lobby WS error', err);
  ws.onclose = () => console.warn('lobby WS closed');
}

/* ── 주기적 갱신 ── */
async function refreshAll() {
  await Promise.all([loadPendingRequests(), loadOnlineUsers()]);
}

/* ── 초기화 ── */
loadMyProfile();
refreshAll();
connectLobbyWs();
setInterval(refreshAll, 30000);
