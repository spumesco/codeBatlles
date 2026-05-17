from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class Battle(Base):
    __tablename__ = 'battles'

    id = Column(Integer, primary_key=True, autoincrement=True)
    player1_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    player2_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    problem_id = Column(Integer, ForeignKey('problems.id'), nullable=False)
    winner_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    status = Column(String(20), nullable=False, default='ready')
    started_at = Column(DateTime)
    finished_at = Column(DateTime)

    player1 = relationship("User", foreign_keys=[player1_id], back_populates="battles_as_p1")
    player2 = relationship("User", foreign_keys=[player2_id], back_populates="battles_as_p2")
    winner = relationship("User", foreign_keys=[winner_id], back_populates="won_battles")
    problem = relationship("Problem", back_populates="battles")
    submissions = relationship("Submission", back_populates="battle")