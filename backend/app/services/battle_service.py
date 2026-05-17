from datetime import datetime

from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.battle import Battle
from app.models.user import User


class BattleService:
    @staticmethod
    async def end_battle(db: AsyncSession, battle_id: int, winner_id: int) -> None:
        await db.execute(
            update(Battle)
            .where(Battle.id == battle_id)
            .values(
                winner_id=winner_id,
                status="finished",
                finished_at=datetime.utcnow(),
            )
        )

        await db.execute(
            update(User)
            .where(User.id == winner_id)
            .values(
                win_count=User.win_count + 1,
                is_battling=False,
            )
        )

        await db.commit()
