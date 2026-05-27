"""로컬 subprocess 기반 경량 채점기.

Judge0 가 가용하지 않은 환경(예: Render Free tier)에서 폴백으로 사용.

지원 언어:
  - Python  (sys.executable 우선, 없으면 python3/python)
  - C       (gcc / clang / cc 중 가용한 것)
  - C++     (g++ / clang++)
  - Java    (javac + java)

각 언어는 호스트에 해당 컴파일러/런타임이 설치되어 있을 때만 'is_supported' 가 True.
Render 의 Python 컨테이너에는 기본적으로 gcc/g++ 가 들어있고, Java 는 별도 설치 필요
(Aptfile 또는 Dockerfile 로 openjdk 추가).

보안 한계:
  - 프로세스 격리는 OS 사용자 권한 수준 (Render 컨테이너 안에서만 영향)
  - 메모리/CPU 시간 제한은 POSIX rlimit 기반 (Linux 정상 동작)
  - 네트워크 차단/파일시스템 격리는 없음 — 신뢰 가능한 사용자 환경 가정
"""

import asyncio
import os
import re
import shutil
import sys
import tempfile
import time
from typing import Optional

try:
    import resource  # POSIX only
    HAS_RESOURCE = True
except ImportError:
    HAS_RESOURCE = False


# ── 컴파일 단계 타임아웃 (실행 타임아웃과 분리) ─────────────────
COMPILE_TIMEOUT_SEC = 15.0
# ── 출력 캡쳐 상한 (메모리 폭주 방지) ──────────────────────────
MAX_OUTPUT_BYTES = 1 * 1024 * 1024


def _java_public_class_name(source: str) -> str:
    """Java 소스에서 public class 이름을 추출. 없으면 'Main' 기본값.
    Java 는 파일명이 public class 이름과 일치해야 하므로 필수."""
    m = re.search(r"public\s+(?:final\s+|abstract\s+)?class\s+([A-Za-z_][A-Za-z_0-9]*)", source)
    return m.group(1) if m else "Main"


def _build_steps(language: str, tmpdir: str, source_code: str) -> Optional[dict]:
    """언어별 컴파일/실행 단계 빌드.

    Returns:
      {
        "src_path":    소스 파일 절대 경로 (호출자가 source 씀),
        "compile_cmd": [...] 또는 None,
        "run_cmd":     [...],
        "cwd":         실행 작업 디렉토리,
      }
      해당 언어를 처리할 도구가 없으면 None.
    """
    lang = (language or "").strip().lower()

    # ── Python ──────────────────────────────────────────────
    if lang in ("python", "python3", "py"):
        interp = sys.executable or shutil.which("python3") or shutil.which("python")
        if not interp or not os.path.exists(interp):
            return None
        src = os.path.join(tmpdir, "solution.py")
        return {
            "src_path": src,
            "compile_cmd": None,
            # -I: isolated mode (PYTHON* 환경 변수/usersite 무시) — 보안 강화
            # -u: 출력 라인버퍼링 끄기
            "run_cmd": [interp, "-I", "-u", src],
            "cwd": tmpdir,
        }

    # ── C ──────────────────────────────────────────────────
    if lang == "c":
        cc = shutil.which("gcc") or shutil.which("clang") or shutil.which("cc")
        if not cc:
            return None
        src = os.path.join(tmpdir, "solution.c")
        out = os.path.join(tmpdir, "solution")
        return {
            "src_path": src,
            # -O2: 최적화, -static 은 환경에 따라 실패하므로 빼고 -lm 만 추가
            "compile_cmd": [cc, "-O2", "-std=c11", "-o", out, src, "-lm"],
            "run_cmd": [out],
            "cwd": tmpdir,
        }

    # ── C++ ────────────────────────────────────────────────
    if lang in ("cpp", "c++", "cxx", "cc"):
        cxx = shutil.which("g++") or shutil.which("clang++")
        if not cxx:
            return None
        src = os.path.join(tmpdir, "solution.cpp")
        out = os.path.join(tmpdir, "solution")
        return {
            "src_path": src,
            "compile_cmd": [cxx, "-O2", "-std=c++17", "-o", out, src],
            "run_cmd": [out],
            "cwd": tmpdir,
        }

    # ── Java ───────────────────────────────────────────────
    if lang == "java":
        javac = shutil.which("javac")
        java  = shutil.which("java")
        if not javac or not java:
            return None
        cls_name = _java_public_class_name(source_code or "")
        src = os.path.join(tmpdir, f"{cls_name}.java")
        return {
            "src_path": src,
            "compile_cmd": [javac, "-encoding", "UTF-8", src],
            # -Xss / -Xmx 는 호스트 환경에 따라 거부될 수 있어 보수적으로 -Xmx 만
            "run_cmd": [java, "-Dfile.encoding=UTF-8", "-cp", tmpdir, cls_name],
            "cwd": tmpdir,
        }

    return None


