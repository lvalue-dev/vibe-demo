#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Oracle Cloud VM 원클릭 세팅 스크립트
# Ubuntu 22.04/24.04 및 Oracle Linux 8/9 (opc) 지원
#
# VM에서 실행:
#   curl -fsSL https://raw.githubusercontent.com/lvalue-dev/vibe-demo/main/setup-oracle.sh | sudo bash
# 또는:
#   sudo yum install -y git
#   git clone https://github.com/lvalue-dev/vibe-demo.git ~/vibe-demo
#   sudo bash ~/vibe-demo/setup-oracle.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

REPO_DIR="${SUDO_USER:+/home/$SUDO_USER}/vibe-demo"
REPO_DIR="${REPO_DIR:-$HOME/vibe-demo}"
REPO_URL="https://github.com/lvalue-dev/vibe-demo.git"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Oracle Cloud 배포 시작"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── OS 감지 ───────────────────────────────────────────────────────────────────
if [ -f /etc/os-release ]; then
  . /etc/os-release
  OS_ID="${ID:-unknown}"
else
  OS_ID="unknown"
fi

echo ">>> OS: $OS_ID"

# ── 1. 패키지 관리자 별 의존성 설치 & Docker 설치 ────────────────────────────
if ! command -v docker &>/dev/null; then
  echo ">>> Docker 설치 중..."

  if [[ "$OS_ID" == "ubuntu" || "$OS_ID" == "debian" ]]; then
    # ── Ubuntu / Debian ──
    apt-get update -y
    apt-get install -y ca-certificates curl gnupg git iptables-persistent
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

  elif [[ "$OS_ID" == "ol" || "$OS_ID" == "rhel" || "$OS_ID" == "centos" || "$OS_ID" == "rocky" || "$OS_ID" == "almalinux" ]]; then
    # ── Oracle Linux / RHEL 계열 ──
    dnf install -y git curl
    dnf config-manager --add-repo https://download.docker.com/linux/rhel/docker-ce.repo 2>/dev/null || \
      dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
    dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    systemctl enable --now docker

  else
    echo "지원하지 않는 OS: $OS_ID"
    exit 1
  fi

  echo ">>> Docker 설치 완료"
else
  echo ">>> Docker 이미 설치됨 — 건너뜀"
  # Oracle Linux: Docker 서비스 실행 확인
  if [[ "$OS_ID" == "ol" || "$OS_ID" == "rhel" || "$OS_ID" == "centos" ]]; then
    systemctl start docker 2>/dev/null || true
  fi
fi

# ── 2. OS 방화벽 80 포트 오픈 ─────────────────────────────────────────────────
echo ">>> 방화벽 80 포트 오픈..."
iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT 2>/dev/null || true

if command -v firewall-cmd &>/dev/null; then
  # Oracle Linux / RHEL: firewalld
  firewall-cmd --zone=public --add-port=80/tcp --permanent 2>/dev/null || true
  firewall-cmd --reload 2>/dev/null || true
elif command -v netfilter-persistent &>/dev/null; then
  # Ubuntu
  netfilter-persistent save
fi

# ── 3. git 설치 확인 ──────────────────────────────────────────────────────────
if ! command -v git &>/dev/null; then
  echo ">>> git 설치 중..."
  if command -v dnf &>/dev/null; then
    dnf install -y git
  else
    apt-get install -y git
  fi
fi

# ── 4. 저장소 clone / pull ────────────────────────────────────────────────────
echo ">>> 저장소 동기화..."
REAL_HOME="${SUDO_USER:+/home/$SUDO_USER}"
REAL_HOME="${REAL_HOME:-$HOME}"
REPO_DIR="$REAL_HOME/vibe-demo"

if [ -d "$REPO_DIR/.git" ]; then
  cd "$REPO_DIR"
  if [ -n "${SUDO_USER:-}" ]; then
    sudo -u "$SUDO_USER" git pull
  else
    git pull
  fi
