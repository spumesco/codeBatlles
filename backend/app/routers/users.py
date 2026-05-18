from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.auth.dependencies import get_current_user
from app.repositories.battle_repository import BattleRepository
from app.repositories.user_repository import UserRepository
from app.schemas.battle import BattleRead
from app.schemas.user import UserRead, UserSummary

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/me", response_model=UserRead)
async def get_my_profile(current_user=Depends(get_current_user)):
    return current_user

@router.get("/online", response_model=list[UserSummary])
async def get_online_users(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await UserRepository.get_online_users(db)

@router.get("/history", response_model=list[BattleRead])
async def get_battle_history(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await BattleRepository.get_battles_by_user(db, current_user.id)

class NicknameUpdate(BaseModel):
    nickname: str

@router.patch("/me/nickname", response_model=UserRead)
async def update_nickname(
    body: NicknameUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if not body.nickname or not body.nickname.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="닉네임을 입력해주세요.",
        )
    existing = await UserRepository.get_user_by_nickname(db, body.nickname.strip())
    if existing and existing.id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 사용 중인 닉네임입니다.",
        )
    return await UserRepository.update_nickname(db, current_user.id, body.nickname.strip())

@router.get("/leaderboard", response_model=list[UserSummary])
async def get_leaderboard(
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if limit < 1 or limit > 100:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="limit은 1 이상 100 이하여야 합니다.",
        )
    return await UserRepository.get_leaderboard(db, limit=limit)

@router.get("/{user_id}", response_model=UserSummary)
async def get_user_profile(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    user = await UserRepository.get_user_by_user_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="사용자를 찾을 수 없습니다.",
        )
    return user

@router.get("/{user_id}/history", response_model=list[BattleRead])
async def get_user_battle_history(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    user = await UserRepository.get_user_by_user_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="사용자를 찾을 수 없습니다.",
        )
    return await BattleRepository.get_battles_by_user(db, user.id)
