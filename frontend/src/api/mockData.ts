import type { StockListItem, StockDetail, WatchlistItem, PortfolioItem, AuthResponse } from '../types'

export const MOCK_STOCKS: StockListItem[] = [
  { symbol: '005930.KS', name: '삼성전자', market: 'KOSPI', currentPrice: 72400, volume: 15234567, score: 78, recommendation: 'BUY', recommendationLabel: '매수 적절', risk: 'LOW', riskLabel: '낮음', priceChangeRate: 0.0126, analyzedAt: new Date().toISOString() },
  { symbol: '000660.KS', name: 'SK하이닉스', market: 'KOSDAQ', currentPrice: 198500, volume: 4523100, score: 42, recommendation: 'HOLD', recommendationLabel: '관망', risk: 'MEDIUM', riskLabel: '보통', priceChangeRate: -0.0124, analyzedAt: new Date().toISOString() },
  { symbol: '035420.KS', name: 'NAVER', market: 'KOSPI', currentPrice: 182500, volume: 892340, score: 60, recommendation: 'BUY', recommendationLabel: '매수 적절', risk: 'LOW', riskLabel: '낮음', priceChangeRate: 0.0139, analyzedAt: new Date().toISOString() },
  { symbol: '035720.KS', name: '카카오', market: 'KOSPI', currentPrice: 38450, volume: 3120450, score: 32, recommendation: 'SELL', recommendationLabel: '매도', risk: 'HIGH', riskLabel: '높음', priceChangeRate: -0.0191, analyzedAt: new Date().toISOString() },
  { symbol: '373220.KS', name: 'LG에너지솔루션', market: 'KOSPI', currentPrice: 312000, volume: 756230, score: 80, recommendation: 'STRONG_BUY', recommendationLabel: '강한 매수', risk: 'LOW', riskLabel: '낮음', priceChangeRate: 0.013, analyzedAt: new Date().toISOString() },
  { symbol: 'AAPL', name: 'Apple', market: 'NASDAQ', currentPrice: 227.52, volume: 54230000, score: 72, recommendation: 'BUY', recommendationLabel: '매수 적절', risk: 'LOW', riskLabel: '낮음', priceChangeRate: 0.0068, analyzedAt: new Date().toISOString() },
  { symbol: 'NVDA', name: 'NVIDIA', market: 'NASDAQ', currentPrice: 875.40, volume: 42100000, score: 88, recommendation: 'STRONG_BUY', recommendationLabel: '강한 매수', risk: 'LOW', riskLabel: '낮음', priceChangeRate: 0.0165, analyzedAt: new Date().toISOString() },
  { symbol: 'MSFT', name: 'Microsoft', market: 'NASDAQ', currentPrice: 415.20, volume: 21340000, score: 64, recommendation: 'BUY', recommendationLabel: '매수 적절', risk: 'LOW', riskLabel: '낮음', priceChangeRate: 0.0034, analyzedAt: new Date().toISOString() },
  { symbol: 'TSLA', name: 'Tesla', market: 'NASDAQ', currentPrice: 242.84, volume: 98420000, score: 28, recommendation: 'SELL', recommendationLabel: '매도', risk: 'HIGH', riskLabel: '높음', priceChangeRate: -0.0228, analyzedAt: new Date().toISOString() },
  { symbol: 'META', name: 'Meta', market: 'NASDAQ', currentPrice: 568.14, volume: 17650000, score: 74, recommendation: 'BUY', recommendationLabel: '매수 적절', risk: 'LOW', riskLabel: '낮음', priceChangeRate: 0.0104, analyzedAt: new Date().toISOString() },
]

