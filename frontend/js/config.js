const API_BASE_URL = '';
const THEME_STORAGE_KEY = 'codebattles-theme';

(function initTheme() {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  const isDark = savedTheme !== 'light';

  document.documentElement.classList.toggle('light', !isDark);
  document.documentElement.classList.toggle('dark', isDark);
  document.body?.classList.toggle('dark-preview', isDark);

  if (!document.querySelector('link[data-theme-style="true"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/css/theme.css?v=global-dark-3';
    link.dataset.themeStyle = 'true';
    document.head.appendChild(link);
  }

  if (!document.querySelector('link[data-navbar-style="true"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/css/navbar.css?v=navbar-stable-1';
    link.dataset.navbarStyle = 'true';
    document.head.appendChild(link);
  }
})();
