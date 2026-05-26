import io
import json
import zipfile

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.problem_repository import ProblemRepository


_VALID_DIFFICULTIES = {"easy", "medium", "hard"}
_REQUIRED_FIELDS = [
    "title", "description", "input_description",
    "output_description", "difficulty", "time_limit", "memory_limit",
]


async def import_problem_zip(db: AsyncSession, zip_bytes: bytes):
    """
    ZIP 파일에서 문제와 테스트케이스를 일괄 등록합니다.

    ZIP 구조:
        problem.json          - 문제 메타데이터
        cases/1.in            - 일반 테스트케이스 입력
        cases/1.out           - 일반 테스트케이스 출력
        cases/sample_1.in     - 예제 테스트케이스 입력
        cases/sample_1.out    - 예제 테스트케이스 출력

    problem.json 형식:
        {
          "title": "문제 제목",
          "description": "문제 설명",
          "input_description": "입력 설명",
          "output_description": "출력 설명",
          "difficulty": "easy | medium | hard",
          "time_limit": 2000,
          "memory_limit": 256,
          "sample_input": "예제 입력 (선택)",
          "sample_output": "예제 출력 (선택)"
        }
    """
    try:
        zf = zipfile.ZipFile(io.BytesIO(zip_bytes))
    except zipfile.BadZipFile:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="유효하지 않은 ZIP 파일입니다.")

    names = zf.namelist()

    # ── problem.json 파싱 ──
    if "problem.json" not in names:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail="ZIP 파일 루트에 problem.json이 없습니다.",
        )

    try:
        meta = json.loads(zf.read("problem.json").decode("utf-8"))
    except Exception:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="problem.json 파싱에 실패했습니다.")

    for field in _REQUIRED_FIELDS:
        if field not in meta:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"problem.json에 필수 필드 '{field}'가 없습니다.",
            )

    if meta["difficulty"] not in _VALID_DIFFICULTIES:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"difficulty는 {sorted(_VALID_DIFFICULTIES)} 중 하나여야 합니다.",
        )

    # ── 문제 생성 ──
    problem = await ProblemRepository.create_problem(
        db,
        title=str(meta["title"]).strip(),
        description=str(meta["description"]),
        input_desc=str(meta["input_description"]),
        output_desc=str(meta["output_description"]),
        difficulty=meta["difficulty"],
        time_limit=int(meta["time_limit"]),
        memory_limit=int(meta["memory_limit"]),
        sample_input=meta.get("sample_input"),
        sample_output=meta.get("sample_output"),
    )

    # ── cases/ 폴더에서 테스트케이스 파일 추출 ──
    case_files = [n for n in names if not n.endswith("/")]

    inputs: dict[str, str] = {}
    outputs: dict[str, str] = {}
    samples: set[str] = set()

    for name in case_files:
        basename = name.split("/")[-1]

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

    created_cases = []
    for order, key in enumerate(matched_keys, start=1):
        tc = await ProblemRepository.add_test_case(
            db,
            problem_id=problem.id,
            input_data=inputs[key],
            expected_output=outputs[key],
            is_sample=(key in samples),
            case_order=order,
        )
        created_cases.append(tc)

    return problem, created_cases
