const DETAIL_DATA = {
  '두 수의 합_devKing_2026-05-18': {
    problem: '두 수의 합',
    result: 'win',
    opponent: 'devKing',
    start: '2026-05-18 21:10',
    end: '2026-05-18 21:14',
    time: '04:32',
    mySubmits: [
      { lang: 'Python', verdict: 'Wrong Answer', at: '21:11' },
      { lang: 'Python', verdict: 'Accepted', at: '21:14' }
    ],
    oppSubmits: [
      { lang: 'Java', verdict: 'Wrong Answer', at: '21:12' },
      { lang: 'Java', verdict: 'Wrong Answer', at: '21:13' }
    ]
  },
  '그리디 연습_codeWolf_2026-05-17': {
    problem: '그리디 연습',
    result: 'lose',
    opponent: 'codeWolf',
    start: '2026-05-17 19:00',
    end: '2026-05-17 19:07',
    time: '07:11',
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
  }
};

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
    <div class="submit-row">
      <span class="submit-index font-body-sm text-body-sm text-secondary">${index + 1}</span>
      <span class="submit-lang font-code-md text-body-sm text-on-surface-variant">${submit.lang}</span>
      <span class="inline-block px-2 py-0.5 rounded text-xs font-bold ${verdictClass(submit.verdict)}">${submit.verdict}</span>
      <span class="ml-auto font-code-md text-body-sm text-secondary">${submit.at}</span>
    </div>
  `).join('');
}

function renderDetail(data) {
  const badge = document.getElementById('result-badge');
  const isWin = data.result === 'win';

  badge.textContent = data.result ? (isWin ? '승리' : '패배') : '-';
  badge.className = `inline-block px-4 py-2 rounded-full text-sm font-bold ${data.result ? (isWin ? 'badge-win' : 'badge-lose') : 'badge-empty'}`;

  document.getElementById('detail-problem').textContent = data.problem || '-';
  document.getElementById('detail-opponent').textContent = data.opponent || '-';
  document.getElementById('detail-start').textContent = data.start || '-';
  document.getElementById('detail-end').textContent = data.end || '-';
  document.getElementById('detail-time').textContent = data.time || '-';
  document.getElementById('my-submissions').innerHTML = renderSubmits(data.mySubmits);
  document.getElementById('opp-submissions').innerHTML = renderSubmits(data.oppSubmits);
}

function getFallbackDetail() {
  return {
    problem: '-',
    result: '',
    opponent: '-',
    start: '-',
    end: '-',
    time: '-',
    mySubmits: [],
    oppSubmits: []
  };
}

const backButton = document.getElementById('btn-back');
if (backButton) {
  backButton.addEventListener('click', () => {
    history.back();
  });
}

const params = new URLSearchParams(window.location.search);
const key = params.get('key');
renderDetail(DETAIL_DATA[key] || getFallbackDetail());