const DETAILS: Record<string, Partial<StockDetail>> = {
  '005930.KS': { sector: '반도체', ma5: 71200, ma20: 69800, volumeRatio: 1.72, reasons: ['현재 가격이 20일 평균보다 3.7% 낮음 (저평가 구간)', '단기(5일) 이동평균이 장기(20일)를 상회 - 상승 모멘텀', '거래량이 평균 대비 1.7배 증가 - 관심 집중', '전일 대비 +1.26% 상승 중'] },
  '000660.KS': { sector: '반도체', ma5: 201200, ma20: 204500, volumeRatio: 0.82, reasons: ['단기(5일) 이동평균이 장기(20일) 하회 - 하락 추세', '전일 대비 -1.24% 하락 중', '변동성 낮음 - 안정적인 가격 흐름'] },
  '035420.KS': { sector: 'IT', ma5: 181000, ma20: 184200, volumeRatio: 1.1, reasons: ['전일 대비 +1.39% 상승 중', '변동성 낮음 - 안정적인 가격 흐름'] },
  '035720.KS': { sector: 'IT', ma5: 39200, ma20: 40100, volumeRatio: 0.74, reasons: ['단기(5일) 이동평균이 장기(20일) 하회 - 하락 추세', '전일 대비 -1.91% 하락 중', '변동성 높음 - 단기 급등락 주의'] },
  '373220.KS': { sector: '전기차배터리', ma5: 308500, ma20: 315000, volumeRatio: 1.85, reasons: ['현재 가격이 20일 평균보다 0.9% 낮음', '단기 이동평균이 장기 상회 - 상승 모멘텀', '거래량 1.9배 증가 - 관심 집중', '전일 대비 +1.30% 상승 중', '변동성 낮음'] },
  'AAPL': { sector: 'Technology', ma5: 224.3, ma20: 221.8, volumeRatio: 1.31, reasons: ['단기 이동평균이 장기 상회 - 상승 모멘텀', '거래량 1.3배 증가', '전일 대비 +0.68% 상승 중', '변동성 낮음'] },
  'NVDA': { sector: 'Semiconductor', ma5: 858.3, ma20: 842.1, volumeRatio: 2.14, reasons: ['현재 가격이 20일 평균보다 3.9% 낮음', '단기 이동평균이 장기 상회 - 상승 모멘텀', '거래량 2.1배 증가 - 관심 집중', '전일 대비 +1.65% 상승 중', '변동성 낮음'] },
  'MSFT': { sector: 'Technology', ma5: 412.1, ma20: 409.5, volumeRatio: 0.98, reasons: ['단기 이동평균이 장기 상회 - 상승 모멘텀', '변동성 낮음'] },
  'TSLA': { sector: 'EV', ma5: 249.2, ma20: 253.8, volumeRatio: 1.64, reasons: ['단기 이동평균이 장기 하회 - 하락 추세', '전일 대비 -2.28% 하락 중', '변동성 높음 - 단기 급등락 주의'] },
  'META': { sector: 'Social Media', ma5: 558.7, ma20: 548.2, volumeRatio: 1.43, reasons: ['단기 이동평균이 장기 상회 - 상승 모멘텀', '거래량 1.4배 증가', '전일 대비 +1.04% 상승 중', '변동성 낮음'] },
}

