from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.auth.dependencies import get_current_user
from app.repositories.user_repository import UserRepository
from app.schemas.user import UserPublic, UserRead

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/online", response_model=list[UserPublic])
async def get_online_users(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await UserRepository.get_online_users(db)


@router.get("/me/stats", response_model=UserRead)
async def my_stats(current_user=Depends(get_current_user)):
    return current_user


@router.get("/{user_id}", response_model=UserPublic)
async def get_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    user = await UserRepository.get_user_by_user_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    return user
