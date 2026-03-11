/**
 * 주식 API 라우터
 *
 * VITE_API_URL 미설정 → 개발계(GitHub Pages): Yahoo Finance 브라우저 직접 호출
 * VITE_API_URL 설정됨  → 운영계(Oracle):      Java 백엔드 (한국투자증권 KIS API)
 */
import { fetchStocksFromBackend, fetchDetailFromBackend } from './backendApi'
import { STOCK_INFO, buildInstitutionalDataFromChart } from './finnhubApi'
import { yfBatchQuotes, yfChart } from './yahooApi'
import { analyze } from '../utils/analyze'
import client from './client'
import type {
  Analysis, AuthResponse, PortfolioItem, StockDetail, StockListItem, WatchlistItem,
} from '../types'

const USE_BACKEND = !!import.meta.env.VITE_API_URL

// ── 시드 유틸 (홈 화면 분석 점수 - 30일 히스토리 없이 빠른 목록 표시용) ────────
function seededRand(n: number): number {
  let h = (n ^ 0x9e3779b9) >>> 0
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0
  return ((h ^ (h >>> 16)) >>> 0) / 0x100000000
}
function symbolSeed(sym: string): number {
  return sym.split('').reduce((a, c, i) => a + c.charCodeAt(0) * (i + 3), 0)
}

// ── 개발계: Yahoo 종목 목록 ────────────────────────────────────────────────────
async function getStocksFromYahoo(): Promise<StockListItem[]> {
  const symbols   = Object.keys(STOCK_INFO)
  const dailySeed = Math.floor(Date.now() / 86400000)
  const priceMap  = await yfBatchQuotes(symbols).catch(() => new Map())

  return symbols.map(sym => {
    const info = STOCK_INFO[sym]
    const q    = priceMap.get(sym)
    const seed = symbolSeed(sym)

    const score              = 20 + Math.floor(seededRand(seed * 3 + dailySeed * 997) * 80)
    const recommendation     = score >= 80 ? 'STRONG_BUY' : score >= 60 ? 'BUY' : score >= 40 ? 'HOLD' : 'SELL'
    const recommendationLabel = score >= 80 ? '강한 매수' : score >= 60 ? '매수 적절' : score >= 40 ? '관망' : '매도'
    const risk               = score < 40 ? 'HIGH' : score < 60 ? 'MEDIUM' : 'LOW'
    const riskLabel          = risk === 'HIGH' ? '높음' : risk === 'MEDIUM' ? '보통' : '낮음'

    return {
      symbol: sym, name: info.name, market: info.market,
      currentPrice:    q?.price      ?? 0,
      priceChangeRate: q?.changeRate ?? (seededRand(seed + dailySeed) - 0.5) * 0.06,
      volume:          q?.volume     ?? 0,
      score, recommendation, recommendationLabel, risk, riskLabel,
      analyzedAt: new Date().toISOString(),
    } as StockListItem
  })
}

// ── 개발계: Yahoo 종목 상세 (실제 분석) ────────────────────────────────────────
async function getDetailFromYahoo(symbol: string): Promise<StockDetail> {
  const info = STOCK_INFO[symbol]
  if (!info) throw new Error(`Unknown symbol: ${symbol}`)

  const { quote, candles } = await yfChart(symbol, 30)
  const closes  = candles.map(c => c.price)
  const volumes = candles.map(c => c.volume)
  const result  = analyze(closes, volumes, quote.price, quote.changeRate)

  const chartData     = candles.map(c => ({ time: c.time, price: c.price, volume: c.volume }))
  const volumeHistory = candles.map((c, i) => ({
    date: c.time, volume: c.volume,
    isUp: i === 0 || c.price >= candles[i - 1].price,
  }))
  const instData = buildInstitutionalDataFromChart(chartData, symbol, quote.price)

  return {
    symbol, name: info.name, market: info.market, sector: info.sector,
    currentPrice: quote.price, prevClose: quote.prevClose,
    priceChangeRate: quote.changeRate, volume: quote.volume,
    chartData, volumeHistory, analyzedAt: new Date().toISOString(),
    ...result, ...instData,
  }
}

// ─── Stocks ────────────────────────────────────────────────────────────────────
async function getStocks(): Promise<StockListItem[]> {
  return USE_BACKEND ? fetchStocksFromBackend() : getStocksFromYahoo()
}
async function getDetail(symbol: string, period = 'daily'): Promise<StockDetail> {
  return USE_BACKEND ? fetchDetailFromBackend(symbol, period) : getDetailFromYahoo(symbol)
}

export const stockApi = {
  getAll: getStocks,
  getDetail,
  getAnalysis: (symbol: string): Promise<Analysis> =>
    getDetail(symbol).then(d => ({
      score: d.score!, recommendation: d.recommendation!,
      recommendationLabel: d.recommendationLabel,
      risk: d.risk!, riskLabel: d.riskLabel, reasons: d.reasons,
      ma5: d.ma5, ma20: d.ma20, volumeRatio: d.volumeRatio,
      priceChangeRate: d.priceChangeRate, analyzedAt: new Date().toISOString(),
    })),
}

