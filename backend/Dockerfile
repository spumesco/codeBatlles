# ────────────────────────────────────────────────────────────
# CodeBattles 백엔드 이미지
#  - Python 3.11
#  - gcc / g++ — C / C++ 로컬 채점 폴백
#  - default-jdk-headless — Java 로컬 채점 폴백
#
# 동작 방식:
#   1) JUDGE0_URL 호출 시도 (docker-compose 환경에선 http://judge0:2358)
#   2) Judge0 연결 실패 시 → LocalExecutor 가 컨테이너 안의
#      python/gcc/g++/javac/java 로 직접 채점 (Render free tier 대응)
#
# Render 배포 시: 별도 compose 없이 이 단일 Dockerfile 만으로 동작.
#   - JUDGE0_URL 을 안 풀어도 자동 폴백
#   - 또는 RapidAPI Judge0 URL/헤더 추가해서 사용 가능
# ────────────────────────────────────────────────────────────
FROM python:3.11-slim

# ── 빌드 마커 — Render 의 빌드 캐시가 옛 레이어를 재사용하지 못하게 강제. ──
# 값이 바뀌면 ARG 이후의 모든 RUN 이 다시 실행됨. 또한 /api/health 에 노출돼
# 운영에 정확히 어느 빌드가 떠 있는지 즉시 확인 가능.
ARG BUILD_MARKER=2026-05-28-jdk-fallback-1
ENV BUILD_MARKER=$BUILD_MARKER

# ── 시스템 패키지 — C/C++ 컴파일러 ────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
        gcc \
        g++ \
        build-essential \
        default-libmysqlclient-dev \
        pkg-config \
        ca-certificates \
        curl \
    && rm -rf /var/lib/apt/lists/*

# ── JDK 설치 — 여러 패키지 후보를 순차 시도 ──────────────────
# Debian 미러에 따라 일부 패키지가 못 찾아지는 경우가 있어 폴백 체인 구성.
# 우선순위: openjdk-17 → openjdk-21 → openjdk-11 → default-jdk
# 마지막 후보까지 실패하면 빌드 자체가 실패함 (set -e + exit 1).
RUN set -eux; \
    apt-get update; \
    if   apt-get install -y --no-install-recommends openjdk-17-jdk-headless; then \
        echo "[Dockerfile] installed openjdk-17-jdk-headless"; \
    elif apt-get install -y --no-install-recommends openjdk-21-jdk-headless; then \
        echo "[Dockerfile] installed openjdk-21-jdk-headless"; \
    elif apt-get install -y --no-install-recommends openjdk-11-jdk-headless; then \
        echo "[Dockerfile] installed openjdk-11-jdk-headless"; \
    elif apt-get install -y --no-install-recommends default-jdk; then \
        echo "[Dockerfile] installed default-jdk"; \
    else \
        echo "[Dockerfile] FATAL: no JDK package available" >&2; exit 1; \
    fi; \
    rm -rf /var/lib/apt/lists/*

# ── 빌드 시 검증 — 채점에 필요한 도구가 실제로 동작하는지 확인 ──
# 하나라도 없으면 빌드가 빨간색으로 실패해서 "Judge Unavailable" 같은
# 모호한 런타임 에러로 디버깅 시간 낭비할 일이 없다.
RUN set -eux; \
    which gcc   && gcc --version | head -1; \
    which g++   && g++ --version | head -1; \
    which javac && javac --version; \
    which java  && java  --version

# ── Python 의존성 ────────────────────────────────────────────
WORKDIR /app
COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# ── 앱 코드 ──────────────────────────────────────────────────
# backend/ 디렉토리 통째로 복사 — app/, models.py 등 포함
COPY backend/ /app/

# frontend 파일도 같이 서빙 (main.py 가 ../frontend 경로 사용)
COPY frontend/ /frontend/

# ── 실행 ────────────────────────────────────────────────────
# Render 는 $PORT 를 주입함. 로컬/compose 는 기본 8000.
ENV PORT=8000
EXPOSE 8000

# main.py 가 PROJECT_ROOT = parents[2] 기준으로 frontend 경로 잡으므로,
# /app/app/main.py 기준으로 /frontend 가 올바르게 매칭되도록 구조 맞춤:
#   /app/app/main.py  → parents[2] == /  → /frontend ✓
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers --forwarded-allow-ips='*'"]
