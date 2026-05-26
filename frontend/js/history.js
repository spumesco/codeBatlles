authGuard();

const ALL_RECORDS = [
  { battleId: 1012, result: 'win', problem: 'A+B', opponent: 'devKing', time: '04:32', submit: 2, date: '2026-05-18' },
  { battleId: 1011, result: 'lose', problem: '배열 합', opponent: 'codeWolf', time: '07:11', submit: 4, date: '2026-05-17' },
  { battleId: 1010, result: 'win', problem: '괄호 검사', opponent: 'algo_pro', time: '03:05', submit: 1, date: '2026-05-15' },
  { battleId: 1009, result: 'win', problem: '최단 경로', opponent: 'byte_king', time: '09:47', submit: 3, date: '2026-05-13' },
  { battleId: 1008, result: 'lose', problem: '동적 프로그래밍', opponent: 'devKing', time: '12:30', submit: 6, date: '2026-05-11' },
  { battleId: 1007, result: 'win', problem: 'A+B', opponent: 'night_owl', time: '02:58', submit: 1, date: '2026-05-09' },
  { battleId: 1006, result: 'lose', problem: '배열 합', opponent: 'algo_pro', time: '08:22', submit: 5, date: '2026-05-07' },
  { battleId: 1005, result: 'win', problem: '괄호 검사', opponent: 'codeWolf', time: '05:14', submit: 2, date: '2026-05-05' },
  { battleId: 1004, result: 'win', problem: '최단 경로', opponent: 'byte_king', time: '06:39', submit: 2, date: '2026-05-03' },
  { battleId: 1003, result: 'lose', problem: 'A+B', opponent: 'night_owl', time: '10:05', submit: 7, date: '2026-05-01' },
  { battleId: 1002, result: 'win', problem: '동적 프로그래밍', opponent: 'devKing', time: '11:20', submit: 3, date: '2026-04-28' },
  { battleId: 1001, result: 'lose', problem: '최단 경로', opponent: 'codeWolf', time: '14:55', submit: 8, date: '2026-04-25' }
];

const DETAIL_OVERRIDES = {
  '1012_A+B_devKing_2026-05-18': {
    mySubmits: [
      { lang: 'Python', verdict: 'Wrong Answer', at: '21:11' },
      { lang: 'Python', verdict: 'Accepted', at: '21:14' }
    ],
    oppSubmits: [
      { lang: 'Java', verdict: 'Wrong Answer', at: '21:12' },
      { lang: 'Java', verdict: 'Wrong Answer', at: '21:13' }
    ]
  },
  '1011_배열 합_codeWolf_2026-05-17': {
    mySubmits: [
      { lang: 'Python', verdict: 'Wrong Answer', at: '19:02' },
      { lang: 'Python', verdict: 'Runtime Error', at: '19:04' },
      { lang: 'Python', verdict: 'Wrong Answer', at: '19:06' },
      { lang: 'Python', verdict: 'Wrong Answer', at: '19:07' }
    ],
    oppSubmits: [
      { lang: 'C++', verdict: 'Wrong Answer', at: '19:03' },
      { lang: 'C++', verdict: 'Accepted', at: '19:06' }
    ]
  },
  '1010_괄호 검사_algo_pro_2026-05-15': {
    mySubmits: [
      { lang: 'Python', verdict: 'Accepted', at: '20:23' }
    ],
    oppSubmits: [
      { lang: 'C++', verdict: 'Compilation Error', at: '20:22' }
    ]
  }
};

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
  return `${record.battleId}_${record.problem}_${record.opponent}_${record.date}`;
}

function verdictClass(verdict) {
  if (verdict === 'Accepted') return 'verdict-ac';
  if (verdict === 'Wrong Answer') return 'verdict-wa';
  if (verdict === 'Runtime Error') return 'verdict-re';
  if (verdict === 'Time Limit') return 'verdict-tle';
  return 'verdict-etc';
}

function renderSubmits(list) {
  if (!list || list.length === 0) {
    return '<p class="text-secondary text-sm">제출 기록 없음</p>';
  }

  return list.map((submit, index) => `
    <div class="history-submit-row">
      <span class="history-submit-index">${index + 1}</span>
      <span class="history-submit-lang">${submit.lang}</span>
      <span class="inline-block px-2 py-0.5 rounded text-xs font-bold ${verdictClass(submit.verdict)}">${submit.verdict}</span>
      <span class="history-submit-time">${submit.at}</span>
    </div>
  `).join('');
}

