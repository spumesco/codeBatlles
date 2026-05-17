from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class TestCase(Base):
    __tablename__ = 'test_cases'

    id = Column(Integer, primary_key=True, autoincrement=True)
    problem_id = Column(Integer, ForeignKey('problems.id', ondelete='CASCADE'), nullable=False)
    input_data = Column(Text, nullable=False)
    expected_output = Column(Text, nullable=False)
    is_sample = Column(Boolean, nullable=False, default=False)
    case_order = Column(Integer, nullable=False, default=1)
    description = Column(String(255))
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    problem = relationship("Problem", back_populates="test_cases")