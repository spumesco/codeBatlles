/* ────────────────────────────────────────────────────────────
   main.js  — 내 프로필 + 온라인 유저 목록 + 배틀 신청 이동
   배틀 요청 수신/WS 는 match.js 에서 처리
──────────────────────────────────────────────────────────── */

/* ── 유틸 ── */
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

/* ── 현재 로그인 유저 캐시 ── */
let myUserId = null;
let myUserPk = null;

/* ── 내 프로필 ── */
function renderMyProfile(user) {
  setText('me-nickname', user.nickname || '-');
  setText('me-user-id', user.user_id || '-');
  setText('me-ranking', user.rank ? `#${user.rank}` : '-');

  const record = document.getElementById('me-record');
  if (record) {
    record.innerHTML = `<span class="text-win">${user.win_count ?? 0}승</span> <span class="text-lose">${user.lose_count ?? 0}패</span>`;
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
    myUserId = user.user_id;
    myUserPk = user.id;
    renderMyProfile(user);
  } catch (error) {
    console.warn(error.message);
    clearToken();
    window.location.href = '/login';
  }
}

/* ── 온라인 유저 목록 ── */
function statusClass(user) {
  if (user.is_battling) return 'status-battling';
  if (user.is_online)   return 'status-online';
  return 'status-matching';
}
function statusLabel(user) {
  if (user.is_battling) return '● 배틀 중';
  if (user.is_online)   return '● 대기 중';
  return '● 매칭 중';
}

async function loadOnlineUsers() {
  const tbody = document.getElementById('online-users-tbody');
  if (!tbody) return;

  try {
    const users = await apiRequest('/users/online');
    const others = users.filter(u => u.user_id !== myUserId);  // 자신 제외

    if (others.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center text-secondary py-4">온라인 사용자 없음</td></tr>';
      return;
    }

    tbody.innerHTML = others.map(user => {
      const canRequest = user.is_online && !user.is_battling;
      const btn = canRequest
        ? `<button class="btn-request-user px-sm py-1 border border-outline-variant text-secondary
                          rounded text-xs hover:border-primary hover:text-primary transition-all"
                   data-user-id="${user.user_id}" data-nickname="${user.nickname}">배틀 신청</button>`
        : `<button class="px-sm py-1 border border-outline-variant text-secondary rounded text-xs opacity-40"
                   disabled>신청 불가</button>`;

      return `<tr>
        <td>${user.nickname}</td>
        <td class="text-muted-mono">${user.user_id}</td>
        <td><span class="${statusClass(user)}">${statusLabel(user)}</span></td>
        <td>${btn}</td>
      </tr>`;
    }).join('');

    tbody.querySelectorAll('.btn-request-user').forEach(btn => {
      btn.addEventListener('click', () =>
        goBattleRequest(btn.dataset.userId, btn.dataset.nickname)
      );
    });
  } catch (error) {
    console.warn('online users load failed:', error.message);
    const tbody = document.getElementById('online-users-tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="4" class="text-center text-secondary py-4">불러오기 실패</td></tr>';
  }
}

/* ── 배틀 신청 이동 ── */
const requestButton = document.getElementById('btn-request-battle');
const opponentInput = document.getElementById('opponent-nickname');

function goBattleRequest(userId, nickname) {
  const targetId   = (userId || opponentInput?.value || '').trim();
  const displayName = nickname || targetId;
  if (!targetId) return;

  /* 자기 자신 신청 방지 */
  if (targetId === myUserId || targetId === String(myUserPk ?? '')) {
    alert('자기 자신에게는 배틀을 신청할 수 없습니다.');
    return;
  }

  window.location.href = `/matching?mode=request&opponent=${encodeURIComponent(displayName)}&target=${encodeURIComponent(targetId)}`;
}

if (requestButton && opponentInput) {
  requestButton.addEventListener('click', () => goBattleRequest(opponentInput.value));
  opponentInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') goBattleRequest(opponentInput.value);
  });
}

/* ── 초기화 ── */
loadMyProfile();
loadOnlineUsers();
setInterval(loadOnlineUsers, 10000);  // 온라인 목록은 10초마다 갱신
