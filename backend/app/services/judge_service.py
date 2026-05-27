"""채점 서비스.

기본 동작:
  1) Judge0 (settings.JUDGE0_URL) 호출 시도
  2) Judge0 가 연결 실패 / 타임아웃 / 5xx / 비정상 응답 → 로컬 폴백 시도
  3) 로컬 폴백도 지원 안 되는 언어 → 'Judge Unavailable' 상태 반환

환경 변수:
  JUDGE0_URL              — Judge0 API base URL (기본 http://localhost:2358)
  USE_LOCAL_FALLBACK=0    — 로컬 폴백 비활성화 (기본은 활성화)
"""

import logging
import os
from typing import Optional

# httpx 가 환경에 따라 미설치일 수 있어 soft-import.
# 미설치 시 Judge0 호출은 자동으로 스킵되고 LocalExecutor 폴백으로 직행한다.
try:
    import httpx  # type: ignore
    HAS_HTTPX = True
except ImportError:
    httpx = None  # type: ignore
    HAS_HTTPX = False

from app.config import settings
from app.services.local_executor import LocalExecutor

logger = logging.getLogger(__name__)

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

# 로컬 폴백 토글 — 운영 환경에서 끄고 싶을 때 USE_LOCAL_FALLBACK=0
USE_LOCAL_FALLBACK = os.environ.get("USE_LOCAL_FALLBACK", "1") != "0"

# Judge0 호출 타임아웃 — 너무 길게 잡으면 폴백 전환이 늦어진다.
JUDGE0_TIMEOUT_SEC = float(os.environ.get("JUDGE0_TIMEOUT_SEC", "10"))


class JudgeService:
    # ── Judge0 단일 호출 (실패 시 None) ─────────────────────────
    @staticmethod
    async def _submit_to_judge0(
        source_code: str,
        language: str,
        stdin: str,
        expected_output: str,
        time_limit: int,
        memory_limit: int,
    ) -> Optional[dict]:
        lang_id = LANGUAGE_IDS.get(language.lower(), 71)
        payload = {
            "source_code": source_code,
            "language_id": lang_id,
            "stdin": stdin,
            "expected_output": expected_output,
            "cpu_time_limit": time_limit,
            "memory_limit": memory_limit * 1024,
        }
        # httpx 가 설치 안 됐으면 Judge0 호출 자체가 불가 — 폴백으로 직행
        if not HAS_HTTPX:
            return None

        url = f"{settings.JUDGE0_URL}/submissions?base64_encoded=false&wait=true"
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(url, json=payload, timeout=JUDGE0_TIMEOUT_SEC)
        except (httpx.HTTPError, OSError) as e:
            logger.warning("Judge0 연결 실패 — 폴백 검토: %s", e)
            return None

        if resp.status_code >= 500:
            logger.warning("Judge0 5xx 응답 — 폴백 검토: %s", resp.status_code)
            return None
        if resp.status_code >= 400:
            # 4xx 는 요청 자체 문제 — 폴백 의미 없음
            logger.warning("Judge0 4xx: %s body=%s", resp.status_code, resp.text[:200])
            return {
                "status": "Judge Error",
                "time": None,
                "memory": None,
            }
        try:
            data = resp.json()
        except ValueError:
            logger.warning("Judge0 응답 JSON 파싱 실패")
            return None

        return {
            "status": data.get("status", {}).get("description", "Unknown"),
            "time": data.get("time"),
            "memory": data.get("memory"),
        }

    # ── 단일 채점 (Judge0 → 로컬 폴백) ──────────────────────────
    @staticmethod
    async def _submit_one(
        source_code: str,
        language: str,
        stdin: str,
        expected_output: str,
        time_limit: int,
        memory_limit: int,
    ) -> dict:
        # 1) Judge0 우선
        result = await JudgeService._submit_to_judge0(
            source_code, language, stdin, expected_output, time_limit, memory_limit
        )
        if result is not None:
            return result

        # 2) 로컬 폴백 (지원 언어만)
        if USE_LOCAL_FALLBACK and LocalExecutor.is_supported(language):
            logger.info("로컬 폴백으로 채점 — language=%s", language)
            return await LocalExecutor.judge_one(
                source_code, language, stdin, expected_output, time_limit, memory_limit
            )

        # 3) 폴백도 불가
        return {
            "status": "Judge Unavailable",
            "time": None,
            "memory": None,
        }

    # ── 전체 테스트 케이스 채점 ─────────────────────────────────
    @staticmethod
    async def judge_all(
        source_code: str,
        language: str,
        test_cases: list,
        time_limit: int = 2,
        memory_limit: int = 128,
    ) -> dict:
        if not test_cases:
            # 빈 코드로 자동 Accepted 되는 사고 방지
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
