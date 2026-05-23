const params = new URLSearchParams(window.location.search);
const mode = params.get('mode');
const opponent = params.get('opponent') || 'Opponent';

const waitTitle = document.getElementById('wait-title');
const waitDescription = document.getElementById('wait-description');
const timerLabel = document.getElementById('timer-label');
const cancelLink = document.getElementById('cancel-link');
const timerEl = document.getElementById('timer');

function dotsMarkup() {
  return '<span class="dots"><span></span><span></span><span></span></span>';
}

if (mode === 'request') {
  waitTitle.innerHTML = `배틀 신청 중${dotsMarkup()}`;
  waitDescription.textContent = `${opponent}님에게 배틀 신청을 보내고 수락을 기다리는 중입니다.`;
  timerLabel.textContent = '신청 대기 시간';
  cancelLink.textContent = '신청 취소';
}

let sec = 0;
setInterval(() => {
  sec++;
  const m = String(Math.floor(sec / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  timerEl.textContent = `${m}:${s}`;
}, 1000);
