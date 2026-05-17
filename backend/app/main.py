from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, users, match, battles, websocket

app = FastAPI(
    title="CodeBattles API",
    description="Realtime code battle platform backend",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(match.router)
app.include_router(battles.router)
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


@app.get("/admin-problems")
def admin_problems_page():
    return FileResponse(PAGES_DIR / "admin-problems.html")


@app.get("/api/health")
def health_check():
    return {"message": "CodeBattles backend is running"}
