from typing import Optional
from datetime import datetime
from pydantic import BaseModel


class SubmissionCreate(BaseModel):
    language: str
    source_code: str


class SubmissionRead(BaseModel):
    id: int
    battle_id: int
    user_id: int
    problem_id: int
    language: str
    judge_status: str
    execution_time: Optional[float]
    memory_usage: Optional[int]
    created_at: datetime

    model_config = {"from_attributes": True}
