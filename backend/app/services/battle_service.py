from datetime import datetime

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.battle import Battle
from app.models.user import User
from app.repositories.battle_repository import BattleRepository
from app.repositories.problem_repository import ProblemRepository
from app.repositories.submission_repository import SubmissionRepository
from app.services.judge_service import JudgeService
from app.services.websocket_manager import ws_manager


class BattleService:
    @staticmethod
    async def start_battle_check(db: AsyncSession, battle_id: int) -> None:
        await BattleRepository.start_battle(db, battle_id)
        await ws_manager.broadcast_to_battle(battle_id, {"type": "battle_start"})

    @staticmethod
    async def process_submission(
        db: AsyncSession, battle_id: int, user_pk: int, source_code: str, language: str
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
    async def end_battle(
        db: AsyncSession,
        battle_id: int,
        winner_id: int,
        reason: str | None = None,
    ) -> None:
        result = await db.execute(select(Battle).where(Battle.id == battle_id))
        battle = result.scalar_one_or_none()

        if not battle:
            return
        # 이미 종료된 배틀이면 중복 처리 방지 — 동시 disconnect/submit 경합 보호.
        if battle.status == "finished" or battle.winner_id is not None:
            return

        await db.execute(
            update(Battle)
            .where(Battle.id == battle_id)
            .values(
                winner_id=winner_id,
                status="finished",
                finished_at=datetime.utcnow(),
            )
        )

        await db.execute(
            update(User)
            .where(User.id == winner_id)
            .values(
                win_count=User.win_count + 1,
                is_battling=False,
            )
        )

        loser_id = battle.player2_id if winner_id == battle.player1_id else battle.player1_id
        await db.execute(
            update(User)
            .where(User.id == loser_id)
            .values(
                lose_count=User.lose_count + 1,
                is_battling=False,
            )
        )

        await db.commit()
        await ws_manager.broadcast_battle_end(battle_id, winner_id, reason=reason)
