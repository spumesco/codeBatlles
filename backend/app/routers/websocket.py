from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.auth.users import get_user_by_token
from app.repositories.battle_repository import BattleRepository
from app.repositories.user_repository import UserRepository
from app.services.websocket_manager import ws_manager

router = APIRouter(tags=["websocket"])


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

    await ws_manager.connect_lobby(user.id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect_lobby(user.id)
        await UserRepository.update_online_status(db, user.id, False)


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

    await ws_manager.connect_battle(battle_id, user.id, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")
            if msg_type == "code_update":
                await ws_manager.broadcast_code(battle_id, user.id, data.get("code", ""))
    except WebSocketDisconnect:
        ws_manager.disconnect_battle(battle_id, user.id)
