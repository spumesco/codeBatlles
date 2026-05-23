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
