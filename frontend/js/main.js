function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function renderProfileLoadFailure() {
  setText('me-nickname', '불러오기 실패');
  setText('me-user-id', '-');
  setText('me-ranking', '-');
}

function renderMyProfile(user) {
  setText('me-nickname', user.nickname);
  setText('me-user-id', user.user_id);
  setText('me-ranking', user.rank ? `#${user.rank}` : '-');

  const record = document.getElementById('me-record');
  if (record) {
    record.innerHTML = `<span class="text-win">${user.win_count}승</span> <span class="text-lose">${user.lose_count}패</span>`;
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
  if (!getToken()) {
    window.location.href = '/login';
    return;
  }
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

async function acceptRequest(requestId) {
  try {
    await apiRequest(`/match/request/${requestId}/accept`, { method: 'POST' });
    alert('배틀 수락! 곧 배틀이 시작됩니다.');
    loadPendingRequests();
  } catch (e) {
    alert(e.message);
  }
}

async function rejectRequest(requestId) {
  try {
    await apiRequest(`/match/request/${requestId}/reject`, { method: 'POST' });
    loadPendingRequests();
  } catch (e) {
    alert(e.message);
  }
}

async function loadPendingRequests() {
  const list = document.getElementById('request-list');
  const empty = document.getElementById('request-empty');
  if (!list || !empty) return;

  try {
    const requests = await apiRequest('/match/requests/pending');
    list.innerHTML = '';
    if (requests.length === 0) {
      empty.style.display = '';
    } else {
      empty.style.display = 'none';
      requests.forEach(req => {
        const div = document.createElement('div');
        div.className = 'request-box';
        div.innerHTML = `
          <span class="request-text"><strong class="request-user-name">${req.requester_nickname}</strong>님이 배틀을 신청했습니다.</span>
          <div class="request-actions">
            <button class="px-md py-sm bg-primary text-on-primary rounded-lg font-bold text-sm hover:bg-primary-container transition-all btn-accept" data-id="${req.id}">수락</button>
            <button class="px-md py-sm border border-outline-variant text-secondary rounded-lg text-sm hover:text-red-500 transition-all btn-reject" data-id="${req.id}">거절</button>
          </div>
        `;
        div.querySelector('.btn-accept').addEventListener('click', () => acceptRequest(req.id));
        div.querySelector('.btn-reject').addEventListener('click', () => rejectRequest(req.id));
        list.appendChild(div);
      });
    }
  } catch (e) {
    console.warn('pending requests load failed:', e.message);
  }
}

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
    tbody.innerHTML = users.map(u => {
      const canReq = u.is_online && !u.is_battling;
      const btn = canReq
        ? `<button class="btn-request-user px-sm py-1 border border-outline-variant text-secondary rounded text-xs hover:border-primary hover:text-primary transition-all" data-opponent="${u.nickname}">배틀 신청</button>`
        : `<button class="px-sm py-1 border border-outline-variant text-secondary rounded text-xs opacity-40" disabled>신청 불가</button>`;
      return `<tr>
        <td>${u.nickname}</td>
        <td class="text-muted-mono">${u.user_id}</td>
        <td><span class="${statusClass(u)}">${statusLabel(u)}</span></td>
        <td>${btn}</td>
      </tr>`;
    }).join('');

    tbody.querySelectorAll('.btn-request-user').forEach(button => {
      button.addEventListener('click', () => goBattleRequest(button.dataset.opponent));
    });
  } catch (e) {
    console.warn('online users load failed:', e.message);
    tbody.innerHTML = '<tr><td colspan="4" class="text-center text-secondary py-4">불러오기 실패</td></tr>';
  }
}

const requestButton = document.getElementById('btn-request-battle');
const opponentInput = document.getElementById('opponent-nickname');

function goBattleRequest(opponent) {
  const target = (opponent || opponentInput?.value || '').trim();
  if (!target) return;
  window.location.href = `/matching?mode=request&opponent=${encodeURIComponent(target)}`;
}

if (requestButton && opponentInput) {
  requestButton.addEventListener('click', () => goBattleRequest(opponentInput.value));
  opponentInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') goBattleRequest(opponentInput.value);
  });
}

async function refreshAll() {
  await Promise.all([loadPendingRequests(), loadOnlineUsers()]);
}

loadMyProfile();
refreshAll();
setInterval(refreshAll, 30000);