function getRecordDetail(record) {
  const key = getRecordKey(record);
  const override = DETAIL_OVERRIDES[key] || {};
  const [minutes] = record.time.split(':').map(Number);
  const endHour = 20;
  const endMinute = 30;
  const startMinute = Math.max(0, endMinute - minutes);
  const start = `${record.date} ${String(endHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`;
  const end = `${record.date} ${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;

  return {
    ...record,
    start,
    end,
    mySubmits: override.mySubmits || [
      { lang: 'Python', verdict: record.result === 'win' ? 'Accepted' : 'Wrong Answer', at: `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}` }
    ],
    oppSubmits: override.oppSubmits || [
      { lang: 'Java', verdict: record.result === 'lose' ? 'Accepted' : 'Wrong Answer', at: `${String(endHour).padStart(2, '0')}:${String(Math.max(1, endMinute - 1)).padStart(2, '0')}` }
    ]
  };
}

function openDetailDrawer(record) {
  const detail = getRecordDetail(record);
  const isWin = detail.result === 'win';
  const drawer = document.getElementById('history-detail-drawer');
  const backdrop = document.getElementById('history-detail-backdrop');
  const badge = document.getElementById('drawer-result-badge');

  drawer.hidden = false;
  backdrop.hidden = false;

  document.getElementById('drawer-battle-id').textContent = `경기 #${detail.battleId}`;
  document.getElementById('drawer-problem').textContent = detail.problem;
  document.getElementById('drawer-opponent').textContent = detail.opponent;
  document.getElementById('drawer-start').textContent = detail.start;
  document.getElementById('drawer-end').textContent = detail.end;
  document.getElementById('drawer-time').textContent = detail.time;
  document.getElementById('drawer-my-submissions').innerHTML = renderSubmits(detail.mySubmits);
  document.getElementById('drawer-opp-submissions').innerHTML = renderSubmits(detail.oppSubmits);

  badge.textContent = isWin ? '승리' : '패배';
  badge.className = `inline-block px-4 py-2 rounded-full text-sm font-bold ${isWin ? 'badge-win' : 'badge-lose'}`;

  drawer.classList.add('open');
  backdrop.classList.add('open');
  drawer.setAttribute('aria-hidden', 'false');
  backdrop.setAttribute('aria-hidden', 'false');
}

function closeDetailDrawer() {
  const drawer = document.getElementById('history-detail-drawer');
  const backdrop = document.getElementById('history-detail-backdrop');
  drawer.classList.remove('open');
  backdrop.classList.remove('open');
  drawer.setAttribute('aria-hidden', 'true');
  backdrop.setAttribute('aria-hidden', 'true');
  drawer.hidden = true;
  backdrop.hidden = true;
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
          ${isWin ? '승리' : '패배'}
        </span>
      </td>
      <td class="px-5 py-4 font-code-md text-body-sm text-primary font-bold">#${record.battleId}</td>
      <td class="px-5 py-4 font-body-sm text-body-sm text-on-surface font-medium">${record.problem}</td>
      <td class="px-5 py-4 font-code-md text-body-sm text-secondary">${record.opponent}</td>
      <td class="px-5 py-4 font-code-md text-body-sm text-on-surface">${record.time}</td>
      <td class="px-5 py-4 font-body-sm text-body-sm text-on-surface text-center">${record.submit}회</td>
      <td class="px-5 py-4 font-body-sm text-body-sm text-secondary">${record.date}</td>
      <td class="px-5 py-4">
        <button type="button" class="btn-detail" data-record-key="${encodeURIComponent(key)}">상세보기</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('.btn-detail').forEach(button => {
    button.addEventListener('click', () => {
      const key = decodeURIComponent(button.dataset.recordKey);
      const record = ALL_RECORDS.find(item => getRecordKey(item) === key);
      if (record) openDetailDrawer(record);
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
  document.getElementById('drawer-close').addEventListener('click', closeDetailDrawer);
  document.getElementById('history-detail-backdrop').addEventListener('click', closeDetailDrawer);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeDetailDrawer();
  });
}

bindHistoryEvents();
updateStats(filtered);
renderTable(filtered, currentPage);
renderPagination(filtered.length, currentPage);
