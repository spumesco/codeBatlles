authGuard();

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
  waitTitle.innerHTML = `諛고? ?좎껌 以?{dotsMarkup()}`;
  waitDescription.textContent = `${opponent}?섏뿉寃?諛고? ?좎껌??蹂대궡怨??섎씫??湲곕떎由щ뒗 以묒엯?덈떎.`;
  timerLabel.textContent = '?좎껌 ?湲??쒓컙';
  cancelLink.textContent = '?좎껌 痍⑥냼';
}

let sec = 0;
setInterval(() => {
  sec++;
  const m = String(Math.floor(sec / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  timerEl.textContent = `${m}:${s}`;
}, 1000);

