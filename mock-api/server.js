const express = require('express')
const cors = require('cors')

const app = express()
app.use(cors())
app.use(express.json())

// ── 목 데이터 ────────────────────────────────────────────────────────────────

const stocks = [
  { symbol: '005930.KS', name: '삼성전자', market: 'KOSPI', sector: '반도체', currentPrice: 72400, prevClose: 71500, volume: 15234567, score: 78, recommendation: 'BUY', recommendationLabel: '매수 적절', risk: 'LOW', riskLabel: '낮음', priceChangeRate: 0.0126, ma5: 71200, ma20: 69800, volumeRatio: 1.72, reasons: ['현재 가격이 20일 평균보다 3.7% 낮음 (저평가 구간)', '단기(5일) 이동평균이 장기(20일)를 상회 - 상승 모멘텀', '거래량이 평균 대비 1.7배 증가 - 관심 집중', '전일 대비 +1.26% 상승 중'] },
  { symbol: '000660.KS', name: 'SK하이닉스', market: 'KOSPI', sector: '반도체', currentPrice: 198500, prevClose: 201000, volume: 4523100, score: 42, recommendation: 'HOLD', recommendationLabel: '관망', risk: 'MEDIUM', riskLabel: '보통', priceChangeRate: -0.0124, ma5: 201200, ma20: 204500, volumeRatio: 0.82, reasons: ['단기(5일) 이동평균이 장기(20일) 하회 - 하락 추세', '전일 대비 -1.24% 하락 중', '변동성 낮음 - 안정적인 가격 흐름'] },
  { symbol: '035420.KS', name: 'NAVER', market: 'KOSPI', sector: 'IT', currentPrice: 182500, prevClose: 180000, volume: 892340, score: 60, recommendation: 'BUY', recommendationLabel: '매수 적절', risk: 'LOW', riskLabel: '낮음', priceChangeRate: 0.0139, ma5: 181000, ma20: 184200, volumeRatio: 1.1, reasons: ['전일 대비 +1.39% 상승 중', '변동성 낮음 - 안정적인 가격 흐름'] },
  { symbol: '035720.KS', name: '카카오', market: 'KOSPI', sector: 'IT', currentPrice: 38450, prevClose: 39200, volume: 3120450, score: 32, recommendation: 'SELL', recommendationLabel: '매도', risk: 'HIGH', riskLabel: '높음', priceChangeRate: -0.0191, ma5: 39200, ma20: 40100, volumeRatio: 0.74, reasons: ['단기(5일) 이동평균이 장기(20일) 하회 - 하락 추세', '전일 대비 -1.91% 하락 중', '변동성 높음 - 단기 급등락 주의'] },
  { symbol: '373220.KS', name: 'LG에너지솔루션', market: 'KOSPI', sector: '전기차배터리', currentPrice: 312000, prevClose: 308000, volume: 756230, score: 80, recommendation: 'STRONG_BUY', recommendationLabel: '강한 매수', risk: 'LOW', riskLabel: '낮음', priceChangeRate: 0.013, ma5: 308500, ma20: 315000, volumeRatio: 1.85, reasons: ['현재 가격이 20일 평균보다 0.9% 낮음 (저평가 구간)', '단기(5일) 이동평균이 장기(20일)를 상회 - 상승 모멘텀', '거래량이 평균 대비 1.9배 증가 - 관심 집중', '전일 대비 +1.30% 상승 중', '변동성 낮음 - 안정적인 가격 흐름'] },
  { symbol: 'AAPL', name: 'Apple', market: 'NASDAQ', sector: 'Technology', currentPrice: 227.52, prevClose: 225.98, volume: 54230000, score: 72, recommendation: 'BUY', recommendationLabel: '매수 적절', risk: 'LOW', riskLabel: '낮음', priceChangeRate: 0.0068, ma5: 224.3, ma20: 221.8, volumeRatio: 1.31, reasons: ['단기(5일) 이동평균이 장기(20일)를 상회 - 상승 모멘텀', '거래량이 평균 대비 1.3배 증가 - 관심 집중', '전일 대비 +0.68% 상승 중', '변동성 낮음 - 안정적인 가격 흐름'] },
  { symbol: 'NVDA', name: 'NVIDIA', market: 'NASDAQ', sector: 'Semiconductor', currentPrice: 875.40, prevClose: 861.20, volume: 42100000, score: 88, recommendation: 'STRONG_BUY', recommendationLabel: '강한 매수', risk: 'LOW', riskLabel: '낮음', priceChangeRate: 0.0165, ma5: 858.3, ma20: 842.1, volumeRatio: 2.14, reasons: ['현재 가격이 20일 평균보다 3.9% 낮음 (저평가 구간)', '단기(5일) 이동평균이 장기(20일)를 상회 - 상승 모멘텀', '거래량이 평균 대비 2.1배 증가 - 관심 집중', '전일 대비 +1.65% 상승 중', '변동성 낮음 - 안정적인 가격 흐름'] },
  { symbol: 'MSFT', name: 'Microsoft', market: 'NASDAQ', sector: 'Technology', currentPrice: 415.20, prevClose: 413.80, volume: 21340000, score: 64, recommendation: 'BUY', recommendationLabel: '매수 적절', risk: 'LOW', riskLabel: '낮음', priceChangeRate: 0.0034, ma5: 412.1, ma20: 409.5, volumeRatio: 0.98, reasons: ['단기(5일) 이동평균이 장기(20일)를 상회 - 상승 모멘텀', '변동성 낮음 - 안정적인 가격 흐름'] },
  { symbol: 'TSLA', name: 'Tesla', market: 'NASDAQ', sector: 'EV', currentPrice: 242.84, prevClose: 248.50, volume: 98420000, score: 28, recommendation: 'SELL', recommendationLabel: '매도', risk: 'HIGH', riskLabel: '높음', priceChangeRate: -0.0228, ma5: 249.2, ma20: 253.8, volumeRatio: 1.64, reasons: ['단기(5일) 이동평균이 장기(20일) 하회 - 하락 추세', '전일 대비 -2.28% 하락 중', '변동성 높음 - 단기 급등락 주의'] },
  { symbol: 'META', name: 'Meta', market: 'NASDAQ', sector: 'Social Media', currentPrice: 568.14, prevClose: 562.30, volume: 17650000, score: 74, recommendation: 'BUY', recommendationLabel: '매수 적절', risk: 'LOW', riskLabel: '낮음', priceChangeRate: 0.0104, ma5: 558.7, ma20: 548.2, volumeRatio: 1.43, reasons: ['단기(5일) 이동평균이 장기(20일)를 상회 - 상승 모멘텀', '거래량이 평균 대비 1.4배 증가 - 관심 집중', '전일 대비 +1.04% 상승 중', '변동성 낮음 - 안정적인 가격 흐름'] },
]

