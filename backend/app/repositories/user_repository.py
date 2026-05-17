from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


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
        return result.scalars().all()

    @staticmethod
    async def update_online_status(db: AsyncSession, user_pk: int, is_online: bool) -> None:
        await db.execute(
            update(User).where(User.id == user_pk).values(is_online=is_online)
        )
        await db.commit()

    @staticmethod
    async def update_battling_status(db: AsyncSession, user_pk: int, is_battling: bool) -> None:
        await db.execute(
            update(User).where(User.id == user_pk).values(is_battling=is_battling)
        )
        await db.commit()

    @staticmethod
    async def update_win_lose(db: AsyncSession, winner_pk: int, loser_pk: int) -> None:
        await db.execute(
            update(User).where(User.id == winner_pk).values(win_count=User.win_count + 1)
        )
        await db.execute(
            update(User).where(User.id == loser_pk).values(lose_count=User.lose_count + 1)
        )
        await db.commit()
