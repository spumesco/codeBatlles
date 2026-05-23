const registerForm = document.getElementById('register-form');

function readRegisterForm() {
  return {
    userId: document.getElementById('username').value.trim(),
    nickname: document.getElementById('nickname').value.trim(),
    password: document.getElementById('password').value,
    passwordConfirm: document.getElementById('password-confirm').value
  };
}

function validateRegisterForm({ userId, nickname, password, passwordConfirm }) {
  if (!/^[a-zA-Z0-9]{4,20}$/.test(userId)) {
    alert('아이디는 영문/숫자 조합 4~20자여야 합니다.');
    return false;
  }
  if (!nickname.trim()) {
    alert('닉네임을 입력해주세요.');
    return false;
  }
  if (!/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/.test(password)) {
    alert('비밀번호는 영문+숫자+특수문자 조합 8자 이상이어야 합니다.');
    return false;
  }
  if (password !== passwordConfirm) {
    alert('비밀번호가 일치하지 않습니다.');
    return false;
  }
  return true;
}

async function handleRegisterSubmit(event) {
  event.preventDefault();
  const form = readRegisterForm();
  if (!validateRegisterForm(form)) return;

  const btn = document.querySelector('.register-submit');
  if (btn) { btn.disabled = true; btn.textContent = '처리 중...'; }

  try {
    await register(form.userId, form.password, form.nickname);
    alert('회원가입이 완료되었습니다. 로그인해주세요.');
    window.location.href = '/login';
  } catch (error) {
    alert(error.message);
    if (btn) { btn.disabled = false; btn.textContent = '회원가입'; }
  }
}

if (registerForm) {
  registerForm.addEventListener('submit', handleRegisterSubmit);
}