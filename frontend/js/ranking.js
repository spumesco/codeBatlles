authGuard();

const tbody = document.getElementById('ranking-tbody');
const emptyState = document.getElementById('empty-state');
const searchInput = document.getElementById('search-input');
const sortSelect = document.getElementById('sort-select');

<<<<<<< Updated upstream
let allUsers = [];

/* ── 유틸 ── */
=======
let ALL_RANKINGS = [];

>>>>>>> Stashed changes
function winRate(user) {
  const total = user.wins + user.loses;
  return total === 0 ? 0 : Math.round((user.wins / total) * 1000) / 10;
}

function updateStats(data) {
  const totalBattles = data.reduce((sum, u) => sum + u.wins + u.loses, 0);
  const bestRate = data.length ? Math.max(...data.map(winRate)) : 0;
  document.getElementById('stat-users').textContent = data.length;
  document.getElementById('stat-battles').textContent = totalBattles;
  document.getElementById('stat-rate').textContent = `${bestRate}%`;
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
<<<<<<< Updated upstream
  const filtered = allUsers.filter(u =>
    u.nickname.toLowerCase().includes(keyword) ||
    u.userId.toLowerCase().includes(keyword)
=======
  const filtered = ALL_RANKINGS.filter(user =>
    user.nickname.toLowerCase().includes(keyword) ||
    user.userId.toLowerCase().includes(keyword)
>>>>>>> Stashed changes
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
}

<<<<<<< Updated upstream
/* ── API 로드 ── */
async function loadLeaderboard() {
  try {
    const users = await apiRequest('/users/leaderboard?limit=100');
    allUsers = users.map(u => ({
=======
async function loadRankings() {
  try {
    const users = await apiRequest('/users/leaderboard?limit=100');
    ALL_RANKINGS = users.map(u => ({
>>>>>>> Stashed changes
      nickname: u.nickname,
      userId: u.user_id,
      wins: u.win_count,
      loses: u.lose_count,
    }));
  } catch (e) {
<<<<<<< Updated upstream
    console.warn('leaderboard load failed:', e.message);
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-secondary py-8">불러오기 실패</td></tr>';
    return;
=======
    console.warn('랭킹 로드 실패:', e.message);
    ALL_RANKINGS = [];
>>>>>>> Stashed changes
  }
  render();
}

searchInput.addEventListener('input', render);
sortSelect.addEventListener('change', render);
<<<<<<< Updated upstream
loadLeaderboard();
=======
loadRankings();
>>>>>>> Stashed changes
