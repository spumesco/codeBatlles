from datetime import datetime

from pydantic import BaseModel, ConfigDict


class BattleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    player1_id: int
    player2_id: int
    problem_id: int
    winner_id: int | None = None
    status: str
    started_at: datetime | None = None
    finished_at: datetime | None = None
