import io
import zipfile

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
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

@router.post("/{problem_id}/test-cases/upload", status_code=status.HTTP_201_CREATED)
async def upload_test_cases_zip(
    problem_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    """
    ZIP 파일로 테스트케이스 일괄 등록 (관리자 전용)

    ZIP 내부 파일 규칙:
      1.in  → 1번 테스트케이스 입력값
      1.out → 1번 테스트케이스 기대 출력값
      2.in, 2.out, ...

    sample_로 시작하는 파일은 예제 테스트케이스로 등록됩니다.
      예: sample_1.in / sample_1.out
    """
    problem = await ProblemRepository.get_problem(db, problem_id)
    if not problem:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="문제를 찾을 수 없습니다.")

    if not file.filename.endswith(".zip"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="ZIP 파일만 업로드 가능합니다.")

    content = await file.read()
    try:
        zf = zipfile.ZipFile(io.BytesIO(content))
    except zipfile.BadZipFile:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="유효하지 않은 ZIP 파일입니다.")

    # 파일 목록에서 .in / .out 쌍 추출
    names = [n for n in zf.namelist() if not n.endswith("/")]

    inputs: dict[str, str] = {}   # key → input text
    outputs: dict[str, str] = {}  # key → output text
    samples: set[str] = set()

    for name in names:
        basename = name.split("/")[-1]  # 하위 폴더 무시

        if basename.startswith("sample_"):
            stem = basename[len("sample_"):]
            is_sample = True
        else:
            stem = basename
            is_sample = False

        if stem.endswith(".in"):
            key = stem[:-3]
            inputs[key] = zf.read(name).decode("utf-8")
            if is_sample:
                samples.add(key)
        elif stem.endswith(".out"):
            key = stem[:-4]
            outputs[key] = zf.read(name).decode("utf-8")
            if is_sample:
                samples.add(key)

    matched_keys = sorted(inputs.keys() & outputs.keys())
    if not matched_keys:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail="매칭되는 .in/.out 쌍이 없습니다. 파일명 규칙을 확인하세요. (예: 1.in / 1.out)",
        )

    created = []
    for order, key in enumerate(matched_keys, start=1):
        tc = await ProblemRepository.add_test_case(
            db,
            problem_id=problem_id,
            input_data=inputs[key],
            expected_output=outputs[key],
            is_sample=(key in samples),
            case_order=order,
        )
        created.append(tc)

    return {
        "message": f"{len(created)}개의 테스트케이스가 등록되었습니다.",
        "problem_id": problem_id,
        "count": len(created),
        "test_cases": [
            {
                "id": tc.id,
                "case_order": tc.case_order,
                "is_sample": tc.is_sample,
            }
            for tc in created
        ],
    }


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
