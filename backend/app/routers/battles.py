from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.auth.dependencies import get_current_user
from app.repositories.battle_repository import BattleRepository
from app.repositories.problem_repository import ProblemRepository
from app.repositories.submission_repository import SubmissionRepository
from app.schemas.battle import BattleRead
from app.schemas.submission import SubmissionCreate, SubmissionRead
from app.services.battle_service import BattleService
from app.services.judge_service import JudgeService

router = APIRouter(prefix="/battles", tags=["battles"])


@router.get("/{battle_id}", response_model=BattleRead)
async def get_battle(
    battle_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    battle = await BattleRepository.get_battle(db, battle_id)
    if not battle:
        raise HTTPException(status_code=404, detail="배틀을 찾을 수 없습니다.")
    if current_user.id not in (battle.player1_id, battle.player2_id):
        raise HTTPException(status_code=403, detail="접근 권한이 없습니다.")
    return battle


@router.post("/{battle_id}/submit")
async def submit(
    battle_id: int,
    body: SubmissionCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    battle = await BattleRepository.get_battle(db, battle_id)
    if not battle:
        raise HTTPException(status_code=404, detail="배틀을 찾을 수 없습니다.")
    if current_user.id not in (battle.player1_id, battle.player2_id):
        raise HTTPException(status_code=403, detail="접근 권한이 없습니다.")
    if battle.status != "running":
        raise HTTPException(status_code=400, detail="진행 중인 배틀이 아닙니다.")

    already_passed = await SubmissionRepository.has_user_passed(db, battle_id, current_user.id)
    if already_passed:
        raise HTTPException(status_code=400, detail="이미 정답을 제출했습니다.")

    problem = await ProblemRepository.get_problem(db, battle.problem_id)
    test_cases = await ProblemRepository.get_test_cases(db, battle.problem_id)

    result = await JudgeService.judge_all(
        body.source_code, body.language, test_cases,
        problem.time_limit, problem.memory_limit,
    )

    sub = await SubmissionRepository.create_submission(
        db, battle_id, current_user.id, battle.problem_id,
        body.language, body.source_code, result["status"],
        result.get("time"), result.get("memory"),
    )

    if result["status"] == "Accepted":
        await BattleService.end_battle(db, battle_id, current_user.id)

    return {
        "submission_id": sub.id,
        "status": result["status"],
        "is_correct": result["status"] == "Accepted",
    }


@router.get("/{battle_id}/submissions", response_model=list[SubmissionRead])
async def get_submissions(
    battle_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    battle = await BattleRepository.get_battle(db, battle_id)
    if not battle:
        raise HTTPException(status_code=404, detail="배틀을 찾을 수 없습니다.")
    if current_user.id not in (battle.player1_id, battle.player2_id):
        raise HTTPException(status_code=403, detail="접근 권한이 없습니다.")
    return await SubmissionRepository.get_submissions_by_battle(db, battle_id)
