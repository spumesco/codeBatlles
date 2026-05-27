authGuard();

let sec = 0;
let battleStarted = false;
let battleWs = null;

const LANGUAGE_MAP = {
  'Python': 'python',
  'Java': 'java',
  'C++': 'cpp',
  'C': 'c',
  'JavaScript': 'javascript',
};

/* ── 유틸 ── */
function isAdminUser(user) {
  return String(user?.role || '').trim().toLowerCase() === 'admin';
}

function getWsUrl(path) {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${location.host}${path}`;
}

function getBattleId() {
  const p = new URLSearchParams(location.search);
  return p.get('battle_id') || p.get('id');
}

/* ── 경기 타이머 (battle_start 이후 작동) ── */
setInterval(() => {
  if (!battleStarted) return;
  sec++;
  const m = String(Math.floor(sec / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  const timerEl = document.getElementById('timer');
  if (timerEl) timerEl.textContent = `${m}:${s}`;
}, 1000);

/* ── 문제 패널 토글 ── */
function toggleDrawer() {
  const drawer = document.getElementById('drawer');
  const toggleButton = document.getElementById('toggleDrawer');
  if (!drawer) return;
  drawer.classList.toggle('open');
  if (toggleButton) {
    toggleButton.textContent = drawer.classList.contains('open') ? '문제 닫기' : '문제 보기';
  }
}

/* ── 카운트다운 모달 ── */
function updateCountdown(count) {
  const modal = document.getElementById('countdownModal');
  const number = document.getElementById('countdownNumber');
  if (modal) modal.classList.remove('hidden');
  if (number) number.textContent = count;
}

function hideCountdown() {
  const modal = document.getElementById('countdownModal');
  if (modal) modal.classList.add('hidden');
}

/* 가장 최근에 받은 문제 — 내비바가 늦게 로드되더라도 제목을 채울 수 있게 캐시 */
let currentProblem = null;

function setNavbarProblemTitle() {
  if (!currentProblem) return;
  const navTitle = document.getElementById('navbar-problem-title');
  if (navTitle) {
    navTitle.textContent = currentProblem.title || '-';
    navTitle.title       = currentProblem.title || '';
  }
}

/* ── 문제 렌더링 ── */
function renderProblem(problem) {
  if (!problem) return;
  currentProblem = problem;
  document.getElementById('problemTitle').textContent = problem.title || '-';
  document.getElementById('problemDifficulty').textContent = problem.difficulty || '-';
  document.getElementById('problemTimeLimit').textContent = problem.time_limit ?? '-';
  document.getElementById('problemMemoryLimit').textContent = problem.memory_limit ?? '-';
  document.getElementById('problemDescription').textContent = problem.description || '-';
  document.getElementById('problemInputDescription').textContent = problem.input_description || '-';
  document.getElementById('problemOutputDescription').textContent = problem.output_description || '-';
  document.getElementById('problemSampleInput').textContent = problem.sample_input || '-';
  document.getElementById('problemSampleOutput').textContent = problem.sample_output || '-';

  /* 상단바에 문제 제목 노출 — 패널이 닫혀 있어도 어떤 문제인지 항상 보이게.
     내비바가 아직 로드되지 않았다면 setNavbarProblemTitle 이 나중에 채움. */
  setNavbarProblemTitle();
}

/* 문제 패널 자동 열기 — 처음 한 번만 (사용자가 닫았으면 다시 열지 않음) */
let drawerAutoOpened = false;
function ensureDrawerOpen() {
  if (drawerAutoOpened) return;
  drawerAutoOpened = true;
  const drawer = document.getElementById('drawer');
  const toggleButton = document.getElementById('toggleDrawer');
  if (drawer && !drawer.classList.contains('open')) {
    drawer.classList.add('open');
    if (toggleButton) toggleButton.textContent = '문제 닫기';
  }
}

async function loadBattleProblem() {
  const battleId = getBattleId();
  if (!battleId) return;
  try {
    const battle = await apiRequest(`/battles/${battleId}`);
    if (!battle.problem_id) return;
    const problem = await apiRequest(`/problems/${battle.problem_id}`);
    renderProblem(problem);
    /* 문제가 로드되면 패널을 자동으로 펼쳐 어떤 문제인지 즉시 보이게 한다. */
    ensureDrawerOpen();
  } catch (error) {
    console.warn('문제 로드 실패', error);
  }
}

/* ── 상대방 코드 업데이트 ── */
function updateOpponentCode(code) {
  const area = document.querySelector('.opponent-code');
  if (!area) return;
  area.textContent = code;
  area.style.whiteSpace = 'pre';
  area.style.fontFamily = "'JetBrains Mono', monospace";
  area.style.fontSize = '0.85rem';
  area.style.color = '#1c1b1b';
}

/* ── WebSocket 메시지 처리 ── */
function handleWsMessage(data) {
  switch (data.type) {
    case 'countdown':
      updateCountdown(data.count);
      break;

    case 'battle_start':
      hideCountdown();
      battleStarted = true;
      break;

    case 'battle_end':
      onBattleEnd(data.winner_id, data.reason);
      break;

    case 'code_update':
      updateOpponentCode(data.code || '');
      break;
  }
}

let battleEnded = false;
async function onBattleEnd(winnerId, reason) {
  if (battleEnded) return;     // 중복 이벤트 보호
  battleEnded = true;
  const resultEl = document.getElementById('judgeResult');
  try {
    const me = await getMe();
    const isWinner = me.id === winnerId;
    let label = isWinner ? '🎉 승리!' : '패배...';
    if (reason === 'opponent_disconnected') {
      label = isWinner ? '🎉 승리 (상대 연결 끊김)' : '연결이 끊겨 배틀이 종료되었습니다.';
    } else if (reason === 'opponent_forfeit') {
      label = isWinner ? '🎉 승리 (상대 포기)' : '배틀을 포기했습니다.';
    }
    if (resultEl) {
      resultEl.textContent = label;
      resultEl.style.color = isWinner ? '#16a34a' : '#dc2626';
    }
  } catch (e) {
    console.warn(e);
  }
  setTimeout(() => {
    isLeavingForResult = true;   /* 결과 페이지 이동은 포기 신호로 잡지 않음 */
    window.location.href = `/result?battle_id=${getBattleId()}`;
  }, 2000);
}

/* ── 배틀 WebSocket 연결 ── */
function connectBattleWs() {
  const battleId = getBattleId();
  const token = getToken();
  if (!battleId || !token) return;

  const url = getWsUrl(`/ws/battles/${battleId}?token=${encodeURIComponent(token)}`);
  battleWs = new WebSocket(url);

  battleWs.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      handleWsMessage(data);
    } catch (e) {
      console.warn('WS 파싱 오류', e);
    }
  };

  battleWs.onerror = (err) => console.warn('battle WS error', err);
  battleWs.onclose = () => console.warn('battle WS closed');

  // 내 코드 변경 시 상대에게 브로드캐스트
  const editor = document.getElementById('myCodeEditor');
  if (editor) {
    editor.addEventListener('input', () => {
      if (battleWs && battleWs.readyState === WebSocket.OPEN) {
        battleWs.send(JSON.stringify({ type: 'code_update', code: editor.value }));
      }
    });
  }
}

/* ── 페이지 종료/이탈 시 자동 포기 ──
   - 배틀 종료 후의 /result 이동은 unloading 플래그로 구분해 forfeit 신호 보내지 않음.
   - 진행 중 상태라면 사용자가 의도적으로 떠난 것으로 간주하고 즉시 종료 신호 송신.
   - WS 가 안 가도 백엔드의 grace forfeit 가 3초 후에 동일하게 처리. */
let isLeavingForResult = false;

function sendForfeitIfPlaying() {
  if (battleEnded || isLeavingForResult) return;
  if (battleWs && battleWs.readyState === WebSocket.OPEN) {
    try { battleWs.send(JSON.stringify({ type: 'forfeit' })); } catch (_) {}
  }
}

window.addEventListener('pagehide',     sendForfeitIfPlaying);
window.addEventListener('beforeunload', sendForfeitIfPlaying);

/* ── 코드 제출 ── */
async function submitCode() {
  const battleId = getBattleId();
  if (!battleId) return;

  const editor = document.getElementById('myCodeEditor');
  const langSelect = document.getElementById('languageSelect');
  const resultEl = document.getElementById('judgeResult');
  const submitBtn = document.getElementById('submitCodeButton');

  const sourceCode = editor?.value || '';
  const langLabel = langSelect?.value || 'Python';
  const language = LANGUAGE_MAP[langLabel] || 'python';

  if (!sourceCode.trim()) {
    alert('코드를 입력해주세요.');
    return;
  }

  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '채점 중...'; }
  if (resultEl) { resultEl.textContent = '채점 중...'; resultEl.style.color = '#0058bc'; }

  try {
    const result = await apiRequest(`/battles/${battleId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ language, source_code: sourceCode }),
    });

    if (result.is_correct) {
      if (resultEl) { resultEl.textContent = '정답!'; resultEl.style.color = '#16a34a'; }
      // battle_end 이벤트가 WS로 도착하면 자동 이동
    } else {
      if (resultEl) { resultEl.textContent = `오답: ${result.status}`; resultEl.style.color = '#dc2626'; }
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '제출'; }
    }
  } catch (error) {
    if (resultEl) { resultEl.textContent = `오류: ${error.message}`; resultEl.style.color = '#dc2626'; }
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '제출'; }
  }
}

