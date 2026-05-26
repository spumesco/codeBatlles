authGuard();

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

loadResult();
