from pydantic import BaseModel


class MatchQueueJoin(BaseModel):
    pass


class BattleRequestCreate(BaseModel):
    target_user_id: str