/* ── 내비바 ── */
async function loadBattleNavbar() {
  const container = document.getElementById('navbar-container');
  if (!container) return;

  let currentUser = null;
  try {
    currentUser = await getMe();
  } catch (error) {
    console.warn(error.message);
  }

  try {
    const res = await fetch('/components/battle-navbar.html?v=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) throw new Error(`navbar load failed: ${res.status}`);
    container.innerHTML = await res.text();

    // 닉네임 채우기
    const nickname = document.getElementById('navbar-nickname');
    if (nickname && currentUser) nickname.textContent = currentUser.nickname || '-';

    /* 내비바 DOM 이 막 삽입됐으므로, 이전에 로드된 문제 제목을 지금 채워준다. */
    setNavbarProblemTitle();

    // 관리자만 관리자 탭 표시, 비관리자는 inline style 로도 차단
    const adminLink = document.getElementById('navbar-admin-link');
    if (adminLink) {
      if (isAdminUser(currentUser)) {
        adminLink.classList.remove('hidden');
        adminLink.style.display = '';
      } else {
        adminLink.classList.add('hidden');
        adminLink.style.display = 'none';
      }
    }

    // 로그아웃 바인딩
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        logoutBtn.disabled = true;
        apiLogout().catch(console.warn);
        clearToken();
        window.location.replace('/');
      });
    }
  } catch (error) {
    console.warn(error.message);
  }
}

/* ── 이벤트 바인딩 ── */
function bindBattleEvents() {
  const drawerCloseButton = document.getElementById('drawerCloseButton');
  const submitButton = document.getElementById('submitCodeButton');
  if (drawerCloseButton) drawerCloseButton.addEventListener('click', toggleDrawer);
  if (submitButton) submitButton.addEventListener('click', submitCode);
}

/* ── 코드 에디터 보강 (자동 괄호 + 들여쓰기) ── */
function setupCodeEditor() {
  const editor = document.getElementById('myCodeEditor');
  if (editor && typeof enhanceCodeEditor === 'function') {
    enhanceCodeEditor(editor);
  }
}

/* ── 초기화 ── */
loadBattleNavbar();
bindBattleEvents();
connectBattleWs();
loadBattleProblem();
setupCodeEditor();
