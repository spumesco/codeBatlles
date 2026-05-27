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
let onlineUsersCache = [];  // 마지막으로 조회한 온라인 유저 목록

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

    /* 배틀 상태 자가 점검 — stuck (is_battling=true 인데 실제 배틀 없음) 자동 해제,
       진짜 진행 중인 배틀이면 복귀 패널 노출. */
    let battleState = null;
    try {
      battleState = await apiRequest('/users/me/battle-state');
      /* 서버가 플래그를 갱신했을 수 있으니 화면용 사본에 동기화. */
      user.is_battling = !!battleState.is_battling;
    } catch (e) {
      console.warn('battle-state 조회 실패', e.message);
    }

    renderMyProfile(user);
    renderBattleRecovery(battleState);
  } catch (error) {
    console.warn(error.message);
    clearToken();
    window.location.href = '/login';
  }
}

/* ── 진행 중인 배틀 복귀/포기 패널 ──
   stuck 자동 정리 후에도 active battle 이 살아 있으면 복귀/포기 버튼을 보여준다. */
function renderBattleRecovery(state) {
  const existing = document.getElementById('battle-recovery');
  if (existing) existing.remove();

  if (!state || !state.active_battle_id) return;

  const meStatus = document.getElementById('me-status');
  if (!meStatus) return;
  const card = meStatus.closest('.card') || meStatus.parentElement;

  const box = document.createElement('div');
  box.id = 'battle-recovery';
  box.style.marginTop = '12px';
  box.style.padding = '10px 12px';
  box.style.borderRadius = '8px';
  box.style.border = '1px solid #dc2626';
  box.style.background = 'rgba(220,38,38,0.08)';
  box.style.display = 'flex';
  box.style.flexDirection = 'column';
  box.style.gap = '8px';
  box.innerHTML = `
    <div style="font-size:12px;font-weight:700;color:#dc2626;">
      진행 중인 배틀이 있습니다 (#${state.active_battle_id})
    </div>
    <div style="display:flex;gap:6px;">
      <button id="btn-resume-battle"
        style="flex:1;padding:6px 10px;border-radius:6px;border:none;
               background:#0058bc;color:#fff;font-size:12px;font-weight:700;cursor:pointer;">
        배틀로 돌아가기
      </button>
      <button id="btn-forfeit-battle"
        style="flex:1;padding:6px 10px;border-radius:6px;
               border:1px solid #dc2626;background:transparent;color:#dc2626;
               font-size:12px;font-weight:700;cursor:pointer;">
        포기하기
      </button>
    </div>
  `;
  card.appendChild(box);

  document.getElementById('btn-resume-battle').addEventListener('click', () => {
    window.location.href = `/battle?battle_id=${state.active_battle_id}`;
  });
  document.getElementById('btn-forfeit-battle').addEventListener('click', async () => {
    if (!confirm('정말 포기하시겠습니까? 상대방이 승리 처리됩니다.')) return;
    try {
      await apiRequest('/users/me/forfeit', { method: 'POST' });
      box.remove();
      await loadMyProfile();
    } catch (err) {
      alert('포기 처리 실패: ' + err.message);
    }
  });
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

  /* 본인 식별값이 아직 없으면 먼저 프로필 조회 — 어떤 순서로 호출돼도
     자기 자신이 절대 목록에 표시되지 않도록 한다. */
  if (!myUserId) {
    try { await loadMyProfile(); } catch (_) {}
    if (!myUserId) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center text-secondary py-4">불러오는 중...</td></tr>';
      return;
    }
  }

  try {
    const users = await apiRequest('/users/online');
    /* 백엔드도 본인을 제외하지만 캐시/구버전 응답에 대비해 한 번 더 필터.
       user_id 와 PK 모두로 비교 — 어떤 필드로 와도 차단. */
    const others = users.filter(u =>
      u.user_id !== myUserId &&
      String(u.id ?? '') !== String(myUserPk ?? '')
    );
    onlineUsersCache = others;

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

async function goBattleRequest(userId, nickname) {
  const targetId   = (userId || opponentInput?.value || '').trim();
  const displayName = nickname || targetId;
  if (!targetId) return;

  /* 자기 자신 신청 방지 */
  if (targetId === myUserId || targetId === String(myUserPk ?? '')) {
    alert('자기 자신에게는 배틀을 신청할 수 없습니다.');
    return;
  }

  /* 온라인 여부 사전 검증 — 매칭 페이지 진입 전에 차단.
     온라인 사용자 캐시에 없으면 오프라인으로 간주.
     백엔드 /users/{id} 는 user_id 기준이라 닉네임 입력은 못 찾으므로
     이 단계에서는 캐시 매칭만 신뢰하고, 서버 검증은 /match/request 에 위임. */
  const cached = onlineUsersCache.find(
    u => u.user_id === targetId || u.nickname === targetId
  );

  if (cached) {
    if (!cached.is_online) {
      alert('오프라인 사용자입니다.');
      return;
    }
    if (cached.is_battling) {
      alert('상대방이 이미 배틀 중입니다.');
      return;
    }
  } else {
    /* 캐시에 없는 경우 — 입력값이 닉네임/ID 어느 쪽이든 온라인 목록에 없는 사용자.
       온라인이 아니라면 오프라인 사용자로 간주하고 진입을 막는다. */
    alert('오프라인 사용자입니다. 온라인 상태인 사용자에게만 배틀을 신청할 수 있습니다.');
    return;
  }

  const resolvedDisplay = nickname || cached?.nickname || displayName;
  window.location.href = `/matching?mode=request&opponent=${encodeURIComponent(resolvedDisplay)}&target=${encodeURIComponent(targetId)}`;
}

if (requestButton && opponentInput) {
  requestButton.addEventListener('click', () => goBattleRequest(opponentInput.value));
  opponentInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') goBattleRequest(opponentInput.value);
  });
}

/* ── 초기화 ── */
/* myUserId 가 설정된 뒤 온라인 목록을 불러와야 본인 제외 필터가 정확히 동작. */
(async () => {
  await loadMyProfile();
  await loadOnlineUsers();
  setInterval(loadOnlineUsers, 5000);   // 온라인 목록은 5초마다 갱신
})();
