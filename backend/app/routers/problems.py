from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.auth.dependencies import get_current_user
from app.repositories.problem_repository import ProblemRepository
from app.schemas.problem import ProblemRead

router = APIRouter(prefix="/problems", tags=["problems"])


@router.get("/", response_model=list[ProblemRead])
async def get_problems(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await ProblemRepository.get_all_problems(db)


@router.get("/{problem_id}", response_model=ProblemRead)
async def get_problem(
    problem_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    problem = await ProblemRepository.get_problem(db, problem_id)
    if not problem:
        raise HTTPException(status_code=404, detail="문제를 찾을 수 없습니다.")
    return problem