else
  if [ -n "${SUDO_USER:-}" ]; then
    sudo -u "$SUDO_USER" git clone "$REPO_URL" "$REPO_DIR"
  else
    git clone "$REPO_URL" "$REPO_DIR"
  fi
  cd "$REPO_DIR"
fi
cd "$REPO_DIR"

# ── 5. .env 확인 ──────────────────────────────────────────────────────────────
ENV_FILE="$REPO_DIR/backend/.env"
if [ ! -f "$ENV_FILE" ]; then
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  KIS API 키를 입력해주세요"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  read -rp  "KIS_APP_KEY          : " KIS_APP_KEY
  read -rsp "KIS_APP_SECRET       : " KIS_APP_SECRET; echo
  read -rp  "GEMINI_API_KEY       : (aistudio.google.com 무료발급, Enter 건너뜀) " GEMINI_API_KEY
  read -rp  "TELEGRAM_BOT_TOKEN  : (Enter 건너뜀) " TELEGRAM_BOT_TOKEN
  read -rp  "TELEGRAM_CHAT_ID    : (Enter 건너뜀) " TELEGRAM_CHAT_ID
  read -rp  "N8N_PASSWORD        : (기본 changeme) " N8N_PASSWORD
  N8N_PASSWORD="${N8N_PASSWORD:-changeme}"
  cat > "$ENV_FILE" <<EOF
KIS_APP_KEY=$KIS_APP_KEY
KIS_APP_SECRET=$KIS_APP_SECRET
KIS_MODE=paper
PORT=3001
GEMINI_API_KEY=$GEMINI_API_KEY
EOF
  # n8n 환경변수 파일 (docker-compose에서 참조)
  cat > "$REPO_DIR/.env" <<EOF
N8N_USER=admin
N8N_PASSWORD=$N8N_PASSWORD
TELEGRAM_BOT_TOKEN=$TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID=$TELEGRAM_CHAT_ID
EOF
  echo ">>> .env 저장 완료"
else
  echo ">>> .env 이미 존재함 — 건너뜀"
fi

# ── 6. 기존 컨테이너 정리 후 빌드 & 실행 ──────────────────────────────────────
echo ">>> Docker 빌드 & 실행 중... (첫 실행 시 3~5분 소요)"
cd "$REPO_DIR"
docker compose -f docker-compose.oracle.yml down --remove-orphans 2>/dev/null || true
docker compose -f docker-compose.oracle.yml up -d --build

# ── 7. 헬스체크 ───────────────────────────────────────────────────────────────
echo ">>> 헬스체크 대기 중 (15초)..."
sleep 15
PUBLIC_IP=$(curl -s --max-time 5 ifconfig.me 2>/dev/null || \
            curl -s --max-time 5 icanhazip.com 2>/dev/null || \
            echo "YOUR_SERVER_IP")
if curl -sf "http://localhost/api/health" >/dev/null 2>&1; then
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  배포 완료!"
  echo "  URL: http://$PUBLIC_IP"
  echo "  API: http://$PUBLIC_IP/api/health"
  echo "  n8n: http://$PUBLIC_IP:5678  (Oracle Security List에서 5678 포트 오픈 필요)"
  echo ""
  echo "  n8n 워크플로우 가져오기:"
  echo "    http://$PUBLIC_IP:5678 → Settings → Import → n8n-workflows/ 폴더의 JSON 파일"
  echo ""
  echo "  로그 확인: docker compose -f $REPO_DIR/docker-compose.oracle.yml logs -f"
  echo "  재시작   : docker compose -f $REPO_DIR/docker-compose.oracle.yml restart"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
else
  echo ""
  echo "⚠️  헬스체크 실패. 로그를 확인하세요:"
  echo "   docker compose -f $REPO_DIR/docker-compose.oracle.yml logs"
  echo ""
  echo "   Oracle Console에서 Security List → Ingress Rules에"
  echo "   TCP 80 포트가 열려있는지 확인하세요."
fi
