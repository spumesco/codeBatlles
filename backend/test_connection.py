from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# 📁 repositories 폴더에 있는 파일들 불러오기 (연동 테스트!)
from repositories.problem_repository import ProblemRepository
from repositories.user_repository import UserRepository

# DB 연결 [coding_battle.db 파일 사용]
engine = create_engine("sqlite:///coding_battle.db", echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

try:
    print("🔄 [테스트 1] 유저 레포지토리 연동 확인 중...")
    
    # 아까 models.py 실행할 때 넣었던 'cju' (디보) 유저를 repository 조회
    existing_user = UserRepository.get_user_by_user_id(db, user_id="cju")
    
    if existing_user:
        print(f"  ✅ 성공! DB에서 유저를 찾았습니다: 닉네임 '{existing_user.nickname}'")
        
        # repository 함수를 써서 온라인 상태로 변경
        UserRepository.update_online_status(db, user_pk=existing_user.id, is_online=True)
        print("  ✅ '디보' 유저의 상태를 [온라인]으로 변경했습니다.")
    else:
        print("  ❌ 'cju' 유저를 찾지 못했습니다. (models.py를 먼저 실행했는지 확인해주세요)")

    print("\n🔄 [테스트 2] 문제 레포지토리 연동 확인 중...")
    
    # repository 사용해 새로운 테스트용 문제 하나 등록
    new_problem = ProblemRepository.create_problem(
        db=db,
        title="A+B 더하기",
        description="두 정수 A와 B를 입력받은 다음, A+B를 출력하는 프로그램을 작성하시오.",
        input_desc="첫째 줄에 A와 B가 주어진다.",
        output_desc="첫째 줄에 A+B를 출력한다.",
        difficulty="Bronze",
        time_limit=1000,   # 1000ms (1초)
        memory_limit=128   # 128MB
    )
    print(f"  ✅ 성공! 새 문제를 DB에 등록했습니다: [{new_problem.difficulty}] {new_problem.title}")

    print("\n🎉 모든 레포지토리가 models.py 및 DB와 완벽하게 연동되었습니다!")

except Exception as e:
    print(f"\n❌ 연동 테스트 중 오류가 발생했습니다: {e}")

finally:
    db.close()