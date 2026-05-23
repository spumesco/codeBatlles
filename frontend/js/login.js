// 이미 로그인된 경우 메인으로 이동
if (getToken()) {
  document.documentElement.hidden = true;
  window.location.replace('/main');
}

// 저장된 아이디 복원
const savedId = localStorage.getItem('saved_user_id');
const saveIdOn = localStorage.getItem('save_id_on');
if (savedId && saveIdOn) {
  const usernameInput = document.getElementById('username');
  const saveIdChk = document.getElementById('chk-save-id');
  if (usernameInput) usernameInput.value = savedId;
  if (saveIdChk) saveIdChk.checked = true;
}

const loginButton = document.getElementById('btn-login');
if (loginButton) {
  loginButton.addEventListener('click', handleLogin);
}

document.getElementById('password')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleLogin();
});