from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models.battle import Battle
from app.repositories.battle_repository import BattleRepository
from app.repositories.user_repository import UserRepository
from app.schemas.battle import BattleRead
from app.schemas.user import UserRead, UserSummary
from app.services.battle_service import BattleService

router = APIRouter(prefix="/users", tags=["users"])


async def _find_active_battle(db: AsyncSession, user_pk: int) -> Battle | None:
    result = await db.execute(
        select(Battle)
        .where(
            ((Battle.player1_id == user_pk) | (Battle.player2_id == user_pk)),
            Battle.status.in_(["ready", "running"]),
        )
        .order_by(Battle.id.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()

@router.get("/me", response_model=UserRead)
async def get_my_profile(current_user=Depends(get_current_user)):
    return current_user


@router.get("/me/battle-state")
async def get_battle_state(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """현재 사용자의 배틀 상태를 조회하며, 'is_battling=True 인데 진행 중인 배틀이 없는'
    stuck 상태를 자동으로 정리한다.
    응답:
      - active_battle_id: 진행/대기 중인 배틀 ID (없으면 null)
      - is_battling: 정리 후의 실제 상태
    """
    active = await _find_active_battle(db, current_user.id)
    if active:
        # 실제로 배틀 중이면 플래그도 True 로 동기화 (없으면 그대로 둠).
        if not current_user.is_battling:
            await UserRepository.update_battling_status(db, current_user.id, True)
        return {"active_battle_id": active.id, "is_battling": True}

    # 진행 중인 배틀이 없는데 플래그가 켜져 있으면 stuck — 자동 해제.
    if current_user.is_battling:
        await UserRepository.update_battling_status(db, current_user.id, False)
    return {"active_battle_id": None, "is_battling": False}


@router.post("/me/forfeit")
async def forfeit_current_battle(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """진행 중인 내 배틀을 강제로 포기 처리한다.
    - 진행 중인 배틀이 있으면 상대 승으로 종료
    - 없으면 is_battling 플래그만 정리
    """
    active = await _find_active_battle(db, current_user.id)
    if active:
        opponent_id = (
            active.player2_id if current_user.id == active.player1_id else active.player1_id
        )
        if opponent_id is not None:
            await BattleService.end_battle(
                db, active.id, opponent_id, reason="opponent_forfeit"
            )
        else:
            await UserRepository.update_battling_status(db, current_user.id, False)
        return {"forfeited": True, "battle_id": active.id}

    # 진행 중인 배틀 없음 — 플래그만 정리
    if current_user.is_battling:
        await UserRepository.update_battling_status(db, current_user.id, False)
    return {"forfeited": False, "battle_id": None}

@router.get("/online", response_model=list[UserSummary])
async def get_online_users(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # 본인은 목록에서 제외 — 자기 자신에게 배틀 신청 불가
    return await UserRepository.get_online_users(db, exclude_user_pk=current_user.id)

@router.get("/me/stats", response_model=list[BattleRead])
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

@router.get("/me/history")
async def get_my_history(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    battles = await BattleRepository.get_battle_history_rich(db, current_user.id)
    result = []
    for b in battles:
        is_winner = b.winner_id == current_user.id
        opponent = b.player2 if b.player1_id == current_user.id else b.player1
        my_subs = [s for s in b.submissions if s.user_id == current_user.id]
        duration = None
        if b.started_at and b.finished_at:
            duration = int((b.finished_at - b.started_at).total_seconds())
        result.append({
            "id": b.id,
            "result": "win" if is_winner else "lose",
            "problem_title": b.problem.title if b.problem else "-",
            "opponent_nickname": opponent.nickname if opponent else "-",
            "duration_seconds": duration,
            "submit_count": len(my_subs),
            "finished_at": b.finished_at.isoformat() if b.finished_at else None,
        })
    return result


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
