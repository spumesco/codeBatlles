function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function renderProfileLoadFailure() {
  setText('me-nickname', '불러오기 실패');
  setText('me-user-id', '-');
  setText('me-ranking', '-');
}

function renderMyProfile(user) {
  setText('me-nickname', user.nickname);
  setText('me-user-id', user.user_id);
  setText('me-ranking', user.rank ? `#${user.rank}` : '-');

  const record = document.getElementById('me-record');
  if (record) {
    record.innerHTML = `<span class="text-win">${user.win_count}승</span> <span class="text-lose">${user.lose_count}패</span>`;
  }

  const status = document.getElementById('me-status');
  if (status) {
    status.classList.remove('status-online', 'status-battling', 'status-matching');
    if (user.is_battling) {
      status.classList.add('status-battling');
      status.textContent = '● 배틀 중';
    } else if (user.is_online) {
      status.classList.add('status-online');
      status.textContent = '● 대기 중';
    } else {
      status.classList.add('status-matching');
      status.textContent = '● 오프라인';
    }
  }
}

async function loadMyProfile() {
  if (!localStorage.getItem('access_token')) {
    window.location.href = '/login';
    return;
  }

  try {
    const user = await getMe();
    renderMyProfile(user);
  } catch (error) {
    console.warn(error.message);
    renderProfileLoadFailure();
    localStorage.removeItem('access_token');
    window.location.href = '/login';
  }
}

const requestButton = document.getElementById('btn-request-battle');
const opponentInput = document.getElementById('opponent-nickname');

function goBattleRequest(opponent) {
  const target = (opponent || '상대 사용자').trim() || '상대 사용자';
  window.location.href = `/matching?mode=request&opponent=${encodeURIComponent(target)}`;
}

if (requestButton && opponentInput) {
  requestButton.addEventListener('click', () => goBattleRequest(opponentInput.value));
  opponentInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') goBattleRequest(opponentInput.value);
  });
}

document.querySelectorAll('.btn-request-user').forEach(button => {
  button.addEventListener('click', () => goBattleRequest(button.dataset.opponent));
});

loadMyProfile();
