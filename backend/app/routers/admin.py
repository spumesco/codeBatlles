from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
from app.database import get_db
from app.auth.dependencies import get_current_admin
from app.models.user import User
from app.models.problem import Problem
from app.models.battle import Battle
from app.models.submission import Submission
from app.repositories.user_repository import UserRepository
from app.repositories.problem_repository import ProblemRepository
from app.services.problem_import_service import import_problem_zip
from app.schemas.user import UserRead

router = APIRouter(prefix="/admin", tags=["admin"])


class DashboardStats(BaseModel):
    total_users: int
    online_users: int
    total_problems: int
    total_battles: int
    total_submissions: int


class UserAdminRead(UserRead):
    pass


class RoleUpdate(BaseModel):
    role: str


class ActiveUpdate(BaseModel):
    is_active: bool


class ProblemAdminRead(BaseModel):
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
    is_deleted: bool
    created_at: datetime
    updated_at: datetime


@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    total_users = (await db.execute(select(func.count()).select_from(User))).scalar_one()
    online_users = (
        await db.execute(select(func.count()).select_from(User).where(User.is_online == True))
    ).scalar_one()
    total_problems = (
        await db.execute(
            select(func.count()).select_from(Problem).where(Problem.is_deleted == False)
        )
    ).scalar_one()
    total_battles = (await db.execute(select(func.count()).select_from(Battle))).scalar_one()
    total_submissions = (
        await db.execute(select(func.count()).select_from(Submission))
    ).scalar_one()
    return DashboardStats(
        total_users=total_users,
        online_users=online_users,
        total_problems=total_problems,
        total_battles=total_battles,
        total_submissions=total_submissions,
    )


@router.get("/users", response_model=list[UserAdminRead])
async def list_all_users(
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    result = await db.execute(select(User).order_by(User.id.asc()))
    return result.scalars().all()


@router.get("/users/{user_id}", response_model=UserAdminRead)
async def get_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    user = await UserRepository.get_user_by_user_id(db, user_id)
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="사용자를 찾을 수 없습니다.")
    return user


@router.patch("/users/{user_id}/role", response_model=UserAdminRead)
async def update_user_role(
    user_id: str,
    body: RoleUpdate,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    _VALID_ROLES = {"user", "admin"}
    if body.role not in _VALID_ROLES:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"role은 {_VALID_ROLES} 중 하나여야 합니다.",
        )
    user = await UserRepository.get_user_by_user_id(db, user_id)
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="사용자를 찾을 수 없습니다.")
    updated = await UserRepository.update_role(db, user.id, body.role)
    return updated


@router.patch("/users/{user_id}/active", response_model=UserAdminRead)
async def update_user_active(
    user_id: str,
    body: ActiveUpdate,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    user = await UserRepository.get_user_by_user_id(db, user_id)
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="사용자를 찾을 수 없습니다.")
    updated = await UserRepository.update_active_status(db, user.id, body.is_active)
    return updated


@router.get("/problems", response_model=list[ProblemAdminRead])
async def list_all_problems(
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    result = await db.execute(select(Problem).order_by(Problem.id.asc()))
    return result.scalars().all()


@router.patch("/problems/{problem_id}/restore", response_model=ProblemAdminRead)
async def restore_problem(
    problem_id: int,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    result = await db.execute(select(Problem).where(Problem.id == problem_id))
    problem = result.scalar_one_or_none()
    if not problem:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="문제를 찾을 수 없습니다.")
    if not problem.is_deleted:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="이미 활성화된 문제입니다.")
    from sqlalchemy import update
    await db.execute(
        update(Problem).where(Problem.id == problem_id).values(is_deleted=False)
    )
    await db.commit()
    await db.refresh(problem)
    return problem


@router.delete("/problems/{problem_id}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_problem(
    problem_id: int,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    problem = await ProblemRepository.get_problem(db, problem_id)
    if not problem:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="문제를 찾을 수 없습니다.")
    await ProblemRepository.delete_problem(db, problem_id)


@router.post("/problems/import-zip", status_code=status.HTTP_201_CREATED)
async def import_problem_from_zip(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    if not file.filename.lower().endswith(".zip"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="ZIP 파일만 업로드 가능합니다.")

    content = await file.read()
    problem, cases = await import_problem_zip(db, content)

    return {
        "message": f"문제 '{problem.title}'이(가) {len(cases)}개의 테스트케이스와 함께 등록되었습니다.",
        "problem_id": problem.id,
        "title": problem.title,
        "test_case_count": len(cases),
    }
