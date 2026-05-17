from fastapi import APIRouter, Depends
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