// 차트 데이터 생성 (최근 30개 포인트)
function generateChartData(stock) {
  const data = []
  let price = stock.currentPrice * 0.95
  for (let i = 29; i >= 0; i--) {
    price = price * (1 + (Math.random() - 0.48) * 0.015)
    const d = new Date()
    d.setMinutes(d.getMinutes() - i * 5)
    data.push({
      time: `${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`,
      price: +price.toFixed(2),
      volume: Math.floor(stock.volume / 30 * (0.7 + Math.random() * 0.6)),
    })
  }
  return data
}

// 인증 상태
const users = []
const watchlists = {}  // userId -> symbol[]
const portfolios = {}  // userId -> [{symbol, avgPrice, quantity}]

function getUserId(req) {
  const auth = req.headers.authorization
  if (!auth) return null
  return auth.replace('Bearer ', '').split('.')[1] || null
}

// ── API Routes ────────────────────────────────────────────────────────────────

// 종목 목록
app.get('/api/stocks', (req, res) => {
  res.json(stocks.map(s => ({
    symbol: s.symbol, name: s.name, market: s.market,
    currentPrice: s.currentPrice, priceChangeRate: s.priceChangeRate,
    volume: s.volume, recommendation: s.recommendation,
    recommendationLabel: s.recommendationLabel, score: s.score,
    risk: s.risk, riskLabel: s.riskLabel,
    analyzedAt: new Date().toISOString(),
  })))
})

