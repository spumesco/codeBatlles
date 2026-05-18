from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
from app.database import get_db
from app.auth.dependencies import get_current_user, get_current_admin
from app.repositories.problem_repository import ProblemRepository

router = APIRouter(prefix="/problems", tags=["problems"])

class TestCaseRead(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    problem_id: int
    input_data: str
    expected_output: str
    is_sample: bool
    case_order: int
    description: str | None = None
    created_at: datetime

class ProblemRead(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    title: str
    description: str
    input_description: str
    output_description: str
    difficulty: str
    time_limit: int
    memory_limit: int
    sample_input: str | None = None
    sample_output: str | None = None
    created_at: datetime
    updated_at: datetime

class ProblemDetail(ProblemRead):
    test_cases: list[TestCaseRead] = []

class ProblemCreate(BaseModel):
    title: str
    description: str
    input_description: str
    output_description: str
    difficulty: str
    time_limit: int
    memory_limit: int
    sample_input: str | None = None
    sample_output: str | None = None

class TestCaseCreate(BaseModel):
    input_data: str
    expected_output: str
    is_sample: bool = False
    case_order: int = 1
    description: str | None = None
_VALID_DIFFICULTIES = {"easy", "medium", "hard"}

def _validate_problem_body(body: ProblemCreate) -> None:
    if not body.title.strip():
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="제목을 입력해주세요.")
    if body.difficulty not in _VALID_DIFFICULTIES:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"difficulty는 {_VALID_DIFFICULTIES} 중 하나여야 합니다.",
        )
    if body.time_limit <= 0:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="time_limit는 양수여야 합니다.")
    if body.memory_limit <= 0:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="memory_limit는 양수여야 합니다.")

@router.get("", response_model=list[ProblemRead])
async def list_problems(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Return all active (non-deleted) problems."""
    return await ProblemRepository.get_all_problems(db)

@router.get("/random", response_model=ProblemRead)
async def get_random_problem(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Return a single problem chosen at random."""
    problem = await ProblemRepository.get_random_problem(db)
    if not problem:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="등록된 문제가 없습니다.")
    return problem

@router.get("/{problem_id}", response_model=ProblemRead)
async def get_problem(
    problem_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Return a single problem by ID (without test cases)."""
    problem = await ProblemRepository.get_problem(db, problem_id)
    if not problem:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="문제를 찾을 수 없습니다.")
    return problem

@router.get("/{problem_id}/test-cases", response_model=list[TestCaseRead])
async def get_test_cases(
    problem_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Return the test cases for a problem (admin sees all; users see sample only)."""
    problem = await ProblemRepository.get_problem(db, problem_id)
    if not problem:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="문제를 찾을 수 없습니다.")
    test_cases = await ProblemRepository.get_test_cases(db, problem_id)
    if current_user.role != "admin":
        test_cases = [tc for tc in test_cases if tc.is_sample]
    return test_cases

@router.post("", response_model=ProblemRead, status_code=status.HTTP_201_CREATED)
async def create_problem(
    body: ProblemCreate,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    """Create a new problem (admin only)."""
    _validate_problem_body(body)
    return await ProblemRepository.create_problem(
        db,
        title=body.title.strip(),
        description=body.description,
        input_desc=body.input_description,
        output_desc=body.output_description,
        difficulty=body.difficulty,
        time_limit=body.time_limit,
        memory_limit=body.memory_limit,
        sample_input=body.sample_input,
        sample_output=body.sample_output,
    )

@router.post("/{problem_id}/test-cases", response_model=TestCaseRead, status_code=status.HTTP_201_CREATED)
async def add_test_case(
    problem_id: int,
    body: TestCaseCreate,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    """Add a test case to an existing problem (admin only)."""
    problem = await ProblemRepository.get_problem(db, problem_id)
    if not problem:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="문제를 찾을 수 없습니다.")
    return await ProblemRepository.add_test_case(
        db,
        problem_id=problem_id,
        input_data=body.input_data,
        expected_output=body.expected_output,
        is_sample=body.is_sample,
        case_order=body.case_order,
    )

@router.delete("/{problem_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_problem(
    problem_id: int,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    """Soft-delete a problem (admin only)."""
    problem = await ProblemRepository.get_problem(db, problem_id)
    if not problem:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="문제를 찾을 수 없습니다.")
    await ProblemRepository.delete_problem(db, problem_id)