// ─── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = USE_BACKEND ? {
  signUp: (data: { email: string; password: string; nickname: string }): Promise<AuthResponse> =>
    client.post<AuthResponse>('/api/auth/signup', data).then(r => r.data),
  signIn: (data: { email: string; password: string }): Promise<AuthResponse> =>
    client.post<AuthResponse>('/api/auth/signin', data).then(r => r.data),
} : {
  signUp: ({ email, nickname }: { email: string; password: string; nickname: string }): Promise<AuthResponse> => {
    const token = `dev.${Date.now()}`
    localStorage.setItem('token', token)
    return Promise.resolve({ token, email, nickname })
  },
  signIn: ({ email }: { email: string; password: string }): Promise<AuthResponse> => {
    const token = `dev.${Date.now()}`
    localStorage.setItem('token', token)
    return Promise.resolve({ token, email, nickname: email.split('@')[0] })
  },
}

// ─── Watchlist ─────────────────────────────────────────────────────────────────
const _wl: string[] = []

export const watchlistApi = USE_BACKEND ? {
  getAll: (): Promise<WatchlistItem[]> =>
    client.get<WatchlistItem[]>('/api/watchlist').then(r => r.data),
  add: (symbol: string): Promise<WatchlistItem> =>
    client.post<WatchlistItem>('/api/watchlist', { symbol }).then(r => r.data),
  remove: (symbol: string): Promise<unknown> =>
    client.delete(`/api/watchlist/${encodeURIComponent(symbol)}`).then(r => r.data),
} : {
  getAll: async (): Promise<WatchlistItem[]> => {
    if (_wl.length === 0) return []
    const stocks = await getStocksFromYahoo()
    return _wl.flatMap((sym, i) => {
      const s = stocks.find(x => x.symbol === sym)
      return s ? [{ id: i + 1, ...s, addedAt: new Date().toISOString() } as WatchlistItem] : []
    })
  },
  add: async (symbol: string): Promise<WatchlistItem> => {
    if (_wl.includes(symbol)) throw new Error('이미 추가된 종목입니다')
    const stocks = await getStocksFromYahoo()
    const s = stocks.find(x => x.symbol === symbol)
    if (!s) throw new Error('지원하지 않는 종목입니다')
    _wl.push(symbol)
    return { id: _wl.length, ...s, addedAt: new Date().toISOString() } as WatchlistItem
  },
  remove: (symbol: string): Promise<unknown> => {
    const i = _wl.indexOf(symbol)
    if (i >= 0) _wl.splice(i, 1)
    return Promise.resolve()
  },
}

// ─── Portfolio ─────────────────────────────────────────────────────────────────
const _pf: { symbol: string; avgPrice: number; quantity: number }[] = []

export const portfolioApi = USE_BACKEND ? {
  getAll: (): Promise<PortfolioItem[]> =>
    client.get<PortfolioItem[]>('/api/portfolio').then(r => r.data),
  addOrUpdate: (data: { symbol: string; avgPrice: number; quantity: number }): Promise<PortfolioItem> =>
    client.post<PortfolioItem>('/api/portfolio', data).then(r => r.data),
  remove: (symbol: string): Promise<unknown> =>
    client.delete(`/api/portfolio/${encodeURIComponent(symbol)}`).then(r => r.data),
} : {
  getAll: async (): Promise<PortfolioItem[]> => {
    if (_pf.length === 0) return []
    const stocks = await getStocksFromYahoo()
    return _pf.flatMap((p, i): PortfolioItem[] => {
      const s = stocks.find(x => x.symbol === p.symbol)
      if (!s) return []
      const totalInvested = p.avgPrice * p.quantity
      const currentValue  = s.currentPrice * p.quantity
      const profitLoss    = currentValue - totalInvested
      return [{ id: i + 1, ...s, avgPrice: p.avgPrice, quantity: p.quantity,
        totalInvested, currentValue, profitLoss,
        returnRate: totalInvested > 0 ? profitLoss / totalInvested : 0 } as PortfolioItem]
    })
  },
  addOrUpdate: async (data: { symbol: string; avgPrice: number; quantity: number }): Promise<PortfolioItem> => {
    const stocks = await getStocksFromYahoo()
    const s = stocks.find(x => x.symbol === data.symbol)
    if (!s) throw new Error('지원하지 않는 종목입니다')
    const idx = _pf.findIndex(p => p.symbol === data.symbol)
    if (idx >= 0) _pf[idx] = data; else _pf.push(data)
    const totalInvested = data.avgPrice * data.quantity
    const currentValue  = s.currentPrice * data.quantity
    const profitLoss    = currentValue - totalInvested
    return { id: _pf.length, ...s, avgPrice: data.avgPrice, quantity: data.quantity,
      totalInvested, currentValue, profitLoss,
      returnRate: totalInvested > 0 ? profitLoss / totalInvested : 0 } as PortfolioItem
  },
  remove: (symbol: string): Promise<unknown> => {
    const i = _pf.findIndex(p => p.symbol === symbol)
    if (i >= 0) _pf.splice(i, 1)
    return Promise.resolve()
  },
}
