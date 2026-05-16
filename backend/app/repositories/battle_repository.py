from datetime import datetime
from sqlalchemy.orm import Session
from models import Battle, BattleRequest, MatchQueue, User


class BattleRepository:
    # 1. 매칭 대기열 등록
    @staticmethod
    def join_match_queue(db: Session, user_pk: int) -> MatchQueue:
        entry = MatchQueue(user_id=user_pk, status="waiting")
        db.add(entry)
        db.commit()
        return entry

    # 2. 1대1 배틀 방 생성
    @staticmethod
    def create_battle(db: Session, player1_id: int, player2_id: int, problem_id: int) -> Battle:
        new_battle = Battle(
            player1_id=player1_id,
            player2_id=player2_id,
            problem_id=problem_id,
            status="ready"
        )
        db.add(new_battle)

        # 플레이어들의 상태를 '배틀 중'으로 변경
        p1 = db.query(User).filter(User.id == player1_id).first()
        p2 = db.query(User).filter(User.id == player2_id).first()
        if p1: p1.is_battling = True
        if p2: p2.is_battling = True

        db.commit()
        db.refresh(new_battle)
        return new_battle

    # 3. 배틀 시작 처리 (시간 기록)
    @staticmethod
    def start_battle(db: Session, battle_id: int):
        battle = db.query(Battle).filter(Battle.id == battle_id).first()
        if battle:
            battle.status = "playing"
            battle.started_at = datetime.utcnow()
            db.commit()
        return battle

    # 4. 배틀 종료 및 승자 기록 (전적 업데이트)
    @staticmethod
    def finish_battle(db: Session, battle_id: int, winner_id: int | None = None):
        battle = db.query(Battle).filter(Battle.id == battle_id).first()
        if not battle:
            return None

        battle.status = "finished"
        battle.finished_at = datetime.utcnow()
        battle.winner_id = winner_id

        # 승패 카운트 올려주기
        p1 = db.query(User).filter(User.id == battle.player1_id).first()
        p2 = db.query(User).filter(User.id == battle.player2_id).first()

        if p1: p1.is_battling = False
        if p2: p2.is_battling = False

        if winner_id == battle.player1_id:
            if p1: p1.win_count += 1
            if p2: p2.lose_count += 1
        elif winner_id == battle.player2_id:
            if p2: p2.win_count += 1
            if p1: p1.lose_count += 1

        db.commit()
        return battle