def _make_limits(memory_mb: int, cpu_sec: int):
    """preexec_fn 으로 자식 프로세스에 rlimit 적용. POSIX 전용."""
    mem_bytes = max(64, int(memory_mb or 128)) * 1024 * 1024
    # Java JIT 은 메모리를 더 먹으므로 호출자가 충분히 크게 잡아야 함

    def apply():
        if not HAS_RESOURCE:
            return
        # 가상 메모리 (Address space). Java 에는 영향이 큼 — Java 채점 시
        # 메모리 제한을 더 크게 잡거나, 이 줄을 언어별로 조정 필요.
        try:
            resource.setrlimit(resource.RLIMIT_AS, (mem_bytes, mem_bytes))
        except (OSError, ValueError):
            pass
        try:
            resource.setrlimit(resource.RLIMIT_CPU, (cpu_sec + 1, cpu_sec + 2))
        except (OSError, ValueError):
            pass
        try:
            resource.setrlimit(resource.RLIMIT_FSIZE, (10 * 1024 * 1024, 10 * 1024 * 1024))
        except (OSError, ValueError):
            pass
        try:
            # Java 는 다수 스레드를 띄울 수 있어 RLIMIT_NPROC 가 너무 작으면 죽음
            resource.setrlimit(resource.RLIMIT_NPROC, (256, 256))
        except (OSError, ValueError):
            pass

    return apply


def _safe_env(tmpdir: str) -> dict:
    return {
        "PATH": os.environ.get("PATH", "/usr/local/bin:/usr/bin:/bin"),
        "LANG": "C.UTF-8",
        "LC_ALL": "C.UTF-8",
        "PYTHONIOENCODING": "utf-8",
        "HOME": tmpdir,
        # Java JRE 가 일부 환경 변수를 필요로 함
        "JAVA_TOOL_OPTIONS": os.environ.get("JAVA_TOOL_OPTIONS", ""),
    }


def _normalize_output(s: str) -> str:
    """라인 단위 trailing whitespace 제거 + CRLF→LF + 끝 빈 줄 제거."""
    if s is None:
        return ""
    s = s.replace("\r\n", "\n").replace("\r", "\n")
    lines = [line.rstrip() for line in s.split("\n")]
    while lines and lines[-1] == "":
        lines.pop()
    return "\n".join(lines)


