# StockGuide

주식 초보자를 위한 투자 의사결정 지원 웹 서비스

## 기능

- **종목 리스트**: 전체 종목 현황 + 추천 상태 확인
- **종목 상세**: 가격 차트, 추천 이유, 기술 지표
- **관심 종목**: 관심 종목 등록 및 관리
- **포트폴리오**: 보유 종목 수익률 추적
- **자동 분석**: 5분마다 기술적 분석 자동 실행

## 기술 스택

| 영역 | 기술 |
|------|------|
| Frontend | React, TypeScript, Vite, TailwindCSS, Recharts |
| Backend | Spring Boot 3, Java 17, JPA |
| Database | PostgreSQL (Supabase) |
| Cache | Redis (Upstash) |
| 배포 | Vercel (FE) + Render (BE) |

## 분석 로직

| 조건 | 점수 |
|------|------|
| 현재가 < MA20 (저평가) | +20 |
| MA5 > MA20 (골든크로스) | +20 |
| 거래량 1.5배+ | +20 |
| 상승 추세 | +20 |
| 변동성 낮음 | +20 |

| 점수 | 추천 |
|------|------|
| 80+ | 강한 매수 |
| 60+ | 매수 |
| 40+ | 관망 |
| ~40 | 매도 |

## 환경변수

### Backend
```
DATABASE_URL=jdbc:postgresql://...
DATABASE_USERNAME=...
DATABASE_PASSWORD=...
REDIS_URL=redis://...
JWT_SECRET=...
CORS_ORIGINS=https://your-app.vercel.app
```

### Frontend
```
VITE_API_URL=https://your-backend.onrender.com
```

## 로컬 실행

```bash
# Backend
cd backend
./gradlew bootRun

# Frontend
cd frontend
npm install
npm run dev
```
