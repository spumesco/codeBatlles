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

// Enter 키 지원
document.getElementById('password')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleLogin();
});