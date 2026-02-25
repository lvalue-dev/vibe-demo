import type { StockListItem, StockDetail, PricePoint, Recommendation, RiskLevel } from '../types'
import { getMockStockDetail, MOCK_STOCKS } from './mockData'

const TOKEN = 'd6f9mipr01qvn4o2asb0d6f9mipr01qvn4o2asbg'
const BASE = 'https://finnhub.io/api/v1'

// Finnhub symbol mapping
const SYMBOL_MAP: Record<string, string> = {
  '005930.KS': 'KRX:005930',
  '000660.KS': 'KRX:000660',
  '035420.KS': 'KRX:035420',
  '035720.KS': 'KRX:035720',
  '373220.KS': 'KRX:373220',
  'AAPL': 'AAPL',
  'NVDA': 'NVDA',
  'MSFT': 'MSFT',
  'TSLA': 'TSLA',
  'META': 'META',
}

const STOCK_INFO: Record<string, { name: string; market: string; sector: string }> = {
  '005930.KS': { name: '삼성전자', market: 'KOSPI', sector: '반도체' },
  '000660.KS': { name: 'SK하이닉스', market: 'KOSPI', sector: '반도체' },
  '035420.KS': { name: 'NAVER', market: 'KOSPI', sector: 'IT' },
  '035720.KS': { name: '카카오', market: 'KOSPI', sector: 'IT' },
  '373220.KS': { name: 'LG에너지솔루션', market: 'KOSPI', sector: '전기차배터리' },
  'AAPL': { name: 'Apple', market: 'NASDAQ', sector: 'Technology' },
  'NVDA': { name: 'NVIDIA', market: 'NASDAQ', sector: 'Semiconductor' },
  'MSFT': { name: 'Microsoft', market: 'NASDAQ', sector: 'Technology' },
  'TSLA': { name: 'Tesla', market: 'NASDAQ', sector: 'EV' },
  'META': { name: 'Meta', market: 'NASDAQ', sector: 'Social Media' },
}

export const REAL_SYMBOLS = Object.keys(STOCK_INFO)

interface FinnhubQuote {
  c: number   // current price
  d: number   // change
  dp: number  // percent change
  h: number   // high
  l: number   // low
  o: number   // open
  pc: number  // previous close
  t: number   // timestamp
}

interface FinnhubCandle {
  c: number[]
  h: number[]
  l: number[]
  o: number[]
  s: string
  t: number[]
  v: number[]
}

async function fetchQuote(symbol: string): Promise<FinnhubQuote | null> {
  const fSym = SYMBOL_MAP[symbol]
  if (!fSym) return null
  try {
    const res = await fetch(`${BASE}/quote?symbol=${encodeURIComponent(fSym)}&token=${TOKEN}`)
    if (!res.ok) return null
    const data: FinnhubQuote = await res.json()
    if (!data.c || data.c === 0) return null
    return data
  } catch {
    return null
  }
}

async function fetchCandles(symbol: string, resolution: string, days: number): Promise<FinnhubCandle | null> {
  const fSym = SYMBOL_MAP[symbol]
  if (!fSym) return null
  const to = Math.floor(Date.now() / 1000)
  const from = to - days * 24 * 60 * 60
  try {
    const res = await fetch(
      `${BASE}/stock/candle?symbol=${encodeURIComponent(fSym)}&resolution=${resolution}&from=${from}&to=${to}&token=${TOKEN}`
    )
    if (!res.ok) return null
    const data: FinnhubCandle = await res.json()
    if (data.s !== 'ok' || !data.c?.length) return null
    return data
  } catch {
    return null
  }
}

function calcMA(prices: number[], period: number): number | null {
  if (prices.length < period) return null
  return prices.slice(-period).reduce((a, b) => a + b, 0) / period
}

function calcVolatility(prices: number[]): number {
  if (prices.length < 2) return 0
  const returns = prices.slice(1).map((p, i) => (p - prices[i]) / prices[i])
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length
  const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / returns.length
  return Math.sqrt(variance)
}

function analyze(params: {
  currentPrice: number
  ma5: number | null
  ma20: number | null
  volumeRatio: number | null
  priceChangeRate: number
  volatility: number
}): {
  score: number
  recommendation: Recommendation
  recommendationLabel: string
  risk: RiskLevel
  riskLabel: string
  reasons: string[]
} {
  let score = 0
  const reasons: string[] = []

  if (params.ma20 && params.currentPrice < params.ma20) {
    score += 20
    const pct = (((params.ma20 - params.currentPrice) / params.ma20) * 100).toFixed(1)
    reasons.push(`현재 가격이 20일 평균보다 ${pct}% 낮음 (저평가 구간)`)
  }
  if (params.ma5 && params.ma20 && params.ma5 > params.ma20) {
    score += 20
    reasons.push('단기(5일) 이동평균이 장기(20일)를 상회 - 상승 모멘텀')
  }
  if (params.ma5 && params.ma20 && params.ma5 <= params.ma20) {
    reasons.push('단기(5일) 이동평균이 장기(20일) 하회 - 하락 추세')
  }
  if (params.volumeRatio && params.volumeRatio >= 1.5) {
    score += 20
    reasons.push(`거래량이 평균 대비 ${params.volumeRatio.toFixed(1)}배 증가 - 관심 집중`)
  }
  if (params.priceChangeRate > 0) {
    score += 20
    reasons.push(`전일 대비 +${(params.priceChangeRate * 100).toFixed(2)}% 상승 중`)
  } else {
    reasons.push(`전일 대비 ${(params.priceChangeRate * 100).toFixed(2)}% 하락 중`)
  }
  if (params.volatility < 0.05) {
    score += 20
    reasons.push('변동성 낮음 - 안정적인 가격 흐름')
  } else {
    reasons.push('변동성 높음 - 단기 급등락 주의')
  }

  let recommendation: Recommendation
  let recommendationLabel: string
  if (score >= 80) { recommendation = 'STRONG_BUY'; recommendationLabel = '강한 매수' }
  else if (score >= 60) { recommendation = 'BUY'; recommendationLabel = '매수 적절' }
  else if (score >= 40) { recommendation = 'HOLD'; recommendationLabel = '관망' }
  else { recommendation = 'SELL'; recommendationLabel = '매도' }

  let risk: RiskLevel
  let riskLabel: string
  if (score < 40 || params.volatility >= 0.05) { risk = 'HIGH'; riskLabel = '높음' }
  else if (score < 60) { risk = 'MEDIUM'; riskLabel = '보통' }
  else { risk = 'LOW'; riskLabel = '낮음' }

  return { score, recommendation, recommendationLabel, risk, riskLabel, reasons }
}

