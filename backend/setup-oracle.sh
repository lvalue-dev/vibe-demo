#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Oracle Cloud ARM VM 초기 세팅 스크립트
# Oracle Linux 8 / Ubuntu 22.04 모두 지원
#
# 사용법:
#   1. Oracle Cloud Console → Compute → Instances → Create Instance
#      Shape: VM.Standard.A1.Flex (ARM, 4 OCPU / 24GB)  ← 무료
#      OS   : Ubuntu 22.04
#   2. SSH 접속: ssh ubuntu@<VM_PUBLIC_IP>
#   3. 이 파일 업로드 후 실행:
#        scp setup-oracle.sh ubuntu@<IP>:~/ && ssh ubuntu@<IP> "chmod +x setup-oracle.sh && ./setup-oracle.sh"
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── 1. Docker 설치 ─────────────────────────────────────────────────────────
echo ">>> Docker 설치 중..."
sudo apt-get update -y
sudo apt-get install -y ca-certificates curl gnupg
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

# ── 2. Oracle 방화벽(iptables) 3001 포트 열기 ──────────────────────────────
echo ">>> OS 방화벽 3001 포트 오픈..."
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 3001 -j ACCEPT
sudo netfilter-persistent save 2>/dev/null || sudo iptables-save | sudo tee /etc/iptables/rules.v4

# ── 3. 프로젝트 clone ─────────────────────────────────────────────────────
echo ">>> 저장소 clone..."
git clone https://github.com/lvalue-dev/vibe-demo.git ~/vibe-demo || \
  (cd ~/vibe-demo && git pull)

# ── 4. .env 파일 생성 (사용자가 값 입력) ──────────────────────────────────
ENV_FILE=~/vibe-demo/backend/.env
if [ ! -f "$ENV_FILE" ]; then
  echo ">>> .env 파일 생성 — 값을 입력하세요:"
  read -rp "KIS_APP_KEY    : " KIS_APP_KEY
  read -rsp "KIS_APP_SECRET : " KIS_APP_SECRET; echo
  read -rp "FRONTEND_URL   : " FRONTEND_URL

  cat > "$ENV_FILE" <<EOF
KIS_APP_KEY=$KIS_APP_KEY
KIS_APP_SECRET=$KIS_APP_SECRET
FRONTEND_URL=$FRONTEND_URL
KIS_MODE=paper
EOF
  echo ".env 파일 생성 완료"
else
  echo ".env 파일이 이미 존재합니다 — 건너뜀"
fi

# ── 5. Docker 빌드 & 실행 ──────────────────────────────────────────────────
echo ">>> Docker 빌드 & 실행..."
cd ~/vibe-demo/backend
docker compose --env-file .env up -d --build

echo ""
echo "✅ 배포 완료!"
echo "   서비스 확인: curl http://localhost:3001/health"
echo "   로그 확인  : docker compose logs -f"
echo ""
echo "⚠️  Oracle Console에서 Security List → Ingress Rule 추가 필수:"
echo "   Protocol: TCP / Source: 0.0.0.0/0 / Port: 3001"
echo ""
echo "   백엔드 URL: http://$(curl -s ifconfig.me):3001"
