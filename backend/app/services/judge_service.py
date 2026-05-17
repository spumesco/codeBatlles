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
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{settings.JUDGE0_URL}/submissions?base64_encoded=false&wait=true",
                json=payload,
                timeout=30.0,
            )
        data = resp.json()
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
        for tc in test_cases:
            result = await JudgeService._submit_one(
                source_code, language,
                tc.input_data, tc.expected_output,
                time_limit, memory_limit,
            )
            if result["status"] != "Accepted":
                return result
        return {"status": "Accepted", "time": None, "memory": None}
