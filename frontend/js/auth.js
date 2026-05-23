async function handleRegister() {
    const userId = document.getElementById('username').value.trim();
    const nickname = document.getElementById('nickname').value.trim();
    const password = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('password-confirm').value;

    if (!/^[a-zA-Z0-9]{4,20}$/.test(userId)) {
        alert('아이디는 영문/숫자 조합 4~20자여야 합니다.');
        return;
    }
    if (!nickname) {
        alert('닉네임을 입력해주세요.');
        return;
    }
    if (!/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/.test(password)) {
        alert('비밀번호는 영문+숫자+특수문자 조합 8자 이상이어야 합니다.');
        return;
    }
    if (password !== passwordConfirm) {
        alert('비밀번호가 일치하지 않습니다.');
        return;
    }

    try {
        await register(userId, password, nickname);
        alert('회원가입이 완료되었습니다. 로그인해주세요.');
        window.location.href = '/login';
    } catch (e) {
        alert(e.message);
    }
}

async function handleLogin() {
    const userId = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    if (!userId || !password) {
        alert('아이디와 비밀번호를 입력해주세요.');
        return;
    }

    try {
        const data = await apiLogin(userId, password);
        localStorage.setItem('access_token', data.access_token);
        window.location.href = '/main';
    } catch (e) {
        alert(e.message);
    }
}
