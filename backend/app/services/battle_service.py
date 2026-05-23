import asyncio
from typing import Optional

from app.database import AsyncSessionLocal
from app.repositories.battle_repository import BattleRepository
from app.repositories.problem_repository import ProblemRepository
from app.repositories.user_repository import UserRepository
from app.repositories.submission_repository import SubmissionRepository
from app.services.judge_service import JudgeService
from app.services.websocket_manager import ws_manager


class BattleService:
    @staticmethod
    async def start_battle_check(db, battle_id: int) -> None:
        await BattleRepository.start_battle(db, battle_id)
        await ws_manager.broadcast_to_battle(battle_id, {"type": "battle_start"})

    @staticmethod
    async def process_submission(
        db, battle_id: int, user_pk: int, source_code: str, language: str
    ) -> dict:
        battle = await BattleRepository.get_battle(db, battle_id)
        if not battle:
            return {"status": "Error", "message": "존재하지 않는 배틀입니다."}

        if getattr(battle, "status", None) == "finished" or getattr(battle, "winner_id", None) is not None:
            return {"status": "Error", "message": "이미 종료된 배틀입니다."}

        test_cases = await ProblemRepository.get_test_cases(db, battle.problem_id)
        if not test_cases:
            return {"status": "Error", "message": "테스트 케이스를 찾을 수 없습니다."}

        judge_result = await JudgeService.judge_all(
            source_code=source_code,
            language=language,
            test_cases=test_cases
        )

        await SubmissionRepository.create_submission(
            db=db,
            battle_id=battle_id,
            user_pk=user_pk,
            problem_id=battle.problem_id,
            language=language,
            source_code=source_code,
            judge_status=judge_result.get("status", "Unknown"),
            exec_time=judge_result.get("time"),
            memory=judge_result.get("memory")
        )

        if judge_result.get("status") == "Accepted":
            await BattleService.end_battle(db, battle_id, winner_id=user_pk)
            judge_result["is_winner"] = True
        else:
            judge_result["is_winner"] = False

        return judge_result

    @staticmethod
    async def end_battle(db, battle_id: int, winner_id: Optional[int]) -> None:
        battle = await BattleRepository.get_battle(db, battle_id)
        if not battle:
            return

        await BattleRepository.finish_battle(db, battle_id, winner_id)

        player1_id = getattr(battle, "player1_id", None)
        player2_id = getattr(battle, "player2_id", None)

        if player1_id:
            await UserRepository.update_battling_status(db, player1_id, False)
        if player2_id:
            await UserRepository.update_battling_status(db, player2_id, False)

        if winner_id and player1_id and player2_id:
            loser_id = player2_id if winner_id == player1_id else player1_id
            await UserRepository.update_win_lose(db, winner_id, loser_id)

        await ws_manager.broadcast_battle_end(battle_id, winner_id)