export async function fetchRealStocks(): Promise<StockListItem[]> {
  const results = await Promise.all(
    REAL_SYMBOLS.map(async (symbol): Promise<StockListItem> => {
      const mock = MOCK_STOCKS.find((s) => s.symbol === symbol)!
      const [quote, candles] = await Promise.all([
        fetchQuote(symbol),
        fetchCandles(symbol, 'D', 35),
      ])

      if (!quote) return mock

      const closes = candles?.c ?? []
      const volumes = candles?.v ?? []
      const ma5 = calcMA(closes, 5)
      const ma20 = calcMA(closes, 20)
      const todayVol = volumes.length > 0 ? volumes[volumes.length - 1] : null
      const prevAvgVol =
        volumes.length > 1
          ? volumes.slice(0, -1).reduce((a, b) => a + b, 0) / (volumes.length - 1)
          : null
      const volumeRatio = todayVol && prevAvgVol ? todayVol / prevAvgVol : null
      const volatility = calcVolatility(closes.slice(-10))
      const priceChangeRate = quote.pc > 0 ? (quote.c - quote.pc) / quote.pc : 0

      const result = analyze({ currentPrice: quote.c, ma5, ma20, volumeRatio, priceChangeRate, volatility })

      return {
        symbol,
        name: STOCK_INFO[symbol].name,
        market: STOCK_INFO[symbol].market,
        currentPrice: quote.c,
        priceChangeRate,
        volume: todayVol ?? mock.volume,
        score: result.score,
        recommendation: result.recommendation,
        recommendationLabel: result.recommendationLabel,
        risk: result.risk,
        riskLabel: result.riskLabel,
        analyzedAt: new Date().toISOString(),
      }
    })
  )
  return results
}

export async function fetchRealStockDetail(symbol: string): Promise<StockDetail> {
  const info = STOCK_INFO[symbol]
  if (!info) return getMockStockDetail(symbol)!

  const [quote, dailyCandles, intradayCandles] = await Promise.all([
    fetchQuote(symbol),
    fetchCandles(symbol, 'D', 35),
    fetchCandles(symbol, '5', 2),
  ])

  if (!quote) return getMockStockDetail(symbol)!

  const closes = dailyCandles?.c ?? []
  const volumes = dailyCandles?.v ?? []
  const ma5 = calcMA(closes, 5)
  const ma20 = calcMA(closes, 20)
  const todayVol = volumes.length > 0 ? volumes[volumes.length - 1] : null
  const prevAvgVol =
    volumes.length > 1
      ? volumes.slice(0, -1).reduce((a, b) => a + b, 0) / (volumes.length - 1)
      : null
  const volumeRatio = todayVol && prevAvgVol ? todayVol / prevAvgVol : null
  const volatility = calcVolatility(closes.slice(-10))
  const priceChangeRate = quote.pc > 0 ? (quote.c - quote.pc) / quote.pc : 0

  const result = analyze({ currentPrice: quote.c, ma5, ma20, volumeRatio, priceChangeRate, volatility })

  // Build chart from intraday candles, fall back to daily
  let chartData: PricePoint[]
  if (intradayCandles && intradayCandles.c.length > 0) {
    chartData = intradayCandles.t.map((ts, i) => {
      const d = new Date(ts * 1000)
      return {
        time: `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
        price: intradayCandles.c[i],
        volume: intradayCandles.v[i],
      }
    })
  } else {
    chartData = closes.slice(-30).map((price, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (closes.slice(-30).length - 1 - i))
      return {
        time: `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
        price,
        volume: volumes[volumes.length - 30 + i] ?? 0,
      }
    })
  }

  return {
    symbol,
    name: info.name,
    market: info.market,
    sector: info.sector,
    currentPrice: quote.c,
    prevClose: quote.pc,
    priceChangeRate,
    volume: todayVol ?? 0,
    score: result.score,
    recommendation: result.recommendation,
    recommendationLabel: result.recommendationLabel,
    risk: result.risk,
    riskLabel: result.riskLabel,
    reasons: result.reasons,
    ma5,
    ma20,
    volumeRatio,
    chartData,
    analyzedAt: new Date().toISOString(),
  }
}
