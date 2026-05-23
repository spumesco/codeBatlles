/* ── 토큰 스토리지 헬퍼 ── */
// 기본: sessionStorage (탭/브라우저 닫으면 자동 로그아웃)
// 자동 로그인 선택 시: localStorage (브라우저 재시작 후에도 유지)

function getToken() {
  return sessionStorage.getItem('access_token') || localStorage.getItem('access_token');
}

function setToken(token, persist) {
  if (persist) {
    localStorage.setItem('access_token', token);
    sessionStorage.removeItem('access_token');
  } else {
    sessionStorage.setItem('access_token', token);
    localStorage.removeItem('access_token');
  }
}

function clearToken() {
  sessionStorage.removeItem('access_token');
  localStorage.removeItem('access_token');
}

/* ── 공통 요청 헬퍼 ── */
async function apiRequest(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  Object.assign(headers, options.headers || {});

  const res = await fetch(API_BASE_URL + path, { ...options, headers });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.detail || '요청 실패');
  return data;
}

/* ── 인증 API ── */
async function register(user_id, password, nickname) {
  return apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ user_id, password, nickname }),
  });
}

async function apiLogin(user_id, password) {
  return apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ user_id, password }),
  });
}

async function apiLogout() {
  return apiRequest('/auth/logout', { method: 'POST' });
}

async function getMe() {
  return apiRequest('/auth/me');
}

/* ── 가드 함수 ── */
function authGuard() {
  if (!getToken()) {
    document.documentElement.hidden = true;
    window.location.replace('/login');
  }
}

async function adminGuard() {
  if (!getToken()) {
    document.documentElement.hidden = true;
    window.location.replace('/login');
    return;
  }
  try {
    const user = await getMe();
    if (user.role !== 'admin') {
      document.documentElement.hidden = true;
      window.location.replace('/main');
    }
  } catch (e) {
    clearToken();
    document.documentElement.hidden = true;
    window.location.replace('/login');
  }
}