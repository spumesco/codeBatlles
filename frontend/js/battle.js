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

/* ── 문제 렌더링 ── */
function renderProblem(problem) {
  if (!problem) return;
  document.getElementById('problemTitle').textContent = problem.title || '-';
  document.getElementById('problemDifficulty').textContent = problem.difficulty || '-';
  document.getElementById('problemTimeLimit').textContent = problem.time_limit ?? '-';
  document.getElementById('problemMemoryLimit').textContent = problem.memory_limit ?? '-';
  document.getElementById('problemDescription').textContent = problem.description || '-';
  document.getElementById('problemInputDescription').textContent = problem.input_description || '-';
  document.getElementById('problemOutputDescription').textContent = problem.output_description || '-';
  document.getElementById('problemSampleInput').textContent = problem.sample_input || '-';
  document.getElementById('problemSampleOutput').textContent = problem.sample_output || '-';
}

async function loadBattleProblem() {
  const battleId = getBattleId();
  if (!battleId) return;
  try {
    const battle = await apiRequest(`/battles/${battleId}`);
    if (!battle.problem_id) return;
    const problem = await apiRequest(`/problems/${battle.problem_id}`);
    renderProblem(problem);
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
      onBattleEnd(data.winner_id);
      break;

    case 'code_update':
      updateOpponentCode(data.code || '');
      break;
  }
}

async function onBattleEnd(winnerId) {
  const resultEl = document.getElementById('judgeResult');
  try {
    const me = await getMe();
    const isWinner = me.id === winnerId;
    if (resultEl) {
      resultEl.textContent = isWinner ? '🎉 승리!' : '패배...';
      resultEl.style.color = isWinner ? '#16a34a' : '#dc2626';
    }
  } catch (e) {
    console.warn(e);
  }
  setTimeout(() => {
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

    // 관리자면 관리자 탭 표시
    const adminLink = document.getElementById('navbar-admin-link');
    if (adminLink && isAdminUser(currentUser)) adminLink.classList.remove('hidden');

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

/* ── 초기화 ── */
loadBattleNavbar();
bindBattleEvents();
connectBattleWs();
loadBattleProblem();
