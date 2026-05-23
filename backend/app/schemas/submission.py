from datetime import datetime

from pydantic import BaseModel, ConfigDict


class SubmissionCreate(BaseModel):
    language: str
    source_code: str


class SubmissionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    battle_id: int
    user_id: int
    problem_id: int
    language: str
    source_code: str
    judge_status: str
    execution_time: float | None = None
    memory_usage: int | None = None
    created_at: datetime
