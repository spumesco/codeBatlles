const mainButton = document.getElementById('btn-main');

if (mainButton) {
  mainButton.addEventListener('click', () => {
    window.location.href = '/main';
  });
}