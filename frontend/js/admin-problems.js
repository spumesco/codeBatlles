const zipInput = document.getElementById('problemZip');
const selectedFileText = document.getElementById('selectedFileText');
const uploadForm = document.getElementById('zipUploadForm');
const uploadButton = document.getElementById('uploadButton');
const uploadStatus = document.getElementById('uploadStatus');
const formTitle = document.getElementById('formTitle');

const DEFAULT_FILE_HELP = 'problem.json과 cases 폴더가 들어있는 zip 파일을 선택하세요.';

function setStatus(type, message) {
  uploadStatus.className = `status ${type}`;
  uploadStatus.textContent = message;
}

function handleZipChange() {
  const file = zipInput.files[0];
  if (!file) {
    selectedFileText.textContent = DEFAULT_FILE_HELP;
    return;
  }
  selectedFileText.textContent = `${file.name} (${Math.ceil(file.size / 1024)} KB)`;
}

async function handleZipSubmit(event) {
  event.preventDefault();

  const file = zipInput.files[0];
  if (!file) {
    setStatus('error', '업로드할 zip 파일을 먼저 선택하세요.');
    return;
  }

  if (!file.name.toLowerCase().endsWith('.zip')) {
    setStatus('error', 'zip 파일만 업로드할 수 있습니다.');
    return;
  }

  const formData = new FormData();
  formData.append('file', file);

  uploadButton.disabled = true;
  uploadButton.textContent = '업로드 중...';
  setStatus('info', 'ZIP 파일을 서버로 전송하고 있습니다.');

  try {
    const token = getToken();
    const response = await fetch('/admin/problems/import-zip', {
      method: 'POST',
      body: formData,
      headers: { 'Authorization': `Bearer ${token}` },
    });

    let result;
    try { result = await response.json(); } catch { result = null; }

    if (!response.ok) {
      throw new Error(result?.detail || '업로드 API 요청에 실패했습니다.');
    }

    setStatus('success', result?.message || '문제 데이터셋 업로드가 완료되었습니다.');
    uploadForm.reset();
    selectedFileText.textContent = DEFAULT_FILE_HELP;
  } catch (error) {
    setStatus('error', `업로드 실패: ${error.message}`);
  } finally {
    uploadButton.disabled = false;
    uploadButton.textContent = 'ZIP 업로드';
  }
}

function loadProblem(id) {
  formTitle.textContent = `문제 수정 (ID: ${id})`;
  setStatus('info', '문제 수정 API 연동이 필요합니다. 새 문제 등록은 ZIP 업로드를 사용하세요.');
}

function deleteProblem(id) {
  if (confirm(`문제 ID ${id}를 삭제하시겠습니까?`)) {
    setStatus('info', '문제 삭제 API 연동이 필요합니다.');
  }
}

async function loadAdminNavbar() {
  const container = document.getElementById('navbar-container');
  if (!container) return;
  try {
    const response = await fetch('/components/admin-navbar.html?v=' + Date.now(), { cache: 'no-store' });
    if (!response.ok) throw new Error(`admin-navbar load failed: ${response.status}`);
    container.innerHTML = await response.text();
    await hydrateAdminNavbar();
    bindAdminNavbarLogout();
  } catch (error) {
    console.warn(error.message);
  }
}

async function hydrateAdminNavbar() {
  try {
    const user = await getMe();
    const nickname = document.getElementById('navbar-nickname');
    if (nickname) nickname.textContent = user.nickname || '관리자';
  } catch (error) {
    console.warn(error.message);
  }
}

function bindAdminNavbarLogout() {
  const logoutButton = document.getElementById('btn-logout');
  if (!logoutButton) return;

  logoutButton.addEventListener('click', event => {
    event.preventDefault();
    logoutButton.disabled = true;

    apiLogout().catch(error => {
      console.warn(error.message);
    });

    clearToken();
    window.location.replace('/');
  });
}

function bindAdminProblemEvents() {
  if (zipInput) zipInput.addEventListener('change', handleZipChange);
  if (uploadForm) uploadForm.addEventListener('submit', handleZipSubmit);

  document.querySelectorAll('.btn-edit').forEach(button => {
    button.addEventListener('click', () => loadProblem(button.dataset.problemId));
  });

  document.querySelectorAll('.btn-delete').forEach(button => {
    button.addEventListener('click', () => deleteProblem(button.dataset.problemId));
  });
}

/* ── 관리자 가드 후 초기화 ── */
(async () => {
  await adminGuard();
  loadAdminNavbar();
  bindAdminProblemEvents();
})();
