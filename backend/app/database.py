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
