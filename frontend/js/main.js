function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function renderProfileLoadFailure() {
  setText('me-nickname', '?븍뜄???븍┛ ??쎈솭');
  setText('me-user-id', '-');
  setText('me-ranking', '-');
}

function renderMyProfile(user) {
  setText('me-nickname', user.nickname);
  setText('me-user-id', user.user_id);
  setText('me-ranking', user.rank ? `#${user.rank}` : '-');

  const record = document.getElementById('me-record');
  if (record) {
    record.innerHTML = `<span class="text-win">${user.win_count}??/span> <span class="text-lose">${user.lose_count}??/span>`;
  }

  const status = document.getElementById('me-status');
  if (status) {
    status.classList.remove('status-online', 'status-battling', 'status-matching');
    if (user.is_battling) {
      status.classList.add('status-battling');
      status.textContent = '??獄쏄퀬? 餓?;
    } else if (user.is_online) {
      status.classList.add('status-online');
      status.textContent = '????疫?餓?;
    } else {
      status.classList.add('status-matching');
      status.textContent = '????쎈늄??깆뵥';
    }
  }
}

async function loadMyProfile() {
  if (!getToken()) {
    window.location.href = '/login';
    return;
  }

  try {
    const user = await getMe();
    renderMyProfile(user);
  } catch (error) {
    console.warn(error.message);
    renderProfileLoadFailure();
    clearToken();
    window.location.href = '/login';
  }
}

const requestButton = document.getElementById('btn-request-battle');
const opponentInput = document.getElementById('opponent-nickname');

function goBattleRequest(opponent) {
  const target = (opponent || '?怨? ?????).trim() || '?怨? ?????;
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
