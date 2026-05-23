const darkModeToggle = document.getElementById('darkModeToggle');
const nicknameInput = document.getElementById('nicknameInput');

async function loadSettingsProfile() {
  if (!nicknameInput || !localStorage.getItem('access_token')) return;

  try {
    const user = await getMe();
    nicknameInput.value = user.nickname || '';
  } catch (error) {
    console.warn(error.message);
  }
}

if (darkModeToggle) {
  darkModeToggle.addEventListener('change', () => {
    document.body.classList.toggle('dark-preview', darkModeToggle.checked);
  });
}

loadSettingsProfile();