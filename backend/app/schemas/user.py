from datetime import datetime
from pydantic import BaseModel


class UserRead(BaseModel):
    id: int
    user_id: str
    nickname: str
    role: str
    win_count: int
    lose_count: int
    is_online: bool
    is_battling: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserPublic(BaseModel):
    user_id: str
    nickname: str
    role: str
    win_count: int
    lose_count: int
    is_online: bool
    is_battling: bool

    model_config = {"from_attributes": True}
