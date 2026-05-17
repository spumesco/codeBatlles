from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.auth.backend import decode_token
from app.repositories.user_repository import UserRepository
from app.models.user import User


async def get_user_by_token(token: str, db: AsyncSession) -> User | None:
    payload = decode_token(token)
    if not payload:
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None
    return await UserRepository.get_user_by_user_id(db, user_id)


async def get_user_or_401(token: str, db: AsyncSession) -> User:
    user = await get_user_by_token(token, db)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="유효하지 않은 토큰입니다.")
    return user
