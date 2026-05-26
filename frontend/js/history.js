authGuard();

const PAGE_SIZE = 8;
let currentPage = 1;
let allData = [];   // API에서 받은 전체 데이터
let filtered = [];  // 필터 적용 후 데이터

/* ── 유틸 ── */
function formatDuration(secs) {
  if (secs == null) return '00:00';
  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function verdictClass(verdict) {
  if (verdict === 'Accepted') return 'verdict-ac';
  if (verdict === 'Wrong Answer') return 'verdict-wa';
  if (verdict === 'Runtime Error') return 'verdict-re';
  if (verdict === 'Time Limit Exceeded') return 'verdict-tle';
  return 'verdict-etc';
}

function renderSubmits(list) {
  if (!list || list.length === 0) {
    return '<p class="text-secondary text-sm">제출 기록 없음</p>';
  }
  return list.map((sub, index) => `
    <div class="history-submit-row">
      <span class="history-submit-index">${index + 1}</span>
      <span class="history-submit-lang">${sub.lang}</span>
      <span class="inline-block px-2 py-0.5 rounded text-xs font-bold ${verdictClass(sub.verdict)}">${sub.verdict}</span>
      <span class="history-submit-time">${sub.at}</span>
    </div>
  `).join('');
}

/* ── 통계 업데이트 ── */
function updateStats(data) {
  const total = data.length;
  const wins = data.filter(r => r.result === 'win').length;
  const loses = total - wins;
  const rate = total ? `${Math.round((wins / total) * 100)}%` : '0%';

  const validTimes = data.filter(r => r.durationSecs != null);
  const avgSec = validTimes.length
    ? Math.round(validTimes.reduce((acc, r) => acc + r.durationSecs, 0) / validTimes.length)
    : 0;

  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-win').textContent = wins;
  document.getElementById('stat-lose').textContent = loses;
  document.getElementById('stat-rate').textContent = rate;
  document.getElementById('stat-avg').textContent = formatDuration(avgSec);
}

/* ── 문제 필터 드롭다운 동적 생성 ── */
function populateProblemFilter(data) {
  const select = document.getElementById('filter-problem');
  const problems = [...new Set(data.map(r => r.problem).filter(p => p && p !== '-'))].sort();
  select.innerHTML = '<option value="">문제 전체</option>';
  problems.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p;
    opt.textContent = p;
    select.appendChild(opt);
  });
}

/* ── 상세 드로어 (실제 API 호출) ── */
async function openDetailDrawer(record) {
  const drawer = document.getElementById('history-detail-drawer');
  const backdrop = document.getElementById('history-detail-backdrop');

  drawer.hidden = false;
  backdrop.hidden = false;
  drawer.classList.add('open');
  backdrop.classList.add('open');
  drawer.setAttribute('aria-hidden', 'false');
  backdrop.setAttribute('aria-hidden', 'false');

  // 로딩 상태
  document.getElementById('drawer-battle-id').textContent = `경기 #${record.battleId}`;
  document.getElementById('drawer-problem').textContent = '로딩 중...';
  document.getElementById('drawer-opponent').textContent = '-';
  document.getElementById('drawer-start').textContent = '-';
  document.getElementById('drawer-end').textContent = '-';
  document.getElementById('drawer-time').textContent = '-';
  document.getElementById('drawer-my-submissions').innerHTML = '<p class="text-secondary text-sm">로딩 중...</p>';
  document.getElementById('drawer-opp-submissions').innerHTML = '<p class="text-secondary text-sm">로딩 중...</p>';

  try {
    const data = await apiRequest(`/battles/${record.battleId}/result`);
    const isWin = data.result === 'win';
    const badge = document.getElementById('drawer-result-badge');

    document.getElementById('drawer-problem').textContent = data.problem_title;
    document.getElementById('drawer-opponent').textContent = data.opponent_nickname;
    document.getElementById('drawer-time').textContent = record.time;

    if (data.started_at) {
      document.getElementById('drawer-start').textContent =
        data.started_at.replace('T', ' ').substring(0, 16);
    }
    if (data.finished_at) {
      document.getElementById('drawer-end').textContent =
        data.finished_at.replace('T', ' ').substring(0, 16);
    }

    badge.textContent = isWin ? '승리' : '패배';
    badge.className = `inline-block px-4 py-2 rounded-full text-sm font-bold ${isWin ? 'badge-win' : 'badge-lose'}`;

    document.getElementById('drawer-my-submissions').innerHTML = renderSubmits(
      data.my_submissions.map(s => ({ lang: s.language, verdict: s.status, at: s.submitted_at || '' }))
    );
    document.getElementById('drawer-opp-submissions').innerHTML = renderSubmits(
      data.opp_submissions.map(s => ({ lang: s.language, verdict: s.status, at: s.submitted_at || '' }))
    );
  } catch (e) {
    console.warn('detail load failed:', e.message);
    document.getElementById('drawer-problem').textContent = record.problem;
    document.getElementById('drawer-opponent').textContent = record.opponent;
    document.getElementById('drawer-time').textContent = record.time;
  }
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

/* ── 테이블 렌더링 ── */
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
        <button type="button" class="btn-detail" data-battle-id="${record.battleId}">상세보기</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('.btn-detail').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.battleId);
      const record = allData.find(r => r.battleId === id);
      if (record) openDetailDrawer(record);
    });
  });
}

