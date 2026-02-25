import type { StockListItem, StockDetail, PricePoint, Recommendation, RiskLevel } from '../types'

// ── sessionStorage cache (5분 TTL) ───────────────────────────────────────────
const CACHE_TTL = 5 * 60 * 1000

function getCached<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw) as { data: T; ts: number }
    if (Date.now() - ts > CACHE_TTL) { sessionStorage.removeItem(key); return null }
    return data
  } catch { return null }
}

function setCache<T>(key: string, data: T): void {
  try { sessionStorage.setItem(key, JSON.stringify({ data, ts: Date.now() })) } catch { /* ignore */ }
}

// ── Finnhub (US stocks) ──────────────────────────────────────────────────────
const FH_TOKEN = 'd6f9mipr01qvn4o2asb0d6f9mipr01qvn4o2asbg'
const FH_BASE = 'https://finnhub.io/api/v1'

// ── Yahoo Finance (Korean stocks) ────────────────────────────────────────────
const YF_BASE = 'https://query2.finance.yahoo.com/v8/finance/chart'
const CORS_PROXY = 'https://api.allorigins.win/raw?url='

const KOREAN_SYMBOLS = new Set(['005930.KS', '000660.KS', '035420.KS', '035720.KS', '373220.KS'])

export const STOCK_INFO: Record<string, { name: string; market: string; sector: string }> = {
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

// ── Types ────────────────────────────────────────────────────────────────────

interface NormalizedQuote {
  currentPrice: number
  prevClose: number
  volume: number
}

interface NormalizedCandle {
  timestamps: number[]
  closes: number[]
  volumes: number[]
}

// ── Yahoo Finance fetchers ────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchYahoo(symbol: string, range: string, interval: string): Promise<any | null> {
  const url = `${YF_BASE}/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`

  // 1) Direct request
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (res.ok) {
      const json = await res.json()
      const result = json?.chart?.result?.[0]
      if (result) return result
    }
  } catch { /* fall through to proxy */ }

  // 2) CORS proxy fallback
  try {
    const res = await fetch(`${CORS_PROXY}${encodeURIComponent(url)}`)
    if (res.ok) {
      const json = await res.json()
      const result = json?.chart?.result?.[0]
      if (result) return result
    }
  } catch { /* fall through */ }

  return null
}

async function yfQuote(symbol: string): Promise<NormalizedQuote | null> {
  const result = await fetchYahoo(symbol, '1d', '1d')
  if (!result) return null
  const price = result.meta?.regularMarketPrice
  const prevClose = result.meta?.previousClose ?? result.meta?.chartPreviousClose
  const volume = result.meta?.regularMarketVolume
  if (!price || price === 0) return null
  return { currentPrice: price, prevClose: prevClose ?? price, volume: volume ?? 0 }
}

async function yfCandles(symbol: string, range: string, interval: string): Promise<NormalizedCandle | null> {
  const result = await fetchYahoo(symbol, range, interval)
  if (!result?.timestamp) return null
  const rawCloses: (number | null)[] = result.indicators?.quote?.[0]?.close ?? []
  const rawVolumes: (number | null)[] = result.indicators?.quote?.[0]?.volume ?? []
  const timestamps: number[] = []
  const closes: number[] = []
  const volumes: number[] = []
  result.timestamp.forEach((ts: number, i: number) => {
    const c = rawCloses[i]
    if (c !== null && c !== undefined && c > 0) {
      timestamps.push(ts)
      closes.push(c)
      volumes.push(rawVolumes[i] ?? 0)
    }
  })
  if (closes.length === 0) return null
  return { timestamps, closes, volumes }
}

// ── Finnhub fetchers ──────────────────────────────────────────────────────────

async function fhQuote(symbol: string): Promise<NormalizedQuote | null> {
  try {
    const res = await fetch(`${FH_BASE}/quote?symbol=${encodeURIComponent(symbol)}&token=${FH_TOKEN}`)
    if (!res.ok) return null
    const d = await res.json()
    if (!d.c || d.c === 0) return null
    return { currentPrice: d.c, prevClose: d.pc, volume: 0 }
  } catch {
    return null
  }
}

async function fhCandles(symbol: string, resolution: string, days: number): Promise<NormalizedCandle | null> {
  const to = Math.floor(Date.now() / 1000)
  const from = to - days * 24 * 60 * 60
  try {
    const res = await fetch(
      `${FH_BASE}/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=${resolution}&from=${from}&to=${to}&token=${FH_TOKEN}`
    )
    if (!res.ok) return null
    const d = await res.json()
    if (d.s !== 'ok' || !d.c?.length) return null
    return { timestamps: d.t, closes: d.c, volumes: d.v }
  } catch {
    return null
  }
}

// ── Unified fetchers ──────────────────────────────────────────────────────────

