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

  const hasToken = Boolean(localStorage.getItem('access_token'));
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
    await hydrateUserNavbar();
  }

  return container;
}

async function hydrateUserNavbar() {
  try {
    const user = await getMe();
    const nickname = document.getElementById('navbar-nickname');
    if (nickname) nickname.textContent = user.nickname;
  } catch (error) {
    console.warn(error.message);
    localStorage.removeItem('access_token');
    window.location.href = '/login';
    return;
  }

  const logoutButton = document.getElementById('btn-logout');
  if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
      try {
        await apiLogout();
      } catch (error) {
        console.warn(error.message);
      } finally {
        localStorage.removeItem('access_token');
        window.location.href = '/';
      }
    });
  }
}

window.navbarReady = loadNavbar();
