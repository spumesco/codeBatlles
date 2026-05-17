// ===== matching.html JS =====

let sec = 0;
const timerEl = document.getElementById('timer');

setInterval(() => {
  sec++;
  const m = String(Math.floor(sec / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  timerEl.textContent = m + ':' + s;
}, 1000);
