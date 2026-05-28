authGuard();

const tbody = document.getElementById('ranking-tbody');
const emptyState = document.getElementById('empty-state');
const searchInput = document.getElementById('search-input');
const sortSelect = document.getElementById('sort-select');
const myRankEl = document.getElementById('stat-my-rank');

let allUsers = [];
let myUserId = null;   // 현재 로그인 사용자의 user_id (문자열)

/* ── 유틸 ── */
function winRate(user) {
  const total = user.wins + user.loses;
  return total === 0 ? 0 : Math.round((user.wins / total) * 1000) / 10;
}

function updateStats(data) {
  /* 본인 통계 — 로그인 사용자(myUserId) 기준.
     allUsers 가 검색/필터링되기 전 원본이라 filtered 가 아닌 allUsers 에서 찾는다.
     본인이 leaderboard 응답에 없는 경우(미접속/제외) 0 으로 폴백. */
  let myBattles = 0;
  let myRate = 0;
  if (myUserId) {
    const me = allUsers.find(u => u.userId === myUserId);
    if (me) {
      myBattles = me.wins + me.loses;
      if (myBattles > 0) myRate = winRate(me);
    }
  }

  document.getElementById('stat-users').textContent = data.length;
  document.getElementById('stat-battles').textContent = myBattles;
  document.getElementById('stat-rate').textContent = `${myRate}%`;
}

/* 내 순위는 항상 "전체 정렬" 기준으로 계산해야 — 검색/필터 결과에 영향받지 않음. */
function updateMyRank() {
  if (!myRankEl) return;
  if (!myUserId) { myRankEl.textContent = '-'; return; }
  const sortedAll = sortData(allUsers);
  const idx = sortedAll.findIndex(u => u.userId === myUserId);
  if (idx === -1) { myRankEl.textContent = '-'; return; }
  myRankEl.textContent = `#${idx + 1}`;
}

function sortData(data) {
  const sortBy = sortSelect.value;
  return [...data].sort((a, b) => {
    if (sortBy === 'rate') return winRate(b) - winRate(a) || b.wins - a.wins;
    if (sortBy === 'battles') return (b.wins + b.loses) - (a.wins + a.loses) || b.wins - a.wins;
    return b.wins - a.wins || winRate(b) - winRate(a);
  });
}

function render() {
  const keyword = searchInput.value.trim().toLowerCase();
  const filtered = allUsers.filter(u =>
    u.nickname.toLowerCase().includes(keyword) ||
    u.userId.toLowerCase().includes(keyword)
  );
  const sorted = sortData(filtered);

  tbody.innerHTML = '';
  emptyState.classList.toggle('hidden', sorted.length !== 0);

  sorted.forEach((user, index) => {
    const rank = index + 1;
    const total = user.wins + user.loses;
    const badgeClass = rank <= 3 ? `rank-${rank}` : '';
    const tr = document.createElement('tr');
    tr.className = 'ranking-row border-b border-outline-variant last:border-0';
    tr.innerHTML = `
      <td class="px-5 py-4"><span class="rank-badge ${badgeClass}">#${rank}</span></td>
      <td class="px-5 py-4 font-body-md text-body-md text-on-surface font-bold">${user.nickname}</td>
      <td class="px-5 py-4 font-code-md text-body-sm text-secondary">${user.userId}</td>
      <td class="px-5 py-4 font-code-md text-body-sm win-cell">${user.wins}</td>
      <td class="px-5 py-4 font-code-md text-body-sm lose-cell">${user.loses}</td>
      <td class="px-5 py-4 font-code-md text-body-sm text-primary font-bold">${winRate(user)}%</td>
      <td class="px-5 py-4 font-code-md text-body-sm text-on-surface">${total}</td>
    `;
    tbody.appendChild(tr);
  });

  updateStats(sorted);
  updateMyRank();
}

/* ── API 로드 ── */
async function loadLeaderboard() {
  try {
    /* 본인 식별값 — 내 순위 계산에 필요. 실패해도 랭킹 자체는 표시한다. */
    try {
      const me = await getMe();
      myUserId = me.user_id;
    } catch (_) { myUserId = null; }

    const users = await apiRequest('/users/leaderboard?limit=100');
    allUsers = users.map(u => ({
      nickname: u.nickname,
      userId: u.user_id,
      wins: u.win_count,
      loses: u.lose_count,
    }));
  } catch (e) {
    console.warn('leaderboard load failed:', e.message);
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-secondary py-8">불러오기 실패</td></tr>';
    return;
  }
  render();
}

searchInput.addEventListener('input', render);
sortSelect.addEventListener('change', render);
loadLeaderboard();
