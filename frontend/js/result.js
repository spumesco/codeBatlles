authGuard();

<<<<<<< Updated upstream
function getBattleId() {
  return new URLSearchParams(location.search).get('battle_id');
}

/* ── 결과 렌더링 ── */
function renderResult(data) {
  const isWin = data.result === 'win';

  // 배너
  document.getElementById('result-icon').textContent = isWin ? '🎉' : '😢';
  const titleEl = document.getElementById('result-title');
  titleEl.textContent = isWin ? '승리' : '패배';
  titleEl.className = `result-title ${isWin ? 'result-win' : 'result-lose'}`;
  document.getElementById('result-description').textContent = isWin
    ? '상대보다 먼저 정답을 맞혔습니다.'
    : '아쉽게 패배했습니다. 다음엔 꼭!';

  // 배틀 정보
  document.getElementById('result-problem').textContent = data.problem_title || '-';
  document.getElementById('result-opponent').textContent = data.opponent_nickname || '-';
  document.getElementById('result-end-time').textContent = data.finished_at
    ? data.finished_at.replace('T', ' ').substring(0, 16)
    : '-';

  // 내 마지막 제출
  const mySub = data.my_submissions?.at(-1);
  if (mySub) {
    const el = document.getElementById('my-sub-result');
    el.textContent = mySub.status;
    el.className = mySub.status === 'Accepted' ? 'accepted-text code-value' : 'wrong-text code-value';
    document.getElementById('my-sub-lang').textContent = mySub.language;
    document.getElementById('my-sub-time').textContent =
      mySub.execution_time != null ? `${mySub.execution_time}초` : '-';
    document.getElementById('my-sub-memory').textContent =
      mySub.memory_usage != null ? `${mySub.memory_usage} KB` : '-';
  }

  // 상대 마지막 제출
  const oppSub = data.opp_submissions?.at(-1);
  if (oppSub) {
    const el = document.getElementById('opp-sub-result');
    el.textContent = oppSub.status;
    el.className = oppSub.status === 'Accepted' ? 'accepted-text code-value' : 'wrong-text code-value';
    document.getElementById('opp-sub-lang').textContent = oppSub.language;
    document.getElementById('opp-sub-time').textContent =
      oppSub.execution_time != null ? `${oppSub.execution_time}초` : '-';
    document.getElementById('opp-sub-memory').textContent =
      oppSub.memory_usage != null ? `${oppSub.memory_usage} KB` : '-';
  }

  // 전적 변화 (현재 전적 기준 역산)
  const wins = data.my_win_count ?? 0;
  const loses = data.my_lose_count ?? 0;
  const prevWins = isWin ? wins - 1 : wins;
  const prevLoses = isWin ? loses : loses - 1;
  document.getElementById('result-prev-record').innerHTML =
    `<span class="accepted-text">${Math.max(0, prevWins)}승</span> <span class="wrong-text">${Math.max(0, prevLoses)}패</span>`;
  document.getElementById('result-curr-record').innerHTML =
    `<span class="accepted-text">${wins}승</span> <span class="wrong-text">${loses}패</span>`;
}

/* ── 초기화 ── */
async function loadResult() {
  const battleId = getBattleId();
  if (!battleId) { window.location.href = '/main'; return; }

  try {
    const data = await apiRequest(`/battles/${battleId}/result`);
    renderResult(data);
  } catch (e) {
    console.warn('result load failed:', e.message);
    document.getElementById('result-title').textContent = '결과 불러오기 실패';
  }
}

document.getElementById('btn-main')?.addEventListener('click', () => {
  window.location.href = '/main';
});

=======
const mainButton = document.getElementById('btn-main');
if (mainButton) {
  mainButton.addEventListener('click', () => {
    window.location.href = '/main';
  });
}

function statusClass(status) {
  if (status === 'Accepted') return 'accepted-text';
  if (status === 'Wrong Answer') return 'wrong-text';
  return '';
}

