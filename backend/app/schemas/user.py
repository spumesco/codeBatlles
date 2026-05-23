from datetime import datetime

from pydantic import BaseModel, ConfigDict


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: str
    nickname: str
    role: str
    win_count: int
    lose_count: int
    is_online: bool
    is_battling: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime


class UserSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: str
    nickname: str
    win_count: int
    lose_count: int
    is_online: bool
    is_battling: bool


UserPublic = UserSummary
