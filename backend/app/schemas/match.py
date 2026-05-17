from pydantic import BaseModel


class BattleRequestCreate(BaseModel):
    target_user_id: str