function fmtTime(secs) {
  if (secs == null) return '-';
  return `${secs.toFixed(3)}초`;
}

function fmtMemory(kb) {
  if (kb == null) return '-';
  return `${kb} KB`;
}

function fmtDatetime(isoString) {
  if (!isoString) return '-';
  const d = new Date(isoString);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

function renderSubBox(prefix, subs) {
  const last = subs && subs.length > 0 ? subs[subs.length - 1] : null;
  const resultEl = document.getElementById(`${prefix}-sub-result`);
  const langEl = document.getElementById(`${prefix}-sub-lang`);
  const timeEl = document.getElementById(`${prefix}-sub-time`);
  const memEl = document.getElementById(`${prefix}-sub-memory`);

  if (!last) {
    if (resultEl) resultEl.textContent = '제출 없음';
    if (langEl) langEl.textContent = '-';
    if (timeEl) timeEl.textContent = '-';
    if (memEl) memEl.textContent = '-';
    return;
  }

  if (resultEl) {
    resultEl.textContent = last.status;
    resultEl.className = `code-value ${statusClass(last.status)}`;
  }
  if (langEl) langEl.textContent = last.language || '-';
  if (timeEl) {
    timeEl.textContent = fmtTime(last.execution_time);
    timeEl.className = `code-value ${last.status === 'Accepted' ? 'text-primary' : 'muted-code'}`;
  }
  if (memEl) {
    memEl.textContent = fmtMemory(last.memory_usage);
    memEl.className = `code-value ${last.status === 'Accepted' ? 'text-primary' : 'muted-code'}`;
  }
}

async function loadResult() {
  const params = new URLSearchParams(window.location.search);
  const battleId = params.get('battle_id') || sessionStorage.getItem('last_battle_id');

  if (!battleId) {
    document.getElementById('result-icon').textContent = '❓';
    document.getElementById('result-title').textContent = '결과 없음';
    document.getElementById('result-description').textContent = '배틀 ID를 찾을 수 없습니다.';
    return;
  }

  try {
    const data = await apiRequest(`/battles/${battleId}/result`);
    const isWin = data.result === 'win';

    // Banner
    document.getElementById('result-icon').textContent = isWin ? '🎉' : '😢';
    const titleEl = document.getElementById('result-title');
    titleEl.textContent = isWin ? '승리' : '패배';
    titleEl.className = `result-title ${isWin ? 'result-win' : 'result-lose'}`;
    document.getElementById('result-description').textContent = isWin
      ? '상대보다 먼저 정답을 맞혔습니다.'
      : '상대방이 먼저 정답을 맞혔습니다.';

    // Battle info
    document.getElementById('result-problem').textContent = data.problem_title || '-';
    document.getElementById('result-opponent').textContent = data.opponent_nickname || '-';
    document.getElementById('result-end-time').textContent = fmtDatetime(data.finished_at);

    // Submission boxes
    renderSubBox('my', data.my_submissions);
    renderSubBox('opp', data.opp_submissions);

    // Record change — calculate previous from current
    const currWin = data.my_win_count || 0;
    const currLose = data.my_lose_count || 0;
    const prevWin = isWin ? currWin - 1 : currWin;
    const prevLose = isWin ? currLose : currLose - 1;

    document.getElementById('result-prev-record').innerHTML =
      `이전: <span class="code-value strong-value"><span class="accepted-text">${prevWin}승</span> <span class="wrong-text">${prevLose}패</span></span>`;
    document.getElementById('result-curr-record').innerHTML =
      `현재: <span class="code-value strong-value"><span class="accepted-text">${currWin}승</span> <span class="wrong-text">${currLose}패</span></span>`;

  } catch (e) {
    console.warn('결과 로드 실패:', e.message);
    document.getElementById('result-icon').textContent = '⚠️';
    document.getElementById('result-title').textContent = '오류';
    document.getElementById('result-description').textContent = '결과를 불러오지 못했습니다.';
  }
}

>>>>>>> Stashed changes
loadResult();
