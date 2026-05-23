async function handleLogin() {
  const userId = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const saveIdChecked = document.getElementById('chk-save-id')?.checked ?? false;
  const autoLoginChecked = document.getElementById('chk-auto-login')?.checked ?? false;

  if (!userId || !password) {
    alert('아이디와 비밀번호를 입력해주세요.');
    return;
  }

  const btn = document.getElementById('btn-login');
  if (btn) { btn.disabled = true; btn.textContent = '로그인 중...'; }

  try {
    const data = await apiLogin(userId, password);

    // 아이디 저장
    if (saveIdChecked) {
      localStorage.setItem('saved_user_id', userId);
      localStorage.setItem('save_id_on', '1');
    } else {
      localStorage.removeItem('saved_user_id');
      localStorage.removeItem('save_id_on');
    }

    // 자동 로그인이면 localStorage, 아니면 sessionStorage
    setToken(data.access_token, autoLoginChecked);

    window.location.href = '/main';
  } catch (e) {
    alert(e.message);
    if (btn) { btn.disabled = false; btn.textContent = '로그인'; }
  }
}