function generateChartData(stock: StockListItem) {
  const data = []
  let price = stock.currentPrice * 0.95
  for (let i = 29; i >= 0; i--) {
    price = price * (1 + (Math.random() - 0.48) * 0.015)
    const d = new Date()
    d.setMinutes(d.getMinutes() - i * 5)
    data.push({
      time: `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
      price: +price.toFixed(2),
      volume: Math.floor(stock.volume / 30 * (0.7 + Math.random() * 0.6)),
    })
  }
  return data
}

export function getMockStockDetail(symbol: string): StockDetail | null {
  const base = MOCK_STOCKS.find(s => s.symbol === symbol)
  if (!base) return null
  const detail = DETAILS[symbol] || {}
  return {
    ...base,
    prevClose: base.currentPrice / (1 + base.priceChangeRate),
    sector: detail.sector || '',
    reasons: detail.reasons || [],
    ma5: detail.ma5 || null,
    ma20: detail.ma20 || null,
    volumeRatio: detail.volumeRatio || null,
    chartData: generateChartData(base),
  } as StockDetail
}

// In-memory state for demo
const watchlistSymbols: string[] = []
const portfolioItems: Array<{ symbol: string; avgPrice: number; quantity: number }> = []
let mockUser: { email: string; nickname: string } | null = null

export const mockApi = {
  getStocks: () => Promise.resolve([...MOCK_STOCKS]),
  getDetail: (symbol: string) => {
    const d = getMockStockDetail(symbol)
    return d ? Promise.resolve(d) : Promise.reject(new Error('종목을 찾을 수 없습니다'))
  },
  signUp: (email: string, _password: string, nickname: string): Promise<AuthResponse> => {
    mockUser = { email, nickname }
    localStorage.setItem('token', `mock.token.${Date.now()}`)
    return Promise.resolve({ token: `mock.token.${Date.now()}`, email, nickname })
  },
  signIn: (email: string, _password: string): Promise<AuthResponse> => {
    mockUser = { email, nickname: email.split('@')[0] }
    localStorage.setItem('token', `mock.token.${Date.now()}`)
    return Promise.resolve({ token: `mock.token.${Date.now()}`, email, nickname: mockUser.nickname })
  },
  getWatchlist: (): Promise<WatchlistItem[]> => {
    return Promise.resolve(watchlistSymbols.map((sym, i) => {
      const s = MOCK_STOCKS.find(x => x.symbol === sym)!
      return { id: i + 1, symbol: s.symbol, name: s.name, market: s.market, currentPrice: s.currentPrice, priceChangeRate: s.priceChangeRate, recommendation: s.recommendation, recommendationLabel: s.recommendationLabel, score: s.score, risk: s.risk, riskLabel: s.riskLabel, addedAt: new Date().toISOString() }
    }))
  },
  addWatchlist: (symbol: string): Promise<WatchlistItem> => {
    if (watchlistSymbols.includes(symbol)) return Promise.reject(new Error('이미 추가된 종목입니다'))
    watchlistSymbols.push(symbol)
    const s = MOCK_STOCKS.find(x => x.symbol === symbol)!
    return Promise.resolve({ id: watchlistSymbols.length, symbol: s.symbol, name: s.name, market: s.market, currentPrice: s.currentPrice, priceChangeRate: s.priceChangeRate, recommendation: s.recommendation, recommendationLabel: s.recommendationLabel, score: s.score, risk: s.risk, riskLabel: s.riskLabel, addedAt: new Date().toISOString() })
  },
  removeWatchlist: (symbol: string): Promise<void> => {
    const idx = watchlistSymbols.indexOf(symbol)
    if (idx >= 0) watchlistSymbols.splice(idx, 1)
    return Promise.resolve()
  },
  getPortfolio: (): Promise<PortfolioItem[]> => {
    return Promise.resolve(portfolioItems.map((p, i) => {
      const s = MOCK_STOCKS.find(x => x.symbol === p.symbol)!
      const totalInvested = p.avgPrice * p.quantity
      const currentValue = s.currentPrice * p.quantity
      const profitLoss = currentValue - totalInvested
      return { id: i + 1, symbol: s.symbol, name: s.name, market: s.market, avgPrice: p.avgPrice, quantity: p.quantity, currentPrice: s.currentPrice, totalInvested, currentValue, profitLoss, returnRate: profitLoss / totalInvested, recommendation: s.recommendation, recommendationLabel: s.recommendationLabel, score: s.score, risk: s.risk, riskLabel: s.riskLabel }
    }))
  },
  addPortfolio: (symbol: string, avgPrice: number, quantity: number): Promise<PortfolioItem> => {
    const idx = portfolioItems.findIndex(p => p.symbol === symbol)
    if (idx >= 0) portfolioItems[idx] = { symbol, avgPrice, quantity }
    else portfolioItems.push({ symbol, avgPrice, quantity })
    const s = MOCK_STOCKS.find(x => x.symbol === symbol)!
    const totalInvested = avgPrice * quantity
    const currentValue = s.currentPrice * quantity
    const profitLoss = currentValue - totalInvested
    return Promise.resolve({ id: portfolioItems.length, symbol: s.symbol, name: s.name, market: s.market, avgPrice, quantity, currentPrice: s.currentPrice, totalInvested, currentValue, profitLoss, returnRate: profitLoss / totalInvested, recommendation: s.recommendation, recommendationLabel: s.recommendationLabel, score: s.score, risk: s.risk, riskLabel: s.riskLabel })
  },
  removePortfolio: (symbol: string): Promise<void> => {
    const idx = portfolioItems.findIndex(p => p.symbol === symbol)
    if (idx >= 0) portfolioItems.splice(idx, 1)
    return Promise.resolve()
  },
}
