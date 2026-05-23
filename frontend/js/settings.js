authGuard();

const darkModeToggle = document.getElementById('darkModeToggle');
const nicknameInput = document.getElementById('nicknameInput');

async function loadSettingsProfile() {
  try {
    const user = await getMe();
    if (nicknameInput) nicknameInput.value = user.nickname || '';
  } catch (error) {
    console.warn(error.message);
  }
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
