/* ────────────────────────────────────────────────────────────
   matching.js — /matching 풀스크린 페이지

   - 자동 매칭 큐 진입 또는 1v1 신청
   - WS 는 lobby.js 가 공용으로 처리 (페이지 이동에도 유지)
   - 매칭 상태는 localStorage 에 저장되어 다른 페이지에서 플로터로 표시
──────────────────────────────────────────────────────────── */

authGuard();

const params = new URLSearchParams(window.location.search);
let mode         = params.get('mode');
let opponent     = params.get('opponent') || '상대 사용자';
let targetUserId = params.get('target');

/* URL 에 mode 가 없으면 진행 중 상태(다른 페이지에서 플로터 클릭)에서 복원. */
if (!mode && window.Lobby?.isMatching?.()) {
  const restored = Lobby.getMatchingState();
  if (restored) {
    mode         = restored.mode || 'auto';
    opponent     = restored.opponent || opponent;
    targetUserId = restored.targetUserId || targetUserId;
  }
}
if (!mode) mode = 'auto';  /* 기본값 */

const waitTitle = document.getElementById('wait-title');
const waitDescription = document.getElementById('wait-description');
const timerLabel = document.getElementById('timer-label');
const cancelLink = document.getElementById('cancel-link');
const timerEl = document.getElementById('timer');

function dotsMarkup() {
  return '<span class="dots"><span></span><span></span><span></span></span>';
}

if (mode === 'request') {
  if (waitTitle) waitTitle.innerHTML = `배틀 신청 중${dotsMarkup()}`;
  if (waitDescription) waitDescription.textContent = `${opponent}님에게 배틀 신청을 보내고 수락을 기다리는 중입니다.`;
  if (timerLabel) timerLabel.textContent = '신청 대기 시간';
  if (cancelLink) cancelLink.textContent = '신청 취소';
}

/* ── 대기 타이머 (페이지 진입 후 카운트) ──
   다른 페이지에서 복귀했더라도 시각적 표시는 0부터 시작.
   하단 플로터의 타이머는 startedAt 기준으로 별도 계산됨. */
let sec = 0;
setInterval(() => {
  sec++;
  const m = String(Math.floor(sec / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  if (timerEl) timerEl.textContent = `${m}:${s}`;
}, 1000);

/* ── 매칭 진입 ── */
async function joinQueue() {
  /* 이미 매칭 진행 중이면 큐 재진입은 생략 — 서버는 중복 방지하지만
     불필요한 호출 자체를 막는다. */
  if (window.Lobby && !Lobby.isMatching()) {
    Lobby.startMatching('auto');
  } else if (window.Lobby) {
    /* 모드가 다른 진행상태였다면 자동으로 덮어쓰기 */
    const st = Lobby.getMatchingState();
    if (!st || st.mode !== 'auto') Lobby.startMatching('auto');
  }

  try {
    const result = await apiRequest('/match/queue', { method: 'POST' });
    if (result.status === 'matched') {
      if (window.Lobby) Lobby.stopMatching();
      window.location.href = `/battle?battle_id=${result.battle_id}`;
    }
    /* 'waiting' → lobby.js 가 match_found 수신 시 자동 이동 */
  } catch (error) {
    if (window.Lobby) Lobby.stopMatching();
    alert(error.message);
    window.location.href = '/main';
  }
}

/* ── 1v1 배틀 신청 ── */
async function sendBattleRequest() {
  if (!targetUserId) {
    alert('상대방 정보가 없습니다.');
    window.location.href = '/main';
    return;
  }

  /* 진행 중 상태에서 같은 상대로 복귀한 경우 신청을 또 보내지 않는다. */
  if (window.Lobby?.isMatching?.()) {
    const st = Lobby.getMatchingState();
    if (st && st.mode === 'request' && st.targetUserId === targetUserId && st.requestId) {
      /* 이미 신청을 보낸 상태 — 화면만 표시 */
      return;
    }
  }

  if (window.Lobby) Lobby.startMatching('request', opponent, targetUserId);

  try {
    const result = await apiRequest('/match/request', {
      method: 'POST',
      body: JSON.stringify({ target_user_id: targetUserId }),
    });
    if (window.Lobby) Lobby.setMatchingRequestId(result.request_id);
    /* 수락/거절은 lobby.js 가 처리 */
  } catch (error) {
    if (window.Lobby) Lobby.stopMatching();
    alert(error.message);
    window.location.href = '/main';
  }
}

/* ── 매칭 취소 ── */
async function cancelMatching(e) {
  if (e) e.preventDefault();
  if (window.Lobby) {
    await Lobby.cancelMatching();
  }
  window.location.href = '/main';
}

/* ── lobby 이벤트 (match_found 는 lobby.js 가 자동 이동 처리) ──
   여기서는 별도 처리 불필요. 거절 알림도 lobby.js 가 처리. */

/* ── 초기화 ── */
if (mode === 'request') {
  /* 진행 중 상태에서 페이지 복귀한 경우, 같은 신청을 또 보내지 않도록 sendBattleRequest 가 가드. */
  sendBattleRequest();
} else {
  joinQueue();
}

if (cancelLink) {
  cancelLink.addEventListener('click', cancelMatching);
}
