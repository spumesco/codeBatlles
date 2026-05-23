function ensureNavbarStyles() {
  if (document.querySelector('link[data-navbar-style="true"]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '/css/navbar.css';
  link.dataset.navbarStyle = 'true';
  document.head.appendChild(link);
}

async function loadNavbar() {
  const container = document.getElementById('navbar-container');
  if (!container) return null;

  ensureNavbarStyles();

  const hasToken = Boolean(getToken());
  const navbarPath = hasToken ? '/components/user-navbar.html' : '/components/guest-navbar.html';

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
    await hydrateUserNavbar();
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

async function hydrateUserNavbar() {
  try {
    const user = await getMe();
    const nickname = document.getElementById('navbar-nickname');
    if (nickname) nickname.textContent = user.nickname;
  } catch (error) {
    console.warn(error.message);
    clearToken();
    window.location.href = '/login';
    return;
  }
}

window.navbarReady = loadNavbar();
