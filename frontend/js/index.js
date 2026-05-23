const startButton = document.getElementById('btn-start');
const registerButton = document.getElementById('btn-register');

if (startButton) {
  startButton.addEventListener('click', () => {
    window.location.href = '/main';
  });
}

if (registerButton) {
  registerButton.addEventListener('click', () => {
    window.location.href = '/register';
  });
}