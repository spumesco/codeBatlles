import asyncio

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db, AsyncSessionLocal
from app.auth.users import get_user_by_token
from app.repositories.battle_repository import BattleRepository
from app.repositories.user_repository import UserRepository
from app.services.battle_service import BattleService
from app.services.websocket_manager import ws_manager

router = APIRouter(tags=["websocket"])

# 새로고침 등 짧은 연결 끊김을 흡수하기 위한 grace 기간.
BATTLE_DISCONNECT_GRACE_SEC = 3.0


async def _forfeit_if_still_disconnected(battle_id: int, user_id: int) -> None:
    """배틀 WS 가 끊긴 뒤 일정 시간 안에 재접속이 없으면 상대 승으로 자동 종료."""
    try:
        await asyncio.sleep(BATTLE_DISCONNECT_GRACE_SEC)
        # 같은 사용자의 새 WS 가 등록됐다면 재접속 성공 — 종료하지 않음.
        if user_id in ws_manager.battle_connections.get(battle_id, {}):
            return

        async with AsyncSessionLocal() as db:
            battle = await BattleRepository.get_battle(db, battle_id)
            if not battle:
                return
            # 준비/진행 중 상태에서만 forfeit. 이미 끝난 배틀은 건드리지 않는다.
            if battle.status not in ("ready", "running"):
                return
            opponent_id = (
                battle.player2_id if user_id == battle.player1_id else battle.player1_id
            )
            if opponent_id is None:
                return
            await BattleService.end_battle(
                db, battle_id, opponent_id, reason="opponent_disconnected"
            )
    except Exception as e:
        print(f"[battle_ws] forfeit 처리 실패 battle_id={battle_id}, user_id={user_id}: {e}")


@router.websocket("/ws/lobby")
async def lobby_ws(
    websocket: WebSocket,
    token: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    user = await get_user_by_token(token, db)
    if not user:
        await websocket.close(code=1008)
        return

    user_id = user.id  # 세션 만료 전에 저장

    await ws_manager.connect_lobby(user_id, websocket)
    await UserRepository.update_online_status(db, user_id, True)
    try:
        while True:
            msg = await websocket.receive_text()
            # ping/pong 처리 (Render.com 유휴 연결 방지)
            if msg == "ping":
                try:
                    await websocket.send_text("pong")
                except Exception:
                    break
    except (WebSocketDisconnect, Exception):
        pass
    finally:
        # 현재 저장된 WS 와 같은 객체일 때만 제거
        # → 페이지 이동 시 새 연결이 먼저 등록된 경우 새 연결을 건드리지 않음
        ws_manager.disconnect_lobby(user_id, websocket)

        # 새 연결이 없을 때만 오프라인으로 변경
        if user_id not in ws_manager.lobby_connections:
            try:
                async with AsyncSessionLocal() as fresh_db:
                    await UserRepository.update_online_status(fresh_db, user_id, False)
            except Exception as e:
                print(f"[lobby_ws] 오프라인 상태 업데이트 실패 user_id={user_id}: {e}")


@router.websocket("/ws/battles/{battle_id}")
async def battle_ws(
    websocket: WebSocket,
    battle_id: int,
    token: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    user = await get_user_by_token(token, db)
    if not user:
        await websocket.close(code=1008)
        return

    battle = await BattleRepository.get_battle(db, battle_id)
    if not battle or user.id not in (battle.player1_id, battle.player2_id):
        await websocket.close(code=1008)
        return

    user_id = user.id  # 세션 만료 전에 캡쳐

    await ws_manager.connect_battle(battle_id, user_id, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")
            if msg_type == "code_update":
                await ws_manager.broadcast_code(battle_id, user_id, data.get("code", ""))
            # 클라이언트가 명시적으로 "포기" 를 알리면 즉시 종료(grace 무시).
            elif msg_type == "forfeit":
                async with AsyncSessionLocal() as fresh_db:
                    cur = await BattleRepository.get_battle(fresh_db, battle_id)
                    if cur and cur.status in ("ready", "running"):
                        opp = cur.player2_id if user_id == cur.player1_id else cur.player1_id
                        await BattleService.end_battle(
                            fresh_db, battle_id, opp, reason="opponent_forfeit"
                        )
                break
    except (WebSocketDisconnect, Exception):
        pass
    finally:
        # 새 연결과 충돌하지 않도록 ws 객체 비교 후 제거.
        ws_manager.disconnect_battle(battle_id, user_id, websocket)
        # grace 후에도 재접속 안 되면 상대 승으로 자동 종료.
        asyncio.create_task(_forfeit_if_still_disconnected(battle_id, user_id))
