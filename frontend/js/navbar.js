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

    /* 관리자면 숨겨진 탭 + 배지 표시 */
    if (isAdminUser(currentUser)) {
      const adminLink = document.getElementById('navbar-admin-link');
      if (adminLink) adminLink.classList.remove('hidden');
      const adminBadge = document.getElementById('navbar-admin-badge');
      if (adminBadge) adminBadge.classList.remove('hidden');
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
