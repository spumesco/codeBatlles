authGuard();

const ALL_RECORDS = [
  { battleId: 1012, result: 'win', problem: '???섏쓽 ??, opponent: 'devKing', time: '04:32', submit: 2, date: '2026-05-18' },
  { battleId: 1011, result: 'lose', problem: '洹몃━???곗뒿', opponent: 'codeWolf', time: '07:11', submit: 4, date: '2026-05-17' },
  { battleId: 1010, result: 'win', problem: '?쇰낫?섏튂', opponent: 'algo_pro', time: '03:05', submit: 1, date: '2026-05-15' },
  { battleId: 1009, result: 'win', problem: 'BFS ?먯깋', opponent: 'byte_king', time: '09:47', submit: 3, date: '2026-05-13' },
  { battleId: 1008, result: 'lose', problem: '?숈쟻 ?꾨줈洹몃옒諛?, opponent: 'devKing', time: '12:30', submit: 6, date: '2026-05-11' },
  { battleId: 1007, result: 'win', problem: '???섏쓽 ??, opponent: 'night_owl', time: '02:58', submit: 1, date: '2026-05-09' },
  { battleId: 1006, result: 'lose', problem: '洹몃━???곗뒿', opponent: 'algo_pro', time: '08:22', submit: 5, date: '2026-05-07' },
  { battleId: 1005, result: 'win', problem: '?쇰낫?섏튂', opponent: 'codeWolf', time: '05:14', submit: 2, date: '2026-05-05' },
  { battleId: 1004, result: 'win', problem: 'BFS ?먯깋', opponent: 'byte_king', time: '06:39', submit: 2, date: '2026-05-03' },
  { battleId: 1003, result: 'lose', problem: '???섏쓽 ??, opponent: 'night_owl', time: '10:05', submit: 7, date: '2026-05-01' },
  { battleId: 1002, result: 'win', problem: '?숈쟻 ?꾨줈洹몃옒諛?, opponent: 'devKing', time: '11:20', submit: 3, date: '2026-04-28' },
  { battleId: 1001, result: 'lose', problem: 'BFS ?먯깋', opponent: 'codeWolf', time: '14:55', submit: 8, date: '2026-04-25' }
];

const PAGE_SIZE = 8;
let currentPage = 1;
let filtered = [...ALL_RECORDS];

function updateStats(data) {
  const total = data.length;
  const wins = data.filter(record => record.result === 'win').length;
  const loses = total - wins;
  const rate = total ? `${Math.round((wins / total) * 100)}%` : '0%';

  const avgSec = data.length
    ? Math.round(data.reduce((acc, record) => {
      const [m, s] = record.time.split(':').map(Number);
      return acc + m * 60 + s;
    }, 0) / data.length)
    : 0;

  const avgMin = String(Math.floor(avgSec / 60)).padStart(2, '0');
  const avgS = String(avgSec % 60).padStart(2, '0');

  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-win').textContent = wins;
  document.getElementById('stat-lose').textContent = loses;
  document.getElementById('stat-rate').textContent = rate;
  document.getElementById('stat-avg').textContent = total ? `${avgMin}:${avgS}` : '00:00';
}

function getRecordKey(record) {
  return `${record.problem}_${record.opponent}_${record.date}`;
}

function renderTable(data, page) {
  const tbody = document.getElementById('record-tbody');
  const emptyEl = document.getElementById('empty-state');
  const start = (page - 1) * PAGE_SIZE;
  const pageData = data.slice(start, start + PAGE_SIZE);

  tbody.innerHTML = '';

  if (data.length === 0) {
    emptyEl.classList.remove('hidden');
    return;
  }

  emptyEl.classList.add('hidden');

  pageData.forEach(record => {
    const isWin = record.result === 'win';
    const tr = document.createElement('tr');
    tr.className = 'record-row border-b border-outline-variant last:border-0';
    const key = getRecordKey(record);

    tr.innerHTML = `
      <td class="px-5 py-4">
        <span class="inline-block px-3 py-1 rounded-full text-xs font-bold ${isWin ? 'badge-win' : 'badge-lose'}">
          ${isWin ? '?밸━' : '?⑤같'}
        </span>
      </td>
      <td class="px-5 py-4 font-code-md text-body-sm text-primary font-bold">#${record.battleId}</td>
      <td class="px-5 py-4 font-body-sm text-body-sm text-on-surface font-medium">${record.problem}</td>
      <td class="px-5 py-4 font-code-md text-body-sm text-secondary">${record.opponent}</td>
      <td class="px-5 py-4 font-code-md text-body-sm text-on-surface">${record.time}</td>
      <td class="px-5 py-4 font-body-sm text-body-sm text-on-surface text-center">${record.submit}??/td>
      <td class="px-5 py-4 font-body-sm text-body-sm text-secondary">${record.date}</td>
      <td class="px-5 py-4">
        <button type="button" class="btn-detail" data-record-key="${encodeURIComponent(key)}">?곸꽭蹂닿린</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('.btn-detail').forEach(button => {
    button.addEventListener('click', () => {
      window.location.href = `history_detail.html?key=${button.dataset.recordKey}`;
    });
  });
}

function renderPagination(total, page) {
  const container = document.getElementById('pagination');
  const totalPages = Math.ceil(total / PAGE_SIZE);
  container.innerHTML = '';
  if (totalPages <= 1) return;

  const prev = document.createElement('button');
  prev.className = 'page-btn';
  prev.innerHTML = '<span class="material-symbols-outlined">chevron_left</span>';
  prev.disabled = page === 1;
  prev.addEventListener('click', () => goPage(page - 1));
  container.appendChild(prev);

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement('button');
    btn.className = `page-btn${i === page ? ' active' : ''}`;
    btn.textContent = i;
    btn.addEventListener('click', () => goPage(i));
    container.appendChild(btn);
  }

  const next = document.createElement('button');
  next.className = 'page-btn';
  next.innerHTML = '<span class="material-symbols-outlined">chevron_right</span>';
  next.disabled = page === totalPages;
  next.addEventListener('click', () => goPage(page + 1));
  container.appendChild(next);
}

function goPage(page) {
  currentPage = page;
  renderTable(filtered, currentPage);
  renderPagination(filtered.length, currentPage);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function applyFilter() {
  const tab = document.querySelector('.filter-tab.active').dataset.filter;
  const problem = document.getElementById('filter-problem').value;
  const period = document.getElementById('filter-period').value;
  const search = document.getElementById('filter-search').value.trim().toLowerCase();
  const now = new Date('2026-05-23T00:00:00');

  filtered = ALL_RECORDS.filter(record => {
    if (tab !== 'all' && record.result !== tab) return false;
    if (problem && record.problem !== problem) return false;
    if (search && !record.opponent.toLowerCase().includes(search)) return false;
    if (period) {
      const diff = (now - new Date(record.date)) / (1000 * 60 * 60 * 24);
      if (diff > Number(period)) return false;
    }
    return true;
  });

  currentPage = 1;
  updateStats(filtered);
  renderTable(filtered, currentPage);
  renderPagination(filtered.length, currentPage);
}

function resetFilters() {
  document.querySelectorAll('.filter-tab').forEach(button => button.classList.remove('active'));
  document.querySelector('[data-filter="all"]').classList.add('active');
  document.getElementById('filter-problem').value = '';
  document.getElementById('filter-period').value = '';
  document.getElementById('filter-search').value = '';
  filtered = [...ALL_RECORDS];
  currentPage = 1;
  updateStats(filtered);
  renderTable(filtered, currentPage);
  renderPagination(filtered.length, currentPage);
}

function bindHistoryEvents() {
  document.querySelectorAll('.filter-tab').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.filter-tab').forEach(item => item.classList.remove('active'));
      button.classList.add('active');
      applyFilter();
    });
  });

  document.getElementById('filter-problem').addEventListener('change', applyFilter);
  document.getElementById('filter-period').addEventListener('change', applyFilter);
  document.getElementById('filter-search').addEventListener('input', applyFilter);
  document.getElementById('btn-reset').addEventListener('click', resetFilters);
}

bindHistoryEvents();
updateStats(filtered);
renderTable(filtered, currentPage);
renderPagination(filtered.length, currentPage);