/* ── 페이지네이션 ── */
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

/* ── 필터 ── */
function applyFilter() {
  const tab = document.querySelector('.filter-tab.active').dataset.filter;
  const problem = document.getElementById('filter-problem').value;
  const period = document.getElementById('filter-period').value;
  const search = document.getElementById('filter-search').value.trim().toLowerCase();
  const now = new Date();

  filtered = allData.filter(record => {
    if (tab !== 'all' && record.result !== tab) return false;
    if (problem && record.problem !== problem) return false;
    if (search && !record.opponent.toLowerCase().includes(search)) return false;
    if (period && record.date !== '-') {
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
  document.querySelectorAll('.filter-tab').forEach(btn => btn.classList.remove('active'));
  document.querySelector('[data-filter="all"]').classList.add('active');
  document.getElementById('filter-problem').value = '';
  document.getElementById('filter-period').value = '';
  document.getElementById('filter-search').value = '';
  filtered = [...allData];
  currentPage = 1;
  updateStats(filtered);
  renderTable(filtered, currentPage);
  renderPagination(filtered.length, currentPage);
}

/* ── API 로드 ── */
async function loadHistory() {
  try {
    const data = await apiRequest('/users/me/history');
    allData = data.map(b => ({
      battleId: b.id,
      result: b.result,
      problem: b.problem_title,
      opponent: b.opponent_nickname,
      time: formatDuration(b.duration_seconds),
      durationSecs: b.duration_seconds,
      submit: b.submit_count,
      date: b.finished_at ? b.finished_at.substring(0, 10) : '-',
    }));
  } catch (e) {
    console.warn('history load failed:', e.message);
    allData = [];
  }

  populateProblemFilter(allData);
  filtered = [...allData];
  updateStats(filtered);
  renderTable(filtered, 1);
  renderPagination(filtered.length, 1);
}

/* ── 이벤트 바인딩 ── */
document.querySelectorAll('.filter-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    applyFilter();
  });
});

document.getElementById('filter-problem').addEventListener('change', applyFilter);
document.getElementById('filter-period').addEventListener('change', applyFilter);
document.getElementById('filter-search').addEventListener('input', applyFilter);
document.getElementById('btn-reset').addEventListener('click', resetFilters);
document.getElementById('drawer-close').addEventListener('click', closeDetailDrawer);
document.getElementById('history-detail-backdrop').addEventListener('click', closeDetailDrawer);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDetailDrawer(); });

loadHistory();
