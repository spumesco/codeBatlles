authGuard();

const params = new URLSearchParams(window.location.search);
const mode = params.get('mode');
const opponent = params.get('opponent') || '상대 사용자';
const targetUserId = params.get('target');

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

/* ── 대기 타이머 ── */
let sec = 0;
setInterval(() => {
  sec++;
  const m = String(Math.floor(sec / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  if (timerEl) timerEl.textContent = `${m}:${s}`;
}, 1000);

/* ── WebSocket 유틸 ── */
function getWsUrl(path) {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${location.host}${path}`;
}

/* ── 로비 WebSocket — 자동 재연결 포함 ── */
let lobbyWs = null;
let wsReconnectTimer = null;
let isDone = false;  // 매칭 완료/취소 후 재연결 방지

function connectLobbyWs() {
  if (isDone) return;
  const token = getToken();
  if (!token) return;

  if (lobbyWs) {
    lobbyWs.onclose = null;
    lobbyWs.close();
    lobbyWs = null;
  }

  const url = getWsUrl(`/ws/lobby?token=${encodeURIComponent(token)}`);
  lobbyWs = new WebSocket(url);

  lobbyWs.onopen = () => {
    /* Render.com 유휴 연결 방지: 25초마다 ping 전송 */
    const hbTimer = setInterval(() => {
      if (lobbyWs && lobbyWs.readyState === WebSocket.OPEN) {
        lobbyWs.send('ping');
      } else {
        clearInterval(hbTimer);
      }
    }, 25000);
  };

  lobbyWs.onmessage = (event) => {
    if (event.data === 'pong') return;  /* heartbeat 응답 무시 */
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'match_found') {
        isDone = true;
        window.location.href = `/battle?battle_id=${data.battle_id}`;
      } else if (data.type === 'battle_rejected') {
        isDone = true;
        alert('상대방이 배틀 신청을 거절했습니다.');
        window.location.href = '/main';
      }
    } catch (e) {
      console.warn('WS 파싱 오류', e);
    }
  };

  lobbyWs.onerror = (err) => console.warn('lobby WS error', err);

  lobbyWs.onclose = () => {
    if (isDone) return;
    console.warn('matching WS disconnected — 3초 후 재연결');
    lobbyWs = null;
    wsReconnectTimer = setTimeout(connectLobbyWs, 3000);
  };
}

/* ── 자동 매칭 큐 참가 ── */
async function joinQueue() {
  try {
    const result = await apiRequest('/match/queue', { method: 'POST' });
    if (result.status === 'matched') {
      isDone = true;
      window.location.href = `/battle?battle_id=${result.battle_id}`;
    }
    // 'waiting' → WS로 match_found 대기
  } catch (error) {
    alert(error.message);
    window.location.href = '/main';
  }
}

/* ── 1v1 배틀 신청 전송 ── */
let sentRequestId = null;  // 취소 시 사용

async function sendBattleRequest() {
  if (!targetUserId) {
    alert('상대방 정보가 없습니다.');
    window.location.href = '/main';
    return;
  }
  try {
    const result = await apiRequest('/match/request', {
      method: 'POST',
      body: JSON.stringify({ target_user_id: targetUserId }),
    });
    sentRequestId = result.request_id;
    // 수락 대기 — WS로 match_found 또는 battle_rejected 수신
  } catch (error) {
    alert(error.message);
    window.location.href = '/main';
  }
}

/* ── 매칭 취소 ── */
async function cancelMatching(e) {
  if (e) e.preventDefault();
  isDone = true;

  if (wsReconnectTimer) clearTimeout(wsReconnectTimer);
  if (lobbyWs) {
    lobbyWs.onclose = null;
    lobbyWs.close();
    lobbyWs = null;
  }

  if (mode === 'request') {
    /* 1v1 신청 취소 — 서버에서 pending 요청 삭제 */
    if (sentRequestId) {
      try {
        await apiRequest(`/match/request/${sentRequestId}`, { method: 'DELETE' });
      } catch (err) {
        console.warn('신청 취소 실패:', err.message);
      }
    }
  } else {
    /* 자동 매칭 큐 이탈 */
    try {
      await apiRequest('/match/queue', { method: 'DELETE' });
    } catch (err) {
      console.warn(err.message);
    }
  }

  window.location.href = '/main';
}

/* ── 초기화 ── */
connectLobbyWs();

if (mode === 'request') {
  sendBattleRequest();
} else {
  joinQueue();
}

if (cancelLink) {
  cancelLink.addEventListener('click', cancelMatching);
}