class LocalExecutor:
    # ── 지원 여부 ────────────────────────────────────────────
    @classmethod
    def is_supported(cls, language: str) -> bool:
        with tempfile.TemporaryDirectory(prefix="cb_chk_") as td:
            return _build_steps(language, td, source_code="") is not None

    @classmethod
    def supported_languages(cls) -> list:
        """현재 호스트에서 실제로 동작 가능한 언어 목록."""
        return [
            lang for lang in ("python", "c", "cpp", "java")
            if cls.is_supported(lang)
        ]

    # ── 단일 실행 ───────────────────────────────────────────
    @classmethod
    async def run(
        cls,
        source_code: str,
        language: str,
        stdin: str,
        time_limit: int,
        memory_limit_mb: int,
    ) -> dict:
        """실행 1회. 컴파일이 필요하면 같이 처리.

        반환 키:
          status: 'OK' | 'Compilation Error' | 'Runtime Error'
                  | 'Time Limit Exceeded' | 'Memory Limit Exceeded'
                  | 'Unsupported Language'
          stdout, stderr: 문자열
          time: 실행 시간(초, float, 컴파일 시간 제외)
          memory: None
        """
        tmpdir = tempfile.mkdtemp(prefix="cb_exec_")
        try:
            steps = _build_steps(language, tmpdir, source_code)
            if not steps:
                return {
                    "status": "Unsupported Language",
                    "stdout": "",
                    "stderr": f"local executor does not support: {language}",
                    "time": None,
                    "memory": None,
                }

            # 소스 작성
            with open(steps["src_path"], "w", encoding="utf-8") as f:
                f.write(source_code)

            # 컴파일
            if steps["compile_cmd"]:
                compile_res = await cls._run_compile(steps["compile_cmd"], steps["cwd"])
                if compile_res["status"] != "OK":
                    return compile_res

            # 실행
            return await cls._run_program(
                steps["run_cmd"],
                steps["cwd"],
                stdin or "",
                time_limit,
                memory_limit_mb,
            )
        finally:
            shutil.rmtree(tmpdir, ignore_errors=True)

    # ── 컴파일 단계 ─────────────────────────────────────────
    @staticmethod
    async def _run_compile(cmd: list, cwd: str) -> dict:
        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=cwd,
                env=_safe_env(cwd),
            )
            try:
                out, err = await asyncio.wait_for(
                    proc.communicate(), timeout=COMPILE_TIMEOUT_SEC
                )
            except asyncio.TimeoutError:
                try: proc.kill()
                except Exception: pass
                return {
                    "status": "Compilation Error",
                    "stdout": "",
                    "stderr": "compilation timeout",
                    "time": None, "memory": None,
                }
        except FileNotFoundError as e:
            return {
                "status": "Compilation Error",
                "stdout": "",
                "stderr": f"compiler not found: {e}",
                "time": None, "memory": None,
            }

        if proc.returncode != 0:
            return {
                "status": "Compilation Error",
                "stdout": out.decode("utf-8", errors="replace")[:MAX_OUTPUT_BYTES],
                "stderr": err.decode("utf-8", errors="replace")[:MAX_OUTPUT_BYTES],
                "time": None, "memory": None,
            }
        return {"status": "OK", "stdout": "", "stderr": "", "time": None, "memory": None}

    # ── 실행 단계 ───────────────────────────────────────────
    @staticmethod
    async def _run_program(
        cmd: list, cwd: str, stdin: str, time_limit: int, memory_limit_mb: int
    ) -> dict:
        cpu_secs = max(1, int(time_limit or 2))
        wall_timeout = float(cpu_secs) + 1.0
        preexec = _make_limits(memory_limit_mb, cpu_secs) if os.name == "posix" else None

        start = time.monotonic()
        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=cwd,
                env=_safe_env(cwd),
                preexec_fn=preexec,
            )
        except FileNotFoundError as e:
            return {
                "status": "Runtime Error",
                "stdout": "", "stderr": f"executable not found: {e}",
                "time": None, "memory": None,
            }

        try:
            out, err = await asyncio.wait_for(
                proc.communicate(input=stdin.encode("utf-8")),
                timeout=wall_timeout,
            )
        except asyncio.TimeoutError:
            try: proc.kill()
            except Exception: pass
            try: await asyncio.wait_for(proc.wait(), timeout=1.0)
            except Exception: pass
            return {
                "status": "Time Limit Exceeded",
                "stdout": "", "stderr": "",
                "time": float(cpu_secs), "memory": None,
            }

        elapsed = round(time.monotonic() - start, 3)
        if len(out) > MAX_OUTPUT_BYTES: out = out[:MAX_OUTPUT_BYTES]
        if len(err) > MAX_OUTPUT_BYTES: err = err[:MAX_OUTPUT_BYTES]
        stdout_s = out.decode("utf-8", errors="replace")
        stderr_s = err.decode("utf-8", errors="replace")
        rc = proc.returncode

        # 메모리 초과 — SIGKILL(-9) 또는 Python MemoryError, Java OutOfMemoryError
        if rc == -9 or "MemoryError" in stderr_s or "OutOfMemoryError" in stderr_s:
            return {
                "status": "Memory Limit Exceeded",
                "stdout": stdout_s, "stderr": stderr_s,
                "time": elapsed, "memory": None,
            }
        # CPU 시간 초과 — SIGXCPU(-24)
        if rc == -24:
            return {
                "status": "Time Limit Exceeded",
                "stdout": stdout_s, "stderr": stderr_s,
                "time": elapsed, "memory": None,
            }
        if rc != 0:
            return {
                "status": "Runtime Error",
                "stdout": stdout_s, "stderr": stderr_s,
                "time": elapsed, "memory": None,
            }
        return {
            "status": "OK",
            "stdout": stdout_s, "stderr": stderr_s,
            "time": elapsed, "memory": None,
        }

    # ── 단일 테스트 케이스 채점 ─────────────────────────────
    @classmethod
    async def judge_one(
        cls,
        source_code: str,
        language: str,
        stdin: str,
        expected_output: str,
        time_limit: int,
        memory_limit_mb: int,
    ) -> dict:
        """Judge0 응답과 같은 키(status/time/memory) 로 정규화 반환."""
        run = await cls.run(source_code, language, stdin, time_limit, memory_limit_mb)
        if run["status"] != "OK":
            return {
                "status": run["status"],
                "time": run.get("time"),
                "memory": run.get("memory"),
            }

        got  = _normalize_output(run["stdout"])
        want = _normalize_output(expected_output or "")
        if got == want:
            return {"status": "Accepted", "time": run["time"], "memory": None}
        return {"status": "Wrong Answer", "time": run["time"], "memory": None}
