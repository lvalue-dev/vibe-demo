#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Oracle Cloud VM 원클릭 세팅 스크립트
# Ubuntu 22.04/24.04 기준 / IP 직접 접근 (HTTP)
#
# VM에서 실행:
#   curl -fsSL https://raw.githubusercontent.com/lvalue-dev/vibe-demo/main/setup-oracle.sh | bash
# 또는:
#   git clone https://github.com/lvalue-dev/vibe-demo.git ~/vibe-demo
#   bash ~/vibe-demo/setup-oracle.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

REPO_DIR="$HOME/vibe-demo"
REPO_URL="https://github.com/lvalue-dev/vibe-demo.git"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Oracle Cloud 배포 시작"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── 1. Docker 설치 (없을 경우) ────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  echo ">>> Docker 설치 중..."
  apt-get update -y
  apt-get install -y ca-certificates curl gnupg iptables-persistent
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    | tee /etc/apt/sources.list.d/docker.list > /dev/null
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
  echo ">>> Docker 설치 완료"
else
  echo ">>> Docker 이미 설치됨 — 건너뜀"
fi

# ── 2. OS 방화벽 80 포트 오픈 ─────────────────────────────────────────────────
echo ">>> 방화벽 80 포트 오픈..."
iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT 2>/dev/null || true
if command -v netfilter-persistent &>/dev/null; then
  netfilter-persistent save
fi

# ── 3. 저장소 clone / pull ────────────────────────────────────────────────────
echo ">>> 저장소 동기화..."
if [ -d "$REPO_DIR/.git" ]; then
  cd "$REPO_DIR" && git pull
else
  git clone "$REPO_URL" "$REPO_DIR"
  cd "$REPO_DIR"
fi

# ── 4. .env 확인 ──────────────────────────────────────────────────────────────
ENV_FILE="$REPO_DIR/backend/.env"
if [ ! -f "$ENV_FILE" ]; then
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  KIS API 키를 입력해주세요"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  read -rp  "KIS_APP_KEY    : " KIS_APP_KEY
  read -rsp "KIS_APP_SECRET : " KIS_APP_SECRET; echo
  cat > "$ENV_FILE" <<EOF
KIS_APP_KEY=$KIS_APP_KEY
KIS_APP_SECRET=$KIS_APP_SECRET
KIS_MODE=paper
PORT=3001
EOF
  echo ">>> .env 저장 완료"
else
  echo ">>> .env 이미 존재함 — 건너뜀"
fi

# ── 5. 기존 컨테이너 정리 후 빌드 & 실행 ──────────────────────────────────────
echo ">>> Docker 빌드 & 실행 중... (첫 실행 시 3~5분 소요)"
cd "$REPO_DIR"
docker compose -f docker-compose.oracle.yml down --remove-orphans 2>/dev/null || true
docker compose -f docker-compose.oracle.yml up -d --build

# ── 6. 헬스체크 ───────────────────────────────────────────────────────────────
echo ">>> 헬스체크 대기 중 (10초)..."
sleep 10
PUBLIC_IP=$(curl -s --max-time 5 ifconfig.me 2>/dev/null || echo "141.148.151.32")
if curl -sf "http://localhost/api/health" >/dev/null 2>&1; then
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  배포 완료!"
  echo "  URL: http://$PUBLIC_IP"
  echo "  API: http://$PUBLIC_IP/api/health"
  echo ""
  echo "  로그 확인: docker compose -f docker-compose.oracle.yml logs -f"
  echo "  재시작   : docker compose -f docker-compose.oracle.yml restart"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
else
  echo ""
  echo "⚠️  헬스체크 실패. 로그를 확인하세요:"
  echo "   docker compose -f docker-compose.oracle.yml logs"
  echo ""
  echo "   Oracle Console에서 Security List → Ingress Rules에"
  echo "   TCP 80 포트가 열려있는지 확인하세요."
fi
