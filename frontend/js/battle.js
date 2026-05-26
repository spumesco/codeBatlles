authGuard();

let sec = 0;

function isAdminUser(user) {
  return String(user?.role || '').trim().toLowerCase() === 'admin';
}

setInterval(() => {
  sec++;
  const m = String(Math.floor(sec / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  const timerEl = document.getElementById('timer');
  if (timerEl) timerEl.textContent = `${m}:${s}`;
}, 1000);

function toggleDrawer() {
  const drawer = document.getElementById('drawer');
  const toggleButton = document.getElementById('toggleDrawer');
  if (!drawer) return;

  drawer.classList.toggle('open');
  if (toggleButton) {
    toggleButton.textContent = drawer.classList.contains('open') ? '문제 닫기' : '문제 보기';
  }
}

function submitCode() {
  const result = document.getElementById('judgeResult');
  if (!result) return;

  result.textContent = '채점 중...';
  result.style.color = '#0058bc';

  setTimeout(() => {
    result.textContent = '채점 결과: Accepted';
    result.style.color = '#16a34a';
    setTimeout(() => {
      location.href = '/result';
    }, 1000);
  }, 1500);
}

function startCountdown() {
  const modal = document.getElementById('countdownModal');
  const number = document.getElementById('countdownNumber');
  if (!modal || !number) return;

  let count = 5;
  number.textContent = count;

  const interval = setInterval(() => {
    count--;
    if (count <= 0) {
      clearInterval(interval);
      modal.classList.add('hidden');
      return;
    }
    number.textContent = count;
  }, 1000);
}

function getBattleId() {
  const params = new URLSearchParams(location.search);
  return params.get('battle_id') || params.get('id') || localStorage.getItem('battle_id');
}

function renderProblem(problem) {
  if (!problem) return;

  document.getElementById('problemTitle').textContent = problem.title || 'Untitled Problem';
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
    const response = await fetch(`/battles/${battleId}`, { credentials: 'include' });
    if (!response.ok) return;
    const battle = await response.json();
    renderProblem(battle.problem);
  } catch (error) {
    console.warn('battle problem load failed', error);
  }
}

async function loadBattleNavbar() {
  const container = document.getElementById('navbar-container');
  if (!container) return;

  let currentUser = null;
  let navbarPath = '/components/battle-navbar.html';

  try {
    currentUser = await getMe();
    if (isAdminUser(currentUser)) {
      navbarPath = '/components/admin-navbar.html';
    }
  } catch (error) {
    console.warn(error.message);
  }

  try {
    const response = await fetch(navbarPath + '?v=' + Date.now(), { cache: 'no-store' });
    if (!response.ok) throw new Error(`battle-navbar load failed: ${response.status}`);
    container.innerHTML = await response.text();
    hydrateBattleNavbar(currentUser);
    bindBattleNavbarLogout();
  } catch (error) {
    console.warn(error.message);
  }
}

function hydrateBattleNavbar(user) {
  if (!user) return;

  const nickname = document.getElementById('navbar-nickname');
  if (nickname) nickname.textContent = user.nickname || (isAdminUser(user) ? '관리자' : '-');
}

function bindBattleNavbarLogout() {
  const logoutButton = document.getElementById('btn-logout');
  if (!logoutButton) return;

  logoutButton.addEventListener('click', event => {
    event.preventDefault();
    logoutButton.disabled = true;

    apiLogout().catch(error => {
      console.warn(error.message);
    });

    clearToken();
    window.location.replace('/');
  });
}

function bindBattleEvents() {
  const drawerCloseButton = document.getElementById('drawerCloseButton');
  const submitButton = document.getElementById('submitCodeButton');

  if (drawerCloseButton) drawerCloseButton.addEventListener('click', toggleDrawer);
  if (submitButton) submitButton.addEventListener('click', submitCode);
}

loadBattleNavbar();
bindBattleEvents();
startCountdown();
loadBattleProblem();
