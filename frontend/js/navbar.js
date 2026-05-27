function ensureNavbarStyles() {
  if (document.querySelector('link[data-navbar-style="true"]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '/css/navbar.css';
  link.dataset.navbarStyle = 'true';
  document.head.appendChild(link);
}

function isAdminUser(user) {
  return String(user?.role || '').trim().toLowerCase() === 'admin';
}

async function loadNavbar() {
  const container = document.getElementById('navbar-container');
  if (!container) return null;

  ensureNavbarStyles();

  const hasToken = Boolean(getToken());
  let currentUser = null;
  /* 로그인 여부만으로 파일 선택 — 관리자 탭은 JS에서 처리 */
  const navbarPath = hasToken
    ? '/components/user-navbar.html'
    : '/components/guest-navbar.html';

  if (hasToken) {
    try {
      currentUser = await getMe();
    } catch (error) {
      console.warn(error.message);
      clearToken();
      window.location.href = '/login';
      return null;
    }
  }

  try {
    const response = await fetch(`${navbarPath}?v=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Navbar load failed: ${response.status}`);
    container.innerHTML = await response.text();
  } catch (error) {
    console.warn(error.message);
    return null;
  }

  if (hasToken) {
    bindLogoutButton();
    hydrateUserNavbar(currentUser);

    /* DB 의 role 값이 정확히 'admin' 인 사용자만 표시.
       그 외에는 inline style 로 강제로 숨겨서 CSS 우선순위 문제로
       비관리자에게 ADMIN 배지가 노출되는 사고를 차단. */
    const adminLink  = document.getElementById('navbar-admin-link');
    const adminBadge = document.getElementById('navbar-admin-badge');
    if (isAdminUser(currentUser)) {
      if (adminLink)  { adminLink.classList.remove('hidden');  adminLink.style.display  = ''; }
      if (adminBadge) { adminBadge.classList.remove('hidden'); adminBadge.style.display = 'inline-flex'; }
    } else {
      if (adminLink)  { adminLink.classList.add('hidden');  adminLink.style.display  = 'none'; }
      if (adminBadge) { adminBadge.classList.add('hidden'); adminBadge.style.display = 'none'; }
    }
  }

  return container;
}

function bindLogoutButton() {
  const logoutButton = document.getElementById('btn-logout');
  if (!logoutButton) return;

  logoutButton.addEventListener('click', event => {
    event.preventDefault();
    logoutButton.disabled = true;

    apiLogout().catch(error => {
      console.warn(error.message);
    });

    /* 다음 로그인 사용자에게 잔여 매칭 상태가 남지 않도록 정리 */
    try { localStorage.removeItem('matching_state'); } catch (_) {}

    clearToken();
    window.location.replace('/');
  });
}

function hydrateUserNavbar(user) {
  if (!user) return;

  const nickname = document.getElementById('navbar-nickname');
  if (nickname) nickname.textContent = user.nickname || (isAdminUser(user) ? '관리자' : '-');
}

window.navbarReady = loadNavbar();
