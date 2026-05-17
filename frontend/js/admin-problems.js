// ===== admin-problems.html JS =====

function addTC() {
  const row = document.createElement('div');
  row.className = 'tc-row';
  row.innerHTML = `
    <input class="form-input" type="text" placeholder="입력 예시" style="margin-bottom:0"/>
    <input class="form-input" type="text" placeholder="출력 예시" style="margin-bottom:0"/>
  `;
  document.getElementById('tcContainer').appendChild(row);
}

function loadProblem(id) {
  const titles = ['', 'A+B', '배열 합', '괄호 검사', '최단 경로'];
  document.getElementById('formTitle').textContent = '문제 수정 (ID: ' + id + ')';
  document.getElementById('fTitle').value = titles[id];
}

function deleteProblem(id) {
  if (confirm('문제 ID ' + id + '를 삭제하시겠습니까?')) {
    alert('삭제되었습니다. (백엔드 API 연동 필요)');
  }
}

function submitForm() {
  alert('저장되었습니다. (백엔드 API 연동 필요)');
}
