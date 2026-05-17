import asyncio
from typing import Optional

from app.database import AsyncSessionLocal
from app.repositories.battle_repository import BattleRepository
from app.repositories.problem_repository import ProblemRepository
from app.repositories.user_repository import UserRepository
from app.services.websocket_manager import ws_manager


class MatchService:
    @staticmethod
    async def add_to_queue(db, user_pk: int):
        existing = await BattleRepository.get_queue_entry(db, user_pk)
        if existing:
            return existing
        return await BattleRepository.join_match_queue(db, user_pk)

    @staticmethod
    async def remove_from_queue(db, user_pk: int) -> None:
        await BattleRepository.remove_from_queue(db, user_pk)

    @staticmethod
    async def find_and_create_match(db, user_pk: int) -> Optional[object]:
        opponent_entry = await BattleRepository.find_match(db, user_pk)
        if not opponent_entry:
            return None

        problem = await ProblemRepository.get_random_problem(db)
        if not problem:
            return None

        await BattleRepository.remove_from_queue(db, user_pk)
        await BattleRepository.remove_from_queue(db, opponent_entry.user_id)

        battle = await BattleRepository.create_battle(db, user_pk, opponent_entry.user_id, problem.id)

        await UserRepository.update_battling_status(db, user_pk, True)
        await UserRepository.update_battling_status(db, opponent_entry.user_id, True)

        user = await UserRepository.get_user_by_pk(db, user_pk)
        opponent = await UserRepository.get_user_by_pk(db, opponent_entry.user_id)

        await ws_manager.send_match_found(user_pk, battle.id, {
            "user_id": opponent.user_id,
            "nickname": opponent.nickname,
        })
        await ws_manager.send_match_found(opponent.id, battle.id, {
            "user_id": user.user_id,
            "nickname": user.nickname,
        })

        asyncio.create_task(MatchService._countdown_and_start(battle.id))
        return battle

    @staticmethod
    async def _countdown_and_start(battle_id: int) -> None:
        for count in range(10, 0, -1):
            await ws_manager.broadcast_to_battle(battle_id, {"type": "countdown", "count": count})
            await asyncio.sleep(1)

        async with AsyncSessionLocal() as db:
            await BattleRepository.start_battle(db, battle_id)

        await ws_manager.broadcast_to_battle(battle_id, {"type": "battle_start"})
