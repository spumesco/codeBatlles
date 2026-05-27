from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.database import Base, engine
import app.models.battle
import app.models.battle_request
import app.models.match_queue
import app.models.problem
import app.models.submission
import app.models.test_case
import app.models.user
from app.routers import admin, auth, battles, match, problems, users, websocket


PROJECT_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_DIR = PROJECT_ROOT / "frontend"
PAGES_DIR = FRONTEND_DIR / "pages"


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    title="CodeBattles API",
    description="Realtime code battle platform backend",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/css", StaticFiles(directory=FRONTEND_DIR / "css"), name="css")
app.mount("/js", StaticFiles(directory=FRONTEND_DIR / "js"), name="js")
app.mount("/assets", StaticFiles(directory=FRONTEND_DIR / "assets"), name="assets")
app.mount("/components", StaticFiles(directory=FRONTEND_DIR / "components"), name="components")
app.mount("/vendor", StaticFiles(directory=FRONTEND_DIR / "vendor"), name="vendor")

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(match.router)
app.include_router(battles.router)
app.include_router(problems.router)
app.include_router(admin.router)
app.include_router(websocket.router)


@app.get("/")
def index_page():
    return FileResponse(FRONTEND_DIR / "index.html")


@app.get("/login")
def login_page():
    return FileResponse(PAGES_DIR / "login.html")


@app.get("/register")
def register_page():
    return FileResponse(PAGES_DIR / "register.html")


@app.get("/main")
def main_page():
    return FileResponse(PAGES_DIR / "main.html")


@app.get("/matching")
def matching_page():
    return FileResponse(PAGES_DIR / "matching.html")


@app.get("/battle")
def battle_page():
    return FileResponse(PAGES_DIR / "battle.html")


@app.get("/result")
def result_page():
    return FileResponse(PAGES_DIR / "result.html")


@app.get("/history")
def history_page():
    return FileResponse(PAGES_DIR / "history.html")


@app.get("/history-detail")
def history_detail_page():
    return FileResponse(PAGES_DIR / "history_detail.html")


@app.get("/ranking")
def ranking_page():
    return FileResponse(PAGES_DIR / "ranking.html")


@app.get("/settings")
def settings_page():
    return FileResponse(PAGES_DIR / "settings.html")


@app.get("/admin-problems")
def admin_problems_page():
    return FileResponse(PAGES_DIR / "admin-problems.html")


@app.get("/api/health")
def health_check():
    """배포 진단용. 운영 백엔드가 신/구 어느 코드인지, 폴백 채점이 가능한지 한 번에 확인."""
    info: dict = {"message": "CodeBattles backend is running"}

    # 로컬 폴백 채점기 상태 — 'judge_local_supported' 가 있으면 신 백엔드.
    try:
        from app.services.local_executor import LocalExecutor
        info["judge_local_supported"] = LocalExecutor.supported_languages()
    except Exception as e:
        info["judge_local_supported"] = f"unavailable: {e!s}"

    # Judge0 폴백 토글
    try:
        from app.services.judge_service import USE_LOCAL_FALLBACK, HAS_HTTPX
        info["use_local_fallback"] = USE_LOCAL_FALLBACK
        info["has_httpx"] = HAS_HTTPX
    except Exception as e:
        info["judge_service"] = f"import failed: {e!s}"

    return info


