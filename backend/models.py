from datetime import datetime
from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    create_engine,
)
from sqlalchemy.orm import declarative_base, relationship, sessionmaker

# 선언적 베이스 클래스 생성
Base = declarative_base()

# Users 테이블
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

    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")
    match_entries = relationship("MatchQueue", back_populates="user", cascade="all, delete-orphan")
    submissions = relationship("Submission", back_populates="user")

    # 같은 테이블(users)을 여러 번 참조
    sent_requests = relationship("BattleRequest", foreign_keys="[BattleRequest.requester_id]", back_populates="requester")
    received_requests = relationship("BattleRequest", foreign_keys="[BattleRequest.receiver_id]", back_populates="receiver")
    
    battles_as_p1 = relationship("Battle", foreign_keys="[Battle.player1_id]", back_populates="player1")
    battles_as_p2 = relationship("Battle", foreign_keys="[Battle.player2_id]", back_populates="player2")
    won_battles = relationship("Battle", foreign_keys="[Battle.winner_id]", back_populates="winner")

    def __repr__(self):
        return f"<User(nickname='{self.nickname}', win={self.win_count}, lose={self.lose_count})>"

# User Sessions 테이블
class UserSession(Base):
    __tablename__ = 'user_sessions'

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(255), unique=True, nullable=False)
    user_id = Column(BigInteger, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    user = relationship("User", back_populates="sessions")

# Problems 테이블
class Problem(Base):
    __tablename__ = 'problems'

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    input_description = Column(Text, nullable=False)
    output_description = Column(Text, nullable=False)
    difficulty = Column(String(20), nullable=False)
    time_limit = Column(Integer, nullable=False)      # 초 단위 또는 ms 단위
    memory_limit = Column(Integer, nullable=False)    # MB 단위
    sample_input = Column(Text)
    sample_output = Column(Text)
    is_deleted = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    test_cases = relationship("TestCase", back_populates="problem", cascade="all, delete-orphan")
    battles = relationship("Battle", back_populates="problem")
    submissions = relationship("Submission", back_populates="problem")

# Test Cases 테이블
class TestCase(Base):
    __tablename__ = 'test_cases'

    id = Column(Integer, primary_key=True, autoincrement=True)
    problem_id = Column(BigInteger, ForeignKey('problems.id', ondelete='CASCADE'), nullable=False)
    input_data = Column(Text, nullable=False)
    expected_output = Column(Text, nullable=False)
    is_sample = Column(Boolean, nullable=False, default=False)
    case_order = Column(Integer, nullable=False, default=1)
    description = Column(String(255))
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    problem = relationship("Problem", back_populates="test_cases")

# Match Queue 테이블
class MatchQueue(Base):
    __tablename__ = 'match_queue'

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    status = Column(String(20), nullable=False, default='waiting')
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    user = relationship("User", back_populates="match_entries")

# Battle Requests 테이블
class BattleRequest(Base):
    __tablename__ = 'battle_requests'

    id = Column(Integer, primary_key=True, autoincrement=True)
    requester_id = Column(BigInteger, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    receiver_id = Column(BigInteger, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    status = Column(String(20), nullable=False, default='pending')
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    responded_at = Column(DateTime)

    requester = relationship("User", foreign_keys=[requester_id], back_populates="sent_requests")
    receiver = relationship("User", foreign_keys=[receiver_id], back_populates="received_requests")

# Battles 테이블
class Battle(Base):
    __tablename__ = 'battles'

    id = Column(Integer, primary_key=True, autoincrement=True)
    player1_id = Column(BigInteger, ForeignKey('users.id'), nullable=False)
    player2_id = Column(BigInteger, ForeignKey('users.id'), nullable=False)
    problem_id = Column(BigInteger, ForeignKey('problems.id'), nullable=False)
    winner_id = Column(BigInteger, ForeignKey('users.id'), nullable=True) # 무승부거나 진행중일 수 있으므로 Nullable
    status = Column(String(20), nullable=False, default='ready')
    started_at = Column(DateTime)
    finished_at = Column(DateTime)

    player1 = relationship("User", foreign_keys=[player1_id], back_populates="battles_as_p1")
    player2 = relationship("User", foreign_keys=[player2_id], back_populates="battles_as_p2")
    winner = relationship("User", foreign_keys=[winner_id], back_populates="won_battles")
    problem = relationship("Problem", back_populates="battles")
    submissions = relationship("Submission", back_populates="battle")

# Submissions 테이블

class Submission(Base):
    __tablename__ = 'submissions'

    id = Column(Integer, primary_key=True, autoincrement=True)
    battle_id = Column(BigInteger, ForeignKey('battles.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(BigInteger, ForeignKey('users.id'), nullable=False)
    problem_id = Column(BigInteger, ForeignKey('problems.id'), nullable=False)
    language = Column(String(30), nullable=False)
    source_code = Column(Text, nullable=False)
    judge_status = Column(String(50), nullable=False)
    execution_time = Column(Float)  # ms 단위 실행 시간
    memory_usage = Column(Integer)  # KB 또는 MB 단위 메모리 사용량
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    battle = relationship("Battle", back_populates="submissions")
    user = relationship("User", back_populates="submissions")
    problem = relationship("Problem", back_populates="submissions")

# 🚀 실제 DB 생성 및 실행 테스트 (SQLite)

if __name__ == "__main__":
    # DB 연결 엔진 생성
    # 실제 운영에서는 'mysql+pymysql://user:pw@localhost/dbname' 형식으로 변환
    engine = create_engine("sqlite:///coding_battle.db", echo=True)

    # 설계한 모든 테이블을 DB에 한 번에 생성
    Base.metadata.create_all(bind=engine)
    print("🎉 테이블 생성 완료! 'coding_battle.db' 파일을 확인해보세요.")

    # 세션(작업 공간) 열기
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        # 간단한 데이터 넣기 테스트
        new_user = User(
            user_id="cju",
            password_hash="1111",
            nickname="디보"
        )
        db.add(new_user)
        db.commit()
        print(f"✅ 유저 생성 성공: {new_user}")
        
    except Exception as e:
        db.rollback()
        print(f"❌ 오류 발생: {e}")
    finally:
        db.close()