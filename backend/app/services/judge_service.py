from typing import Optional
import httpx

from app.config import settings

LANGUAGE_IDS: dict[str, int] = {
    "python": 71,
    "python3": 71,
    "java": 62,
    "cpp": 54,
    "c": 50,
    "javascript": 63,
    "js": 63,
    "typescript": 74,
}


class JudgeUnavailable(Exception):
    """채점 서버(Judge0) 에 접근할 수 없을 때 발생."""


class JudgeService:
    @staticmethod
    async def _submit_one(
        source_code: str,
        language: str,
        stdin: str,
        expected_output: str,
        time_limit: int,
        memory_limit: int,
    ) -> dict:
        lang_id = LANGUAGE_IDS.get(language.lower(), 71)
        payload = {
            "source_code": source_code,
            "language_id": lang_id,
            "stdin": stdin,
            "expected_output": expected_output,
            "cpu_time_limit": time_limit,
            "memory_limit": memory_limit * 1024,
        }
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    f"{settings.JUDGE0_URL}/submissions?base64_encoded=false&wait=true",
                    json=payload,
                    timeout=30.0,
                )
        except (httpx.ConnectError, httpx.ConnectTimeout, httpx.ReadTimeout, httpx.NetworkError) as e:
            # 채점 서버에 연결 자체가 안 되는 경우 — 호출자가 사용자에게 안내하도록 전용 예외로 변환.
            raise JudgeUnavailable(f"채점 서버에 연결할 수 없습니다: {e!s}") from e

        if resp.status_code >= 500:
            raise JudgeUnavailable(f"채점 서버 오류(status={resp.status_code})")

        try:
            data = resp.json()
        except ValueError as e:
            raise JudgeUnavailable("채점 서버가 잘못된 응답을 반환했습니다.") from e

        return {
            "status": data.get("status", {}).get("description", "Unknown"),
            "time": data.get("time"),
            "memory": data.get("memory"),
        }

    @staticmethod
    async def judge_all(
        source_code: str,
        language: str,
        test_cases: list,
        time_limit: int = 2,
        memory_limit: int = 128,
    ) -> dict:
        if not test_cases:
            # 테스트 케이스가 없다면 절대 Accepted 처리하면 안 된다. 빈 코드로 승리 방지.
            return {"status": "No Test Cases", "time": None, "memory": None}

        for tc in test_cases:
            result = await JudgeService._submit_one(
                source_code, language,
                tc.input_data, tc.expected_output,
                time_limit, memory_limit,
            )
            if result["status"] != "Accepted":
                return result
        return {"status": "Accepted", "time": None, "memory": None}
