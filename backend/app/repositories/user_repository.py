from datetime import datetime
from sqlalchemy.orm import Session
from models import User, UserSession

class UserRepository:
    # 1. 유저 생성 (회원가입)
    @staticmethod
    def create_user(db: Session, user_id: str, password_hash: str, nickname: str) -> User:
        new_user = User(
            user_id=user_id,
            password_hash=password_hash,
            nickname=nickname
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return new_user

    # 2. ID로 유저 조회
    @staticmethod
    def get_user_by_user_id(db: Session, user_id: str) -> User | None:
        return db.query(User).filter(User.user_id == user_id).first()

    # 3. 닉네임으로 유저 조회
    @staticmethod
    def get_user_by_nickname(db: Session, nickname: str) -> User | None:
        return db.query(User).filter(User.nickname == nickname).first()

    # 4. 온라인 상태 변경
    @staticmethod
    def update_online_status(db: Session, user_pk: int, is_online: bool):
        user = db.query(User).filter(User.id == user_pk).first()
        if user:
            user.is_online = is_online
            db.commit()
            return True
        return False

    # 5. 세션 생성 (로그인 처리용)
    @staticmethod
    def create_session(db: Session, user_pk: int, session_id: str, expires_at: datetime) -> UserSession:
        new_session = UserSession(
            session_id=session_id,
            user_id=user_pk,
            expires_at=expires_at
        )
        db.add(new_session)
        db.commit()
        return new_session