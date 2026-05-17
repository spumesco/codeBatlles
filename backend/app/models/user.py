from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(50), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    nickname = Column(String(50), unique=True, nullable=False)
    role = Column(String(20), nullable=False, default='user')
    win_count = Column(Integer, nullable=False, default=0)
    lose_count = Column(Integer, nullable=False, default=0)
    is_online = Column(Boolean, nullable=False, default=False)
    is_battling = Column(Boolean, nullable=False, default=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")
    match_entries = relationship("MatchQueue", back_populates="user", cascade="all, delete-orphan")
    submissions = relationship("Submission", back_populates="user")

    sent_requests = relationship("BattleRequest", foreign_keys="[BattleRequest.requester_id]", back_populates="requester")
    received_requests = relationship("BattleRequest", foreign_keys="[BattleRequest.receiver_id]", back_populates="receiver")
    
    battles_as_p1 = relationship("Battle", foreign_keys="[Battle.player1_id]", back_populates="player1")
    battles_as_p2 = relationship("Battle", foreign_keys="[Battle.player2_id]", back_populates="player2")
    won_battles = relationship("Battle", foreign_keys="[Battle.winner_id]", back_populates="winner")

    def __repr__(self):
        return f"<User(nickname='{self.nickname}', win={self.win_count}, lose={self.lose_count})>"