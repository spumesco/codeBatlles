from app.repositories.battle_repository import BattleRepository
from app.repositories.user_repository import UserRepository
from app.services.websocket_manager import ws_manager


class BattleService:
    @staticmethod
    async def end_battle(db, battle_id: int, winner_pk: int):
        battle = await BattleRepository.finish_battle(db, battle_id, winner_pk)
        if not battle:
            return None

        loser_pk = battle.player2_id if battle.player1_id == winner_pk else battle.player1_id

        await UserRepository.update_battling_status(db, winner_pk, False)
        await UserRepository.update_battling_status(db, loser_pk, False)
        await UserRepository.update_win_lose(db, winner_pk, loser_pk)

        await ws_manager.broadcast_battle_end(battle_id, winner_pk)
        return battle
