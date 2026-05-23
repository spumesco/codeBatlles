authGuard();

const darkModeToggle = document.getElementById('darkModeToggle');
const nicknameInput = document.getElementById('nicknameInput');
const saveBtn = document.getElementById('btn-save');
const cancelBtn = document.getElementById('btn-cancel');

function applyTheme(isDark) {
  document.documentElement.classList.toggle('light', !isDark);
  document.documentElement.classList.toggle('dark', isDark);
  document.body.classList.toggle('dark-preview', isDark);
  localStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light');
}

async function loadSettingsProfile() {
  try {
    const user = await getMe();
    if (nicknameInput) nicknameInput.value = user.nickname || '';
  } catch (error) {
    console.warn(error.message);
  }
}

async function saveSettings() {
  const nickname = nicknameInput?.value.trim();
  if (!nickname) {
    alert('닉네임을 입력해주세요.');
    return;
  }

  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = '저장 중...';
  }

  try {
    await apiRequest('/users/me/nickname', {
      method: 'PATCH',
      body: JSON.stringify({ nickname }),
    });
    alert('저장되었습니다.');
  } catch (error) {
    alert(error.message);
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = '저장';
    }
  }
}

if (saveBtn) saveBtn.addEventListener('click', saveSettings);

if (cancelBtn) {
  cancelBtn.addEventListener('click', () => {
    loadSettingsProfile();
  });
}

if (darkModeToggle) {
  const isDark = localStorage.getItem(THEME_STORAGE_KEY) !== 'light';
  darkModeToggle.checked = isDark;
  applyTheme(isDark);

  darkModeToggle.addEventListener('change', () => {
    applyTheme(darkModeToggle.checked);
  });
}

loadSettingsProfile();
