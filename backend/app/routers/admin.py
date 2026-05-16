from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.auth.dependencies import get_current_admin
from app.repositories.problem_repository import ProblemRepository
from app.schemas.problem import ProblemCreate, ProblemUpdate

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/problems", status_code=201)
async def create_problem(
    body: ProblemCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_admin),
):
    problem = await ProblemRepository.create_problem(
        db,
        title=body.title,
        description=body.description,
        input_description=body.input_description,
        output_description=body.output_description,
        difficulty=body.difficulty,
        time_limit=body.time_limit,
        memory_limit=body.memory_limit,
        sample_input=body.sample_input,
        sample_output=body.sample_output,
    )
    for i, tc in enumerate(body.test_cases, start=1):
        await ProblemRepository.add_test_case(
            db, problem.id,
            tc.input_data, tc.expected_output,
            tc.is_sample, tc.case_order or i, tc.description,
        )
    return {"message": "문제 등록 완료", "problem_id": problem.id}


@router.put("/problems/{problem_id}")
async def update_problem(
    problem_id: int,
    body: ProblemUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_admin),
):
    problem = await ProblemRepository.update_problem(db, problem_id, **body.model_dump(exclude_none=True))
    if not problem:
        raise HTTPException(status_code=404, detail="문제를 찾을 수 없습니다.")
    return {"message": "문제 수정 완료"}


@router.delete("/problems/{problem_id}")
async def delete_problem(
    problem_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_admin),
):
    deleted = await ProblemRepository.delete_problem(db, problem_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="문제를 찾을 수 없습니다.")
    return {"message": "문제 삭제 완료"}
