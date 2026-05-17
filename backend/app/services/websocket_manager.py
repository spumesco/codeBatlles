from typing import Dict
from fastapi import WebSocket


class WebSocketManager:
    def __init__(self):
        self.lobby_connections: Dict[int, WebSocket] = {}
        self.battle_connections: Dict[int, Dict[int, WebSocket]] = {}

    async def connect_lobby(self, user_pk: int, ws: WebSocket) -> None:
        await ws.accept()
        self.lobby_connections[user_pk] = ws

    def disconnect_lobby(self, user_pk: int) -> None:
        self.lobby_connections.pop(user_pk, None)

    async def connect_battle(self, battle_id: int, user_pk: int, ws: WebSocket) -> None:
        await ws.accept()
        if battle_id not in self.battle_connections:
            self.battle_connections[battle_id] = {}
        self.battle_connections[battle_id][user_pk] = ws

    def disconnect_battle(self, battle_id: int, user_pk: int) -> None:
        if battle_id in self.battle_connections:
            self.battle_connections[battle_id].pop(user_pk, None)

    async def send_to_user(self, user_pk: int, data: dict) -> None:
        ws = self.lobby_connections.get(user_pk)
        if ws:
            try:
                await ws.send_json(data)
            except Exception:
                self.disconnect_lobby(user_pk)

    async def broadcast_to_battle(self, battle_id: int, data: dict, exclude_user: int | None = None) -> None:
        conns = self.battle_connections.get(battle_id, {})
        for uid, ws in list(conns.items()):
            if uid == exclude_user:
                continue
            try:
                await ws.send_json(data)
            except Exception:
                self.disconnect_battle(battle_id, uid)

    async def send_match_found(self, user_pk: int, battle_id: int, opponent: dict) -> None:
        await self.send_to_user(user_pk, {
            "type": "match_found",
            "battle_id": battle_id,
            "opponent": opponent,
        })

    async def send_battle_request(self, receiver_pk: int, request_id: int, requester: dict) -> None:
        await self.send_to_user(receiver_pk, {
            "type": "battle_request",
            "request_id": request_id,
            "requester": requester,
        })

    async def broadcast_code(self, battle_id: int, user_pk: int, code: str) -> None:
        await self.broadcast_to_battle(battle_id, {
            "type": "code_update",
            "user_id": user_pk,
            "code": code,
        }, exclude_user=user_pk)

    async def broadcast_battle_end(self, battle_id: int, winner_id: int) -> None:
        await self.broadcast_to_battle(battle_id, {
            "type": "battle_end",
            "winner_id": winner_id,
        })


ws_manager = WebSocketManager()
