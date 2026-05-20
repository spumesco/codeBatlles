from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.database import engine, Base


import app.models.user
import app.models.problem
import app.models.test_case 
import app.models.match_queue
import app.models.battle_request
import app.models.battle
import app.models.submission

from app.routers import auth, users, match, battles, problems, admin, websocket

BASE_DIR = Path(__file__).resolve().parent.parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"
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
app.mount("/css", StaticFiles(directory=str(FRONTEND_DIR / "css")), name="css")
app.mount("/js", StaticFiles(directory=str(FRONTEND_DIR / "js")), name="js")

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(match.router)
app.include_router(battles.router)
app.include_router(problems.router)
app.include_router(admin.router)
app.include_router(websocket.router)


# 프론트엔드 페이지 라우팅
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


@app.get("/admin-problems")
def admin_problems_page():
    return FileResponse(PAGES_DIR / "admin-problems.html")


@app.get("/api/health")
def health_check():
    return {"message": "CodeBattles backend is running"}
