import asyncio

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.auth.dependencies import get_current_user
from app.repositories.battle_repository import BattleRepository
from app.repositories.problem_repository import ProblemRepository
from app.repositories.user_repository import UserRepository
from app.schemas.match import BattleRequestCreate
from app.services.match_service import MatchService
from app.services.websocket_manager import ws_manager

router = APIRouter(prefix="/match", tags=["match"])


@router.post("/queue")
async def join_queue(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if current_user.is_battling:
        raise HTTPException(status_code=400, detail="이미 배틀 중입니다.")

    await MatchService.add_to_queue(db, current_user.id)
    battle = await MatchService.find_and_create_match(db, current_user.id)

    if battle:
        return {"status": "matched", "battle_id": battle.id}
    return {"status": "waiting", "message": "매칭 대기 중입니다."}


@router.delete("/queue")
async def leave_queue(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    await MatchService.remove_from_queue(db, current_user.id)
    return {"message": "매칭 취소됨"}


@router.post("/request")
async def request_battle(
    body: BattleRequestCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    target = await UserRepository.get_user_by_user_id(db, body.target_user_id)
    if not target:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    if not target.is_online:
        raise HTTPException(status_code=400, detail="상대방이 오프라인입니다.")
    if target.is_battling:
        raise HTTPException(status_code=400, detail="상대방이 이미 배틀 중입니다.")

    req = await BattleRepository.create_battle_request(db, current_user.id, target.id)

    await ws_manager.send_battle_request(target.id, req.id, {
        "user_id": current_user.user_id,
        "nickname": current_user.nickname,
    })

    return {"request_id": req.id, "status": "pending"}


@router.post("/request/{request_id}/accept")
async def accept_battle(
    request_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    req = await BattleRepository.get_battle_request(db, request_id)
    if not req or req.receiver_id != current_user.id:
        raise HTTPException(status_code=404, detail="요청을 찾을 수 없습니다.")
    if req.status != "pending":
        raise HTTPException(status_code=400, detail="이미 처리된 요청입니다.")

    await BattleRepository.update_battle_request_status(db, request_id, "accepted")

    problem = await ProblemRepository.get_random_problem(db)
    if not problem:
        raise HTTPException(status_code=500, detail="등록된 문제가 없습니다.")

    battle = await BattleRepository.create_battle(db, req.requester_id, current_user.id, problem.id)
    await UserRepository.update_battling_status(db, req.requester_id, True)
    await UserRepository.update_battling_status(db, current_user.id, True)

    requester = await UserRepository.get_user_by_pk(db, req.requester_id)
    await ws_manager.send_match_found(req.requester_id, battle.id, {
        "user_id": current_user.user_id,
        "nickname": current_user.nickname,
    })
    await ws_manager.send_match_found(current_user.id, battle.id, {
        "user_id": requester.user_id,
        "nickname": requester.nickname,
    })

    asyncio.create_task(MatchService._countdown_and_start(battle.id))
    return {"battle_id": battle.id}


@router.post("/request/{request_id}/reject")
async def reject_battle(
    request_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    req = await BattleRepository.get_battle_request(db, request_id)
    if not req or req.receiver_id != current_user.id:
        raise HTTPException(status_code=404, detail="요청을 찾을 수 없습니다.")

    await BattleRepository.update_battle_request_status(db, request_id, "rejected")

    await ws_manager.send_to_user(req.requester_id, {
        "type": "battle_rejected",
        "request_id": request_id,
        "message": f"{current_user.nickname}님이 배틀 신청을 거절했습니다.",
    })

    return {"message": "거절 완료"}
