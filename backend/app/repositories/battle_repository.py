from __future__ import annotations

from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

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
        entry = await BattleRepository.get_queue_entry(db, user_pk)
        if entry:
            entry.status = "canceled"
            await db.commit()

    @staticmethod
    async def find_match(db: AsyncSession, user_pk: int) -> MatchQueue | None:
        result = await db.execute(
            select(MatchQueue)
            .where(MatchQueue.user_id != user_pk, MatchQueue.status == "waiting")
            .order_by(MatchQueue.created_at.asc())
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
    async def start_battle(db: AsyncSession, battle_id: int) -> Battle | None:
        battle = await BattleRepository.get_battle(db, battle_id)
        if battle:
            battle.status = "running"
            battle.started_at = datetime.utcnow()
            await db.commit()
        return battle

    @staticmethod
    async def finish_battle(db: AsyncSession, battle_id: int, winner_id: int | None = None) -> Battle | None:
        battle = await BattleRepository.get_battle(db, battle_id)
        if battle:
            battle.status = "finished"
            battle.finished_at = datetime.utcnow()
            battle.winner_id = winner_id
            await db.commit()
        return battle

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
    async def update_battle_request_status(db: AsyncSession, request_id: int, status: str) -> BattleRequest | None:
        req = await BattleRepository.get_battle_request(db, request_id)
        if req:
            req.status = status
            req.responded_at = datetime.utcnow()
            await db.commit()
        return req

    @staticmethod
    async def get_battles_by_user(db: AsyncSession, user_pk: int) -> list[Battle]:
        result = await db.execute(
            select(Battle)
            .where((Battle.player1_id == user_pk) | (Battle.player2_id == user_pk))
            .order_by(Battle.id.desc())
        )
        return list(result.scalars().all())
