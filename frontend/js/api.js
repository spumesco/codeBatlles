/* ── 공통 요청 헬퍼 ── */
async function apiRequest(path, options = {}) {
  const token = localStorage.getItem('access_token');
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

/**
 * 로그인 여부 확인. 토큰 없으면 즉시 /login 으로 이동.
 * 페이지 JS 최상단에서 호출하세요.
 */
function authGuard() {
  if (!localStorage.getItem('access_token')) {
    document.documentElement.hidden = true;
    window.location.replace('/login');
  }
}

/**
 * 관리자 여부 확인. 토큰 없으면 /login, 일반 유저면 /main 으로 이동.
 * async 함수이므로 await 로 호출하세요.
 */
async function adminGuard() {
  if (!localStorage.getItem('access_token')) {
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
    localStorage.removeItem('access_token');
    document.documentElement.hidden = true;
    window.location.replace('/login');
  }
}
