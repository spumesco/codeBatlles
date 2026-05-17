from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class Submission(Base):
    __tablename__ = 'submissions'

    id = Column(Integer, primary_key=True, autoincrement=True)
    battle_id = Column(Integer, ForeignKey('battles.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    problem_id = Column(Integer, ForeignKey('problems.id'), nullable=False)
    language = Column(String(30), nullable=False)
    source_code = Column(Text, nullable=False)
    judge_status = Column(String(50), nullable=False)
    execution_time = Column(Float)
    memory_usage = Column(Integer)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    battle = relationship("Battle", back_populates="submissions")
    user = relationship("User", back_populates="submissions")
    problem = relationship("Problem", back_populates="submissions")