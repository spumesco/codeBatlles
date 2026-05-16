from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel


class TestCaseCreate(BaseModel):
    input_data: str
    expected_output: str
    is_sample: bool = False
    case_order: int = 1
    description: Optional[str] = None


class ProblemCreate(BaseModel):
    title: str
    description: str
    input_description: str
    output_description: str
    difficulty: str
    time_limit: int
    memory_limit: int
    sample_input: Optional[str] = None
    sample_output: Optional[str] = None
    test_cases: List[TestCaseCreate] = []


class ProblemUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    input_description: Optional[str] = None
    output_description: Optional[str] = None
    difficulty: Optional[str] = None
    time_limit: Optional[int] = None
    memory_limit: Optional[int] = None
    sample_input: Optional[str] = None
    sample_output: Optional[str] = None


class TestCaseRead(BaseModel):
    id: int
    problem_id: int
    input_data: str
    expected_output: str
    is_sample: bool
    case_order: int
    description: Optional[str]

    model_config = {"from_attributes": True}


class ProblemRead(BaseModel):
    id: int
    title: str
    description: str
    input_description: str
    output_description: str
    difficulty: str
    time_limit: int
    memory_limit: int
    sample_input: Optional[str]
    sample_output: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class ProblemDetail(ProblemRead):
    test_cases: List[TestCaseRead] = []
