from datetime import datetime
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.battle import Battle
from app.models.battle_request import BattleRequest
from app.models.match_queue import MatchQueue


class BattleRepository:
    @staticmethod
    async def join_match_queue(db: AsyncSession, user_pk: int) -> MatchQueue:
        entry = MatchQueue(user_id=user_pk, status="waiting")
        db.add(entry)
        await db.commit()
        await db.refresh(entry)
        return entry

    @staticmethod
    async def get_queue_entry(db: AsyncSession, user_pk: int) -> MatchQueue | None:
        result = await db.execute(
            select(MatchQueue).where(MatchQueue.user_id == user_pk, MatchQueue.status == "waiting")
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def remove_from_queue(db: AsyncSession, user_pk: int) -> None:
        await db.execute(
            update(MatchQueue).where(MatchQueue.user_id == user_pk).values(status="cancelled")
        )
        await db.commit()

    @staticmethod
    async def find_match(db: AsyncSession, user_pk: int) -> MatchQueue | None:
        result = await db.execute(
            select(MatchQueue).where(
                MatchQueue.user_id != user_pk,
                MatchQueue.status == "waiting",
            ).order_by(MatchQueue.created_at.asc()).limit(1)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def create_battle(db: AsyncSession, player1_id: int, player2_id: int, problem_id: int) -> Battle:
        battle = Battle(player1_id=player1_id, player2_id=player2_id, problem_id=problem_id, status="ready")
        db.add(battle)
        await db.commit()
        await db.refresh(battle)
        return battle

    @staticmethod
    async def get_battle(db: AsyncSession, battle_id: int) -> Battle | None:
        result = await db.execute(select(Battle).where(Battle.id == battle_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_battles_by_user(db: AsyncSession, user_pk: int) -> list[Battle]:
        result = await db.execute(
            select(Battle).where(
                (Battle.player1_id == user_pk) | (Battle.player2_id == user_pk)
            ).order_by(Battle.id.desc())
        )
        return result.scalars().all()

    @staticmethod
    async def start_battle(db: AsyncSession, battle_id: int) -> None:
        await db.execute(
            update(Battle).where(Battle.id == battle_id).values(
                status="running", started_at=datetime.utcnow()
            )
        )
        await db.commit()

    @staticmethod
    async def finish_battle(db: AsyncSession, battle_id: int, winner_id: int) -> Battle | None:
        await db.execute(
            update(Battle).where(Battle.id == battle_id).values(
                status="finished",
                winner_id=winner_id,
                finished_at=datetime.utcnow(),
            )
        )
        await db.commit()
        result = await db.execute(select(Battle).where(Battle.id == battle_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def create_battle_request(db: AsyncSession, requester_id: int, receiver_id: int) -> BattleRequest:
        req = BattleRequest(requester_id=requester_id, receiver_id=receiver_id, status="pending")
        db.add(req)
        await db.commit()
        await db.refresh(req)
        return req

    @staticmethod
    async def get_battle_request(db: AsyncSession, request_id: int) -> BattleRequest | None:
        result = await db.execute(select(BattleRequest).where(BattleRequest.id == request_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def update_battle_request_status(db: AsyncSession, request_id: int, status: str) -> None:
        await db.execute(
            update(BattleRequest).where(BattleRequest.id == request_id).values(
                status=status, responded_at=datetime.utcnow()
            )
        )
        await db.commit()
