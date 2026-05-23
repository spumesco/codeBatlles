import ssl
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config import settings

ssl_ctx = ssl.create_default_context(cafile="/etc/secrets/isrgrootx1.pem")

engine = create_async_engine(
    settings.DATABASE_URL,
    connect_args={"ssl": ssl_ctx},
    echo=True,
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