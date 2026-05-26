authGuard();

const params = new URLSearchParams(window.location.search);
const mode = params.get('mode');
const opponent = params.get('opponent') || '상대 사용자';
const targetUserId = params.get('target'); // 배틀 신청 시 상대방 user_id

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

/* ── 로비 WebSocket 연결 ── */
let lobbyWs = null;

function connectLobbyWs() {
  const token = getToken();
  if (!token) return;

  const url = getWsUrl(`/ws/lobby?token=${encodeURIComponent(token)}`);
  lobbyWs = new WebSocket(url);

  lobbyWs.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'match_found') {
        window.location.href = `/battle?battle_id=${data.battle_id}`;
      }
    } catch (e) {
      console.warn('WS 파싱 오류', e);
    }
  };

  lobbyWs.onerror = (err) => console.warn('lobby WS error', err);
  lobbyWs.onclose = () => console.warn('lobby WS closed');
}

/* ── 자동 매칭 큐 참가 ── */
async function joinQueue() {
  try {
    const result = await apiRequest('/match/queue', { method: 'POST' });
    if (result.status === 'matched') {
      // 즉시 매칭된 경우
      window.location.href = `/battle?battle_id=${result.battle_id}`;
    }
    // 'waiting' 이면 WS로 match_found 수신 대기
  } catch (error) {
    alert(error.message);
    window.location.href = '/main';
  }
}

/* ── 1v1 배틀 신청 전송 ── */
async function sendBattleRequest() {
  if (!targetUserId) {
    alert('상대방 정보가 없습니다.');
    window.location.href = '/main';
    return;
  }
  try {
    await apiRequest('/match/request', {
      method: 'POST',
      body: JSON.stringify({ target_user_id: targetUserId }),
    });
    // 수락 대기 — WS로 match_found 수신
  } catch (error) {
    alert(error.message);
    window.location.href = '/main';
  }
}

/* ── 매칭 취소 ── */
async function cancelMatching(e) {
  if (e) e.preventDefault();

  if (lobbyWs) {
    lobbyWs.onclose = null;
    lobbyWs.close();
  }

  if (mode !== 'request') {
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
