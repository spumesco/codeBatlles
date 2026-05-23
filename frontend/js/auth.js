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