import ssl
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config import settings

connect_args = {}

if settings.DB_SSL_CA:
    ssl_ca = Path(settings.DB_SSL_CA)
    if not ssl_ca.exists():
        raise FileNotFoundError(f"DB SSL CA file not found: {ssl_ca}")
    connect_args["ssl"] = ssl.create_default_context(cafile=ssl_ca)

engine = create_async_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    echo=False,
    # MySQL 호스팅이 유휴 연결을 끊으면 SQLAlchemy 풀에 stale 한 connection 이 남아
    # 다음 쿼리에서 'Lost connection to MySQL server during query (2013)' 가 터진다.
    # pool_pre_ping: 매 쿼리 직전에 ping 으로 살아있는지 확인 (작은 오버헤드, 안정성↑)
    # pool_recycle: 280초 지나면 강제 재연결 (MySQL wait_timeout 보통 300s 직전 회수)
    pool_pre_ping=True,
    pool_recycle=280,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

class Base(DeclarativeBase):
    pass

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
