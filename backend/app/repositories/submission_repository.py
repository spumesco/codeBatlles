from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.submission import Submission


class SubmissionRepository:
    @staticmethod
    async def create_submission(
        db: AsyncSession,
        battle_id: int,
        user_pk: int,
        problem_id: int,
        language: str,
        source_code: str,
        judge_status: str,
        exec_time: float | None = None,
        memory: int | None = None,
    ) -> Submission:
        sub = Submission(
            battle_id=battle_id,
            user_id=user_pk,
            problem_id=problem_id,
            language=language,
            source_code=source_code,
            judge_status=judge_status,
            execution_time=exec_time,
            memory_usage=memory,
        )
        db.add(sub)
        await db.commit()
        await db.refresh(sub)
        return sub

    @staticmethod
    async def get_submissions_by_battle(db: AsyncSession, battle_id: int) -> list[Submission]:
        result = await db.execute(
            select(Submission)
            .where(Submission.battle_id == battle_id)
            .order_by(Submission.created_at.asc())
        )
        return result.scalars().all()

    @staticmethod
    async def has_user_passed(db: AsyncSession, battle_id: int, user_pk: int) -> bool:
        result = await db.execute(
            select(Submission).where(
                Submission.battle_id == battle_id,
                Submission.user_id == user_pk,
                Submission.judge_status == "Accepted",
            )
        )
        return result.scalar_one_or_none() is not None
