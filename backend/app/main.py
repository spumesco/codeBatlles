from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base

# 모든 모델을 import 해야 Base.metadata에 등록됨
import app.models.user          # noqa: F401
import app.models.user_session  # noqa: F401
import app.models.problem       # noqa: F401
import app.models.test_case     # noqa: F401
import app.models.match_queue   # noqa: F401
import app.models.battle_request  # noqa: F401
import app.models.battle        # noqa: F401
import app.models.submission    # noqa: F401

from app.routers import auth, users, match, battles, problems, admin, websocket


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    title="CodeBattles API",
    description="실시간 코드 배틀 플랫폼 백엔드",
    version="1.0.0",
    lifespan=lifespan,
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
app.include_router(problems.router)
app.include_router(admin.router)
app.include_router(websocket.router)


@app.get("/")
def health_check():
    return {"message": "CodeBattles backend is running"}