function getQuote(symbol: string): Promise<NormalizedQuote | null> {
  return KOREAN_SYMBOLS.has(symbol) ? yfQuote(symbol) : fhQuote(symbol)
}

function getDailyCandles(symbol: string): Promise<NormalizedCandle | null> {
  return KOREAN_SYMBOLS.has(symbol)
    ? yfCandles(symbol, '35d', '1d')
    : fhCandles(symbol, 'D', 35)
}

function getIntradayCandles(symbol: string): Promise<NormalizedCandle | null> {
  return KOREAN_SYMBOLS.has(symbol)
    ? yfCandles(symbol, '2d', '5m')
    : fhCandles(symbol, '5', 2)
}

// ── Analysis engine ───────────────────────────────────────────────────────────

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

// ── Public API ────────────────────────────────────────────────────────────────

export async function fetchRealStocks(): Promise<StockListItem[]> {
  const cached = getCached<StockListItem[]>('stocks_list')
  if (cached) return cached

  const results = await Promise.all(
    REAL_SYMBOLS.map(async (symbol): Promise<StockListItem | null> => {
      const [quote, daily] = await Promise.all([getQuote(symbol), getDailyCandles(symbol)])
      if (!quote) return null  // 실데이터 없으면 제외 (mock 폴백 없음)

      const closes = daily?.closes ?? []
      const volumes = daily?.volumes ?? []
      const ma5 = calcMA(closes, 5)
      const ma20 = calcMA(closes, 20)
      const todayVol = volumes.length > 0 ? volumes[volumes.length - 1] : null
      const prevAvgVol =
        volumes.length > 1
          ? volumes.slice(0, -1).reduce((a, b) => a + b, 0) / (volumes.length - 1)
          : null
      const volumeRatio = todayVol && prevAvgVol ? todayVol / prevAvgVol : null
      const volatility = calcVolatility(closes.slice(-10))
      const priceChangeRate =
        quote.prevClose > 0 ? (quote.currentPrice - quote.prevClose) / quote.prevClose : 0

      const result = analyze({ currentPrice: quote.currentPrice, ma5, ma20, volumeRatio, priceChangeRate, volatility })

      return {
        symbol,
        name: STOCK_INFO[symbol].name,
        market: STOCK_INFO[symbol].market,
        currentPrice: quote.currentPrice,
        priceChangeRate,
        volume: quote.volume || todayVol || 0,
        score: result.score,
        recommendation: result.recommendation,
        recommendationLabel: result.recommendationLabel,
        risk: result.risk,
        riskLabel: result.riskLabel,
        analyzedAt: new Date().toISOString(),
      }
    })
  )

  const valid = results.filter((r): r is StockListItem => r !== null)
  if (valid.length === 0) throw new Error('주식 데이터를 불러올 수 없습니다')
  setCache('stocks_list', valid)
  return valid
}

export async function fetchRealStockDetail(symbol: string): Promise<StockDetail> {
  const cached = getCached<StockDetail>(`stock_${symbol}`)
  if (cached) return cached

  const info = STOCK_INFO[symbol]
  if (!info) throw new Error('지원하지 않는 종목입니다')

  const [quote, daily, intraday] = await Promise.all([
    getQuote(symbol),
    getDailyCandles(symbol),
    getIntradayCandles(symbol),
  ])

  if (!quote) throw new Error('주식 데이터를 불러올 수 없습니다')

  const closes = daily?.closes ?? []
  const volumes = daily?.volumes ?? []
  const ma5 = calcMA(closes, 5)
  const ma20 = calcMA(closes, 20)
  const todayVol = volumes.length > 0 ? volumes[volumes.length - 1] : null
  const prevAvgVol =
    volumes.length > 1
      ? volumes.slice(0, -1).reduce((a, b) => a + b, 0) / (volumes.length - 1)
      : null
  const volumeRatio = todayVol && prevAvgVol ? todayVol / prevAvgVol : null
  const volatility = calcVolatility(closes.slice(-10))
  const priceChangeRate =
    quote.prevClose > 0 ? (quote.currentPrice - quote.prevClose) / quote.prevClose : 0

  const result = analyze({ currentPrice: quote.currentPrice, ma5, ma20, volumeRatio, priceChangeRate, volatility })

  let chartData: PricePoint[]
  if (intraday && intraday.closes.length > 0) {
    chartData = intraday.timestamps.map((ts, i) => {
      const d = new Date(ts * 1000)
      return {
        time: `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
        price: intraday.closes[i],
        volume: intraday.volumes[i],
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

  const detail: StockDetail = {
    symbol,
    name: info.name,
    market: info.market,
    sector: info.sector,
    currentPrice: quote.currentPrice,
    prevClose: quote.prevClose,
    priceChangeRate,
    volume: quote.volume || todayVol || 0,
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
  setCache(`stock_${symbol}`, detail)
  return detail
}
