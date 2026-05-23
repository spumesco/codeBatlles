from datetime import datetime
<<<<<<< HEAD

from pydantic import BaseModel, ConfigDict


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

=======
from pydantic import BaseModel


class UserRead(BaseModel):
>>>>>>> 24fe5d98ebb7201ba29414f278556b1693759920
    id: int
    user_id: str
    nickname: str
    role: str
    win_count: int
    lose_count: int
    is_online: bool
    is_battling: bool
<<<<<<< HEAD
    is_active: bool
    created_at: datetime
    updated_at: datetime


class UserSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
=======
    created_at: datetime

    model_config = {"from_attributes": True}


class UserSummary(BaseModel):
>>>>>>> 24fe5d98ebb7201ba29414f278556b1693759920
    user_id: str
    nickname: str
    win_count: int
    lose_count: int
    is_online: bool
    is_battling: bool
<<<<<<< HEAD
=======

    model_config = {"from_attributes": True}

UserPublic = UserSummary
>>>>>>> 24fe5d98ebb7201ba29414f278556b1693759920
