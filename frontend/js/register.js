const registerForm = document.getElementById('register-form');

// 백엔드 schemas.py 의 validate_password 와 정확히 동일한 규칙
// 8자 이상 + 소문자 + 대문자 + 숫자 + 특수문자
const PW_SPECIAL_RE = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?`~]/;

function evaluatePassword(pw) {
  return {
    length:  pw.length >= 8,
    lower:   /[a-z]/.test(pw),
    upper:   /[A-Z]/.test(pw),
    digit:   /\d/.test(pw),
    special: PW_SPECIAL_RE.test(pw),
  };
}

function isPasswordValid(pw) {
  const c = evaluatePassword(pw);
  return c.length && c.lower && c.upper && c.digit && c.special;
}

// 실시간 체크리스트 UI 갱신
function updatePasswordChecksUI(pw) {
  const checks = evaluatePassword(pw);
  const map = {
    length:  'pw-check-length',
    lower:   'pw-check-lower',
    upper:   'pw-check-upper',
    digit:   'pw-check-digit',
    special: 'pw-check-special',
  };
  let passedCount = 0;
  for (const [key, id] of Object.entries(map)) {
    const el = document.getElementById(id);
    if (!el) continue;
    const ok = checks[key];
    el.classList.toggle('passed', ok);
    el.classList.toggle('failed', !ok);
    const icon = el.querySelector('.pw-check-icon');
    if (icon) icon.textContent = ok ? '✓' : '✗';
    if (ok) passedCount++;
  }
  // 강도 바: 0/5 → 5/5
  const fill = document.getElementById('password-strength-fill');
  if (fill) {
    const pct = (passedCount / 5) * 100;
    fill.style.width = pct + '%';
    fill.dataset.level = String(passedCount);
  }
}

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
  if (!isPasswordValid(password)) {
    alert('비밀번호 조건을 모두 만족해야 합니다.\n- 8자 이상\n- 대문자 / 소문자 / 숫자 / 특수문자 각각 1개 이상');
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

// 비밀번호 입력란에 실시간 검증 바인딩
const pwInput = document.getElementById('password');
if (pwInput) {
  pwInput.addEventListener('input', (e) => updatePasswordChecksUI(e.target.value));
  // 초기값(빈 문자열)으로 한 번 그려서 모든 항목 'failed' 상태로 표시
  updatePasswordChecksUI('');
}
