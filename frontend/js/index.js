const startButton = document.getElementById('btn-start');
const registerButton = document.getElementById('btn-register');

if (startButton) {
  startButton.addEventListener('click', async () => {
    if (!getToken()) {
      window.location.href = '/login';
      return;
    }

    startButton.disabled = true;

    try {
      await getMe();
      window.location.href = '/main';
    } catch (error) {
      clearToken();
      window.location.href = '/login';
    }
  });
}

if (registerButton) {
  registerButton.addEventListener('click', () => {
    window.location.href = '/register';
  });
}
