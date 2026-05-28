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

# ── 시스템 패키지 ────────────────────────────────────────────
# gcc/g++              : C, C++ 컴파일
# openjdk-17-jdk-headless : javac + java (Java 채점)
#   - default-jdk-headless 가 슬림 이미지에서 javac 누락되는 케이스가 있어
#     버전 명시 패키지로 고정.
# build-essential      : Python 의 일부 wheel 빌드(bcrypt 등)에 필요
# default-libmysqlclient-dev, pkg-config : MySQL 드라이버 빌드용
# ca-certificates      : HTTPS (RapidAPI 등 외부 호출용)
RUN apt-get update && apt-get install -y --no-install-recommends \
        gcc \
        g++ \
        openjdk-17-jdk-headless \
        build-essential \
        default-libmysqlclient-dev \
        pkg-config \
        ca-certificates \
        curl \
    && rm -rf /var/lib/apt/lists/*

# ── 빌드 시 검증 — 채점기에 필요한 도구가 모두 깔렸는지 확인 ──
# 하나라도 없으면 RUN 이 0이 아닌 코드로 종료되어 빌드가 빨간색으로 실패한다.
# (런타임에 "Judge Unavailable" 같은 모호한 에러로 시간 낭비하지 않게)
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
