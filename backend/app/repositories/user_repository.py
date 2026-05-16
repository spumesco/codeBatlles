from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import select

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.user_session import UserSession


class UserRepository:
    @staticmethod
    async def create_user(db: AsyncSession, user_id: str, password_hash: str, nickname: str) -> User:
        user = User(user_id=user_id, password_hash=password_hash, nickname=nickname)
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user

    @staticmethod
    async def get_user_by_user_id(db: AsyncSession, user_id: str) -> User | None:
        result = await db.execute(select(User).where(User.user_id == user_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_user_by_nickname(db: AsyncSession, nickname: str) -> User | None:
        result = await db.execute(select(User).where(User.nickname == nickname))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_user_by_pk(db: AsyncSession, user_pk: int) -> User | None:
        result = await db.execute(select(User).where(User.id == user_pk))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_online_users(db: AsyncSession) -> list[User]:
        result = await db.execute(select(User).where(User.is_online == True))
        return list(result.scalars().all())

    @staticmethod
    async def update_online_status(db: AsyncSession, user_pk: int, is_online: bool) -> None:
        user = await UserRepository.get_user_by_pk(db, user_pk)
        if user:
            user.is_online = is_online
            await db.commit()

    @staticmethod
    async def update_battling_status(db: AsyncSession, user_pk: int, is_battling: bool) -> None:
        user = await UserRepository.get_user_by_pk(db, user_pk)
        if user:
            user.is_battling = is_battling
            await db.commit()

    @staticmethod
    async def update_win_lose(db: AsyncSession, winner_pk: int, loser_pk: int) -> None:
        winner = await UserRepository.get_user_by_pk(db, winner_pk)
        loser = await UserRepository.get_user_by_pk(db, loser_pk)
        if winner:
            winner.win_count += 1
        if loser:
            loser.lose_count += 1
        await db.commit()

    @staticmethod
    async def create_session(db: AsyncSession, user_pk: int, session_id: str, expires_at: datetime) -> UserSession:
        session = UserSession(session_id=session_id, user_id=user_pk, expires_at=expires_at)
        db.add(session)
        await db.commit()
        return session
