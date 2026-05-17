// ===== battle.html JS =====

// 타이머
let sec = 0;
setInterval(() => {
  sec++;
  const m = String(Math.floor(sec / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  document.getElementById('timer').textContent = m + ':' + s;
}, 1000);

// Side Drawer 열기/닫기
function toggleDrawer() {
  const d = document.getElementById('drawer');
  d.classList.toggle('open');
  document.getElementById('toggleDrawer').textContent =
    d.classList.contains('open') ? '문제 닫기' : '문제 보기';
}

// 코드 제출
function submitCode() {
  const el = document.getElementById('judgeResult');
  el.textContent = '채점 중...';
  el.style.color = '#0058bc';
  setTimeout(() => {
    el.textContent = '채점 결과: Accepted';
    el.style.color = '#16a34a';
    setTimeout(() => location.href = 'result.html', 1000);
  }, 1500);
}