// 종목 상세
app.get('/api/stocks/:symbol', (req, res) => {
  const stock = stocks.find(s => s.symbol === req.params.symbol)
  if (!stock) return res.status(404).json({ error: '종목을 찾을 수 없습니다' })

  res.json({
    ...stock,
    chartData: generateChartData(stock),
    analyzedAt: new Date().toISOString(),
  })
})

// 분석 결과
app.get('/api/stocks/:symbol/analysis', (req, res) => {
  const stock = stocks.find(s => s.symbol === req.params.symbol)
  if (!stock) return res.status(404).json({ error: '종목을 찾을 수 없습니다' })

  res.json({
    score: stock.score,
    recommendation: stock.recommendation,
    recommendationLabel: stock.recommendationLabel,
    risk: stock.risk,
    riskLabel: stock.riskLabel,
    reasons: stock.reasons,
    ma5: stock.ma5,
    ma20: stock.ma20,
    volumeRatio: stock.volumeRatio,
    priceChangeRate: stock.priceChangeRate,
    analyzedAt: new Date().toISOString(),
  })
})

// 회원가입
app.post('/api/auth/signup', (req, res) => {
  const { email, password, nickname } = req.body
  if (!email || !password || !nickname) return res.status(400).json({ error: '모든 항목을 입력해주세요' })
  if (users.find(u => u.email === email)) return res.status(409).json({ error: '이미 사용 중인 이메일입니다' })
  const id = String(Date.now())
  users.push({ id, email, password, nickname })
  const token = `mock.${btoa(email)}.${id}`
  res.json({ token, email, nickname })
})

// 로그인
app.post('/api/auth/signin', (req, res) => {
  const { email, password } = req.body
  const user = users.find(u => u.email === email && u.password === password)
  if (!user) return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다' })
  const token = `mock.${btoa(email)}.${user.id}`
  res.json({ token, email, nickname: user.nickname })
})

// 관심 종목 조회
app.get('/api/watchlist', (req, res) => {
  const uid = getUserId(req)
  if (!uid) return res.status(401).json({ error: '인증이 필요합니다' })
  const syms = watchlists[uid] || []
  const items = syms.map((sym, i) => {
    const stock = stocks.find(s => s.symbol === sym)
    if (!stock) return null
    return {
      id: i + 1, symbol: stock.symbol, name: stock.name, market: stock.market,
      currentPrice: stock.currentPrice, priceChangeRate: stock.priceChangeRate,
      recommendation: stock.recommendation, recommendationLabel: stock.recommendationLabel,
      score: stock.score, risk: stock.risk, riskLabel: stock.riskLabel,
      addedAt: new Date().toISOString(),
    }
  }).filter(Boolean)
  res.json(items)
})

// 관심 종목 추가
app.post('/api/watchlist', (req, res) => {
  const uid = getUserId(req)
  if (!uid) return res.status(401).json({ error: '인증이 필요합니다' })
  const { symbol } = req.body
  if (!watchlists[uid]) watchlists[uid] = []
  if (watchlists[uid].includes(symbol)) return res.status(409).json({ error: '이미 추가된 종목입니다' })
  const stock = stocks.find(s => s.symbol === symbol)
  if (!stock) return res.status(404).json({ error: '종목을 찾을 수 없습니다' })
  watchlists[uid].push(symbol)
  res.json({
    id: watchlists[uid].length, symbol: stock.symbol, name: stock.name, market: stock.market,
    currentPrice: stock.currentPrice, priceChangeRate: stock.priceChangeRate,
    recommendation: stock.recommendation, recommendationLabel: stock.recommendationLabel,
    score: stock.score, risk: stock.risk, riskLabel: stock.riskLabel,
    addedAt: new Date().toISOString(),
  })
})

