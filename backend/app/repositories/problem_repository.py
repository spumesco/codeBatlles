from sqlalchemy.orm import Session
from models import Problem, TestCase

class ProblemRepository:
    # 1. 새 문제 등록
    @staticmethod
    def create_problem(db: Session, title: str, description: str, input_desc: str, output_desc: str, difficulty: str, time_limit: int, memory_limit: int) -> Problem:
        new_problem = Problem(
            title=title,
            description=description,
            input_description=input_desc,
            output_description=output_desc,
            difficulty=difficulty,
            time_limit=time_limit,
            memory_limit=memory_limit
        )
        db.add(new_problem)
        db.commit()
        db.refresh(new_problem)
        return new_problem

    # 2. 테스트 케이스 추가
    @staticmethod
    def add_test_case(db: Session, problem_id: int, input_data: str, expected_output: str, is_sample: bool = False, case_order: int = 1) -> TestCase:
        test_case = TestCase(
            problem_id=problem_id,
            input_data=input_data,
            expected_output=expected_output,
            is_sample=is_sample,
            case_order=case_order
        )
        db.add(test_case)
        db.commit()
        return test_case

    # 3. 문제와 연관된 테스트 케이스 한 번에 불러오기
    @staticmethod
    def get_problem_with_testcases(db: Session, problem_id: int) -> Problem | None:
        # models.py에 relationship을 설정해두었기 때문에 문제만 조회해도 test_cases가 딸려옴!
        return db.query(Problem).filter(Problem.id == problem_id, Problem.is_deleted == False).first()

    # 4. 랜덤으로 배틀용 문제 하나 뽑기 (난이도별)
    @staticmethod
    def get_random_problem(db: Session, difficulty: str) -> Problem | None:
        from sqlalchemy.sql.expression import func
        return db.query(Problem).filter(
            Problem.difficulty == difficulty,
            Problem.is_deleted == False
        ).order_by(func.random()).first()