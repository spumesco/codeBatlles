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


class UserSummary(BaseModel):
    """공개 프로필 (리더보드, 온라인 목록 등)"""
    user_id: str
    nickname: str
    win_count: int
    lose_count: int
    is_online: bool
    is_battling: bool

    model_config = {"from_attributes": True}


# 하위 호환용 alias
UserPublic = UserSummary
