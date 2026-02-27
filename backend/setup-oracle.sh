#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Oracle Cloud ARM VM 초기 세팅 스크립트
# Ubuntu 22.04 기준 / DuckDNS 무료 도메인 + Caddy 자동 HTTPS
#
# 사전 준비 (이 스크립트 실행 전):
#   1. https://www.duckdns.org 에서 GitHub 로그인
#   2. 서브도메인 생성 (예: vibe-demo-api) → 내 VM 공인 IP 입력
#      → 도메인: vibe-demo-api.duckdns.org
#
# VM 생성:
#   Oracle Console → Compute → Instances → Create Instance
#   Shape : VM.Standard.A1.Flex (ARM, OCPU: 2, RAM: 12GB) ← 무료
#   OS    : Ubuntu 22.04
#
# 실행:
#   scp setup-oracle.sh ubuntu@<VM_IP>:~/
#   ssh ubuntu@<VM_IP> "chmod +x setup-oracle.sh && ./setup-oracle.sh"
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

PUBLIC_IP=$(curl -s ifconfig.me)

# ── 1. Docker 설치 ─────────────────────────────────────────────────────────
echo ">>> Docker 설치 중..."
sudo apt-get update -y
sudo apt-get install -y ca-certificates curl gnupg iptables-persistent
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo usermod -aG docker "$USER"

# ── 2. OS 방화벽: 80, 443 포트 오픈 (Caddy용) ─────────────────────────────
echo ">>> OS 방화벽 80 / 443 포트 오픈..."
for PORT in 80 443; do
  sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport "$PORT" -j ACCEPT
done
sudo iptables -I INPUT 6 -m state --state NEW -p udp --dport 443 -j ACCEPT  # HTTP/3
sudo netfilter-persistent save

# ── 3. 프로젝트 clone ─────────────────────────────────────────────────────
echo ">>> 저장소 clone..."
git clone https://github.com/lvalue-dev/vibe-demo.git ~/vibe-demo 2>/dev/null || \
  (cd ~/vibe-demo && git pull)

# ── 4. .env 파일 생성 ─────────────────────────────────────────────────────
ENV_FILE=~/vibe-demo/backend/.env
if [ ! -f "$ENV_FILE" ]; then
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  환경변수 설정"
  echo "  DuckDNS 도메인 예시: vibe-demo-api.duckdns.org"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  read -rp  "DOMAIN         (duckdns.org 포함): " DOMAIN
  read -rp  "KIS_APP_KEY                      : " KIS_APP_KEY
  read -rsp "KIS_APP_SECRET                   : " KIS_APP_SECRET; echo
  FRONTEND_URL="https://lvalue-dev.github.io"

  cat > "$ENV_FILE" <<EOF
DOMAIN=$DOMAIN
KIS_APP_KEY=$KIS_APP_KEY
KIS_APP_SECRET=$KIS_APP_SECRET
FRONTEND_URL=$FRONTEND_URL
KIS_MODE=paper
EOF
  echo ">>> .env 저장 완료"
else
  echo ">>> .env 파일이 이미 존재합니다 — 건너뜀"
fi

# ── 5. Docker 빌드 & 실행 ──────────────────────────────────────────────────
echo ">>> Docker 빌드 & 기동..."
cd ~/vibe-demo/backend
# 그룹 변경 반영을 위해 sg 없이 sudo 사용
sudo docker compose --env-file .env up -d --build

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅  배포 완료!"
DOMAIN_VAL=$(grep '^DOMAIN=' "$ENV_FILE" | cut -d= -f2)
echo "   백엔드 URL : https://${DOMAIN_VAL}"
echo "   헬스체크   : curl https://${DOMAIN_VAL}/health"
echo "   로그       : sudo docker compose logs -f"
echo ""
echo "⚠️  Oracle Console 추가 작업 필수:"
echo "   Networking → VCN → Security List → Ingress Rules 추가"
echo "   ┌──────────┬──────────┬──────────┐"
echo "   │ Protocol │  Source  │  Port    │"
echo "   ├──────────┼──────────┼──────────┤"
echo "   │  TCP     │ 0.0.0.0/0│  80      │"
echo "   │  TCP     │ 0.0.0.0/0│  443     │"
echo "   └──────────┴──────────┴──────────┘"
echo ""
echo "   이후 .env.production 업데이트:"
echo "   VITE_BACKEND_URL=https://${DOMAIN_VAL}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
