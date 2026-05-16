from sqlalchemy.orm import Session
from models import Submission

class SubmissionRepository:
    # 1. 제출 기록 저장
    @staticmethod
    def create_submission(db: Session, battle_id: int, user_pk: int, problem_id: int, language: str, source_code: str, judge_status: str, exec_time: float = None, memory: int = None) -> Submission:
        new_sub = Submission(
            battle_id=battle_id,
            user_id=user_pk,
            problem_id=problem_id,
            language=language,
            source_code=source_code,
            judge_status=judge_status,
            execution_time=exec_time,
            memory_usage=memory
        )
        db.add(new_sub)
        db.commit()
        db.refresh(new_sub)
        return new_sub

    # 2. 특정 배틀에서 제출된 모든 기록 조회 (시간순)
    @staticmethod
    def get_submissions_by_battle(db: Session, battle_id: int):
        return db.query(Submission).filter(Submission.battle_id == battle_id).order_by(Submission.created_at.asc()).all()

    # 3. 특정 유저가 특정 배틀에서 "정답(Accepted)"을 받았는지 확인
    @staticmethod
    def has_user_passed(db: Session, battle_id: int, user_pk: int) -> bool:
        passed = db.query(Submission).filter(
            Submission.battle_id == battle_id,
            Submission.user_id == user_pk,
            Submission.judge_status == "Accepted"
        ).first()
        return passed is not None