const RANKINGS = [
  { nickname: 'devKing', userId: 'user02', wins: 31, loses: 8 },
  { nickname: 'algo_pro', userId: 'user07', wins: 28, loses: 9 },
  { nickname: 'byte_king', userId: 'user11', wins: 24, loses: 10 },
  { nickname: '철몽', userId: 'user01', wins: 21, loses: 12 },
  { nickname: 'codeWolf', userId: 'user04', wins: 18, loses: 15 },
  { nickname: 'night_owl', userId: 'user09', wins: 16, loses: 13 },
  { nickname: 'pythonista', userId: 'user15', wins: 12, loses: 11 },
  { nickname: 'fastapi_user', userId: 'user20', wins: 9, loses: 14 }
];

const tbody = document.getElementById('ranking-tbody');
const emptyState = document.getElementById('empty-state');
const searchInput = document.getElementById('search-input');
const sortSelect = document.getElementById('sort-select');

function winRate(user) {
  const total = user.wins + user.loses;
  return total === 0 ? 0 : Math.round((user.wins / total) * 1000) / 10;
}

function updateStats(data) {
  const totalBattles = data.reduce((sum, user) => sum + user.wins + user.loses, 0);
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
  const filtered = RANKINGS.filter(user =>
    user.nickname.toLowerCase().includes(keyword) ||
    user.userId.toLowerCase().includes(keyword)
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

searchInput.addEventListener('input', render);
sortSelect.addEventListener('change', render);
render();