# 백엔드 설정 가이드

## 1) KIS (한국투자증권) 계좌 및 API 키 발급

1. **계좌 개설**: [한국투자증권 앱](https://securities.koreainvestment.com) 에서 비대면 계좌 개설
2. **API 포털 가입**: https://apiportal.koreainvestment.com → 로그인 → 앱 등록
3. **App Key / App Secret 발급**: 등록 후 바로 발급됨

> ⚠️ 처음엔 **모의투자(paper)** 모드로 시작하세요. `render.yaml`의 `KIS_MODE=paper` 그대로 두면 됩니다.

---

## 2) Render.com 배포 (무료)

1. https://render.com 가입 (GitHub 계좌로 소셜 로그인 가능)
2. **New → Web Service** → 이 레포 연결
3. 설정:
   - **Build Command**: `cd backend && npm install && npm run build`
   - **Start Command**: `cd backend && npm start`
   - **Region**: Singapore (한국 최근접)
   - **Plan**: Free
4. **Environment Variables** 탭에서 추가:
   ```
   KIS_APP_KEY     = (발급받은 App Key)
   KIS_APP_SECRET  = (발급받은 App Secret)
   KIS_MODE        = paper
   FRONTEND_URL    = https://lvalue-dev.github.io
   ```
5. Deploy → 완료되면 URL 복사 (예: `https://vibe-demo-backend.onrender.com`)

---

## 3) 프론트엔드에 백엔드 URL 설정

`frontend/.env.production` 파일 생성 (또는 GitHub Actions secrets):
```
VITE_BACKEND_URL=https://vibe-demo-backend.onrender.com
```

그 후 프론트엔드 재빌드 & 배포.

---

## 4) 로컬 개발

```bash
# 백엔드
cp backend/.env.example backend/.env
# .env에 KIS_APP_KEY, KIS_APP_SECRET 입력
cd backend && npm run dev

# 프론트엔드 (별도 터미널)
cd frontend
echo "VITE_BACKEND_URL=http://localhost:3001" > .env.local
npm run dev
```

---

## 주의사항

- **Render 무료 플랜**: 15분 비활성 시 슬립 → 첫 요청 시 ~30초 콜드스타트
  - 장 중에는 SSE 연결로 슬립 방지됨
- **KIS 모의투자 vs 실전**: 시세 조회는 동일, 실전은 `KIS_MODE=real`로 변경
- **KIS 호출 제한**: 초당 20회. 배치 처리로 자동 조절됨