// 관심 종목 삭제
app.delete('/api/watchlist/:symbol', (req, res) => {
  const uid = getUserId(req)
  if (!uid) return res.status(401).json({ error: '인증이 필요합니다' })
  if (!watchlists[uid]) return res.status(404).json({ error: '없는 종목입니다' })
  watchlists[uid] = watchlists[uid].filter(s => s !== req.params.symbol)
  res.status(204).send()
})

// 포트폴리오 조회
app.get('/api/portfolio', (req, res) => {
  const uid = getUserId(req)
  if (!uid) return res.status(401).json({ error: '인증이 필요합니다' })
  const items = (portfolios[uid] || []).map((p, i) => {
    const stock = stocks.find(s => s.symbol === p.symbol)
    if (!stock) return null
    const totalInvested = p.avgPrice * p.quantity
    const currentValue = stock.currentPrice * p.quantity
    const profitLoss = currentValue - totalInvested
    const returnRate = profitLoss / totalInvested
    return {
      id: i + 1, symbol: stock.symbol, name: stock.name, market: stock.market,
      avgPrice: p.avgPrice, quantity: p.quantity,
      currentPrice: stock.currentPrice,
      totalInvested, currentValue, profitLoss, returnRate,
      recommendation: stock.recommendation, recommendationLabel: stock.recommendationLabel,
      score: stock.score, risk: stock.risk, riskLabel: stock.riskLabel,
    }
  }).filter(Boolean)
  res.json(items)
})

// 포트폴리오 추가/수정
app.post('/api/portfolio', (req, res) => {
  const uid = getUserId(req)
  if (!uid) return res.status(401).json({ error: '인증이 필요합니다' })
  const { symbol, avgPrice, quantity } = req.body
  const stock = stocks.find(s => s.symbol === symbol.toUpperCase() || s.symbol === symbol)
  if (!stock) return res.status(404).json({ error: '종목을 찾을 수 없습니다' })
  if (!portfolios[uid]) portfolios[uid] = []
  const idx = portfolios[uid].findIndex(p => p.symbol === symbol)
  if (idx >= 0) portfolios[uid][idx] = { symbol, avgPrice, quantity }
  else portfolios[uid].push({ symbol, avgPrice, quantity })

  const totalInvested = avgPrice * quantity
  const currentValue = stock.currentPrice * quantity
  const profitLoss = currentValue - totalInvested
  res.json({
    id: portfolios[uid].length, symbol: stock.symbol, name: stock.name, market: stock.market,
    avgPrice, quantity, currentPrice: stock.currentPrice,
    totalInvested, currentValue, profitLoss, returnRate: profitLoss / totalInvested,
    recommendation: stock.recommendation, recommendationLabel: stock.recommendationLabel,
    score: stock.score, risk: stock.risk, riskLabel: stock.riskLabel,
  })
})

// 포트폴리오 삭제
app.delete('/api/portfolio/:symbol', (req, res) => {
  const uid = getUserId(req)
  if (!uid) return res.status(401).json({ error: '인증이 필요합니다' })
  if (!portfolios[uid]) return res.status(404).json({ error: '없는 종목입니다' })
  portfolios[uid] = portfolios[uid].filter(p => p.symbol !== req.params.symbol)
  res.status(204).send()
})

const PORT = 8080
app.listen(PORT, () => {
  console.log(`✅ StockGuide Mock API running on http://localhost:${PORT}`)
  console.log(`📊 ${stocks.length}개 종목 데이터 준비 완료`)
})
