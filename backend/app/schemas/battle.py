from typing import Optional
from datetime import datetime
from pydantic import BaseModel


class BattleRead(BaseModel):
    id: int
    player1_id: int
    player2_id: int
    problem_id: int
    winner_id: Optional[int]
    status: str
    started_at: Optional[datetime]
    finished_at: Optional[datetime]

    model_config = {"from_attributes": True}
