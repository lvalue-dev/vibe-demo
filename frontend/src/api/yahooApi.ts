/**
 * 브라우저 측 Yahoo Finance 클라이언트 (GitHub Pages 개발계 전용)
 *
 * - 종목 목록(홈): 기준가 테이블 + 시드 기반 일별 변동 (Yahoo v7/quote는 브라우저에서 인증 차단됨)
 * - 종목 상세:    Yahoo v8/finance/chart 직접 호출 (30일 OHLCV)
 *                  CORS → 직접 fetch → corsproxy.io 순으로 시도
 *
 * 운영계(Oracle + Java)에서는 이 파일을 사용하지 않습니다.
 */

const YF = 'https://query1.finance.yahoo.com'
const YF2 = 'https://query2.finance.yahoo.com'
const PROXIES = [
  'https://corsproxy.io/?url=',
  'https://api.allorigins.win/raw?url=',
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function yfGet(path: string): Promise<any> {
  // 1) query1 직접 시도
  for (const base of [YF, YF2]) {
    try {
      const r = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(5000) })
      if (r.ok) return await r.json()
    } catch { /* CORS 차단 → 프록시로 */ }
  }

  // 2) CORS 프록시 순차 시도 (query1 → query2 × 각 프록시)
  for (const proxy of PROXIES) {
    for (const base of [YF, YF2]) {
      try {
        const r = await fetch(`${proxy}${encodeURIComponent(`${base}${path}`)}`, {
          signal: AbortSignal.timeout(15000),
        })
        if (r.ok) return await r.json()
      } catch { /* 다음 시도 */ }
    }
  }

  throw new Error(`Yahoo Finance 요청 실패: ${path}`)
}

// ── 종목별 기준가 (대략적인 현재 시세 기준, 홈 화면 시드 기반 가격에 사용) ───
// KRW: 원화, USD: 달러
export const BASE_PRICES: Record<string, number> = {
  // KOSPI
  '005930.KS': 53000,    // 삼성전자
  '000660.KS': 190000,   // SK하이닉스
  '207940.KS': 1050000,  // 삼성바이오로직스
  '005380.KS': 210000,   // 현대차
  '373220.KS': 310000,   // LG에너지솔루션
  '000270.KS': 97000,    // 기아
  '005490.KS': 280000,   // POSCO홀딩스
  '035420.KS': 175000,   // NAVER
  '068270.KS': 175000,   // 셀트리온
  '051910.KS': 250000,   // LG화학
  '105560.KS': 92000,    // KB금융
  '035720.KS': 38000,    // 카카오
  '055550.KS': 46000,    // 신한지주
  '086790.KS': 70000,    // 하나금융지주
  '003550.KS': 80000,    // LG
  '096770.KS': 90000,    // SK이노베이션
  '034730.KS': 165000,   // SK
  '000810.KS': 370000,   // 삼성화재
  '009150.KS': 120000,   // 삼성전기
  '003490.KS': 23000,    // 대한항공
  // KOSDAQ
  '247540.KQ': 150000,   // 에코프로비엠
  '086520.KQ': 85000,    // 에코프로
  '091990.KQ': 80000,    // 셀트리온헬스케어
  '196170.KQ': 420000,   // 알테오젠
  '041510.KQ': 75000,    // SM엔터테인먼트
  '035900.KQ': 44000,    // JYP Ent.
  '122870.KQ': 34000,    // 와이지엔터테인먼트
  '263750.KQ': 23000,    // 펄어비스
  '036570.KQ': 165000,   // NC소프트
  '112040.KQ': 27000,    // 위메이드
  // NASDAQ (USD)
  'AAPL':  225,  'MSFT':  380,  'GOOGL': 165,
  'AMZN':  200,  'META':  590,  'TSLA':  280,
  'NVDA':  130,  'NFLX':  970,  'INTC':   22,
  'AMD':   105,  'QCOM':  155,  'ADBE':  430,
  'CRM':   280,  'ORCL':  165,  'CSCO':   58,
  // NYSE (USD)
  'JPM':   240,  'V':     330,  'WMT':    95,
  'JNJ':   158,  'XOM':   110,  'BAC':    44,
  'GS':    570,  'UNH':   490,  'PFE':    25,
  'KO':     62,  'MCD':   290,  'DIS':   100,
  'BA':    165,  'GM':     48,  'BABA':   80,
}

/** 일별 시드 기반 가격 (홈 화면 목록용, Yahoo API 차단 대비) */
export function seedPrice(symbol: string, dailySeed: number): {
  price: number; prevClose: number; changeRate: number; volume: number
} {
  const base = BASE_PRICES[symbol] ?? 100
  // 심볼 고유 시드
  const symseed = symbol.split('').reduce((a, c, i) => a + c.charCodeAt(0) * (i + 3), 0)
  // xorshift 계열 난수
  function r(n: number) {
    let h = (n ^ 0x9e3779b9) >>> 0
    h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0
    return ((h ^ (h >>> 16)) >>> 0) / 0x100000000
  }
  const dailyFactor = 0.93 + r(symseed + dailySeed * 1009) * 0.14  // ±7% 일별 변동
  const price       = Math.round(base * dailyFactor)
  const changeRate  = (r(symseed + dailySeed * 337) - 0.5) * 0.06  // ±3% 등락률
  const prevClose   = Math.round(price / (1 + changeRate))
  const volume      = Math.round((5e5 + r(symseed + dailySeed * 179) * 5e6) * (base > 1000 ? 0.01 : 1))
  return { price, prevClose, changeRate, volume }
}

export interface YfQuote {
  symbol: string
  price: number
  prevClose: number
  changeRate: number
  volume: number
}

export interface YfCandle {
  time: string    // 'MM/DD'
  open: number
  high: number
  low: number
  price: number   // close
  volume: number
}

// ── 현재가 캐시 (홈 화면 실제 가격 공유용) ────────────────────────────────────
const CACHE_TTL = 5 * 60 * 1000  // 5분
const priceCache = new Map<string, { data: YfQuote; fetchedAt: number }>()
let _backgroundFetching = false

function parseMeta(data: unknown, symbol: string): YfQuote {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const meta = (data as any)?.chart?.result?.[0]?.meta ?? {}
  const price     = meta.regularMarketPrice ?? 0
  const prevClose = meta.previousClose ?? meta.chartPreviousClose ?? price
  return {
    symbol,
    price,
    prevClose,
    changeRate: prevClose > 0 ? (price - prevClose) / prevClose : 0,
    volume: meta.regularMarketVolume ?? 0,
  }
}

/** 단일 종목 현재가 (캐시 우선, 2d 짧은 range로 빠르게) */
async function fetchPriceWithCache(symbol: string): Promise<YfQuote> {
  const cached = priceCache.get(symbol)
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) return cached.data

  const data  = await yfGet(`/v8/finance/chart/${encodeURIComponent(symbol)}?range=2d&interval=1d`)
  const quote = parseMeta(data, symbol)
  priceCache.set(symbol, { data: quote, fetchedAt: Date.now() })
  return quote
}

/**
 * 캐시에 저장된 현재가 동기 반환 (없으면 undefined)
 * 홈 화면에서 블로킹 없이 캐시된 가격만 즉시 사용할 때 활용
 */
export function getCachedPrice(symbol: string): YfQuote | undefined {
  const cached = priceCache.get(symbol)
  return cached && Date.now() - cached.fetchedAt < CACHE_TTL ? cached.data : undefined
}

/**
 * 전 종목 현재가를 백그라운드에서 fetch해 캐시에 저장
 * - 동시 최대 3개 요청 + 배치 간 300ms 딜레이로 Yahoo 과호출 방지
 * - 이미 실행 중이면 중복 실행하지 않음
 */
export function prefetchAllPrices(symbols: string[]): void {
  if (_backgroundFetching) return
  _backgroundFetching = true

  const CONCURRENCY = 3
  ;(async () => {
    for (let i = 0; i < symbols.length; i += CONCURRENCY) {
      const batch = symbols.slice(i, i + CONCURRENCY)
      await Promise.allSettled(batch.map(sym => fetchPriceWithCache(sym)))
      if (i + CONCURRENCY < symbols.length) {
        await new Promise(resolve => setTimeout(resolve, 300))
      }
    }
  })().finally(() => { _backgroundFetching = false })
}

/** @deprecated 직접 await이 필요한 경우에만 사용 */
export async function fetchAllPrices(symbols: string[]): Promise<Map<string, YfQuote>> {
  const result      = new Map<string, YfQuote>()
  const CONCURRENCY = 3

  for (let i = 0; i < symbols.length; i += CONCURRENCY) {
    const batch   = symbols.slice(i, i + CONCURRENCY)
    const settled = await Promise.allSettled(batch.map(sym => fetchPriceWithCache(sym)))
    settled.forEach((r, idx) => {
      if (r.status === 'fulfilled') result.set(batch[idx], r.value)
    })
    if (i + CONCURRENCY < symbols.length) {
      await new Promise(resolve => setTimeout(resolve, 300))
    }
  }
  return result
}

/**
 * 단일 종목 차트 + 현재가 (상세 화면용)
 * v8/finance/chart 는 OHLCV 캔들 데이터를 제공
 * fetch 후 priceCache 갱신 → 홈 화면 캐시 공유
 */
export async function yfChart(
  symbol: string,
  days = 30
): Promise<{ quote: YfQuote; candles: YfCandle[] }> {
  const data = await yfGet(
    `/v8/finance/chart/${encodeURIComponent(symbol)}?range=${days + 5}d&interval=1d`
  )
  const r = data?.chart?.result?.[0]
  if (!r) throw new Error(`Yahoo Finance: no data for ${symbol}`)

  const quote = parseMeta(data, symbol)
  priceCache.set(symbol, { data: quote, fetchedAt: Date.now() })  // 홈 화면 캐시 공유

  const q0     = r.indicators?.quote?.[0] ?? {}
  const closes: (number | null)[] = q0.close  ?? []
  const opens:  (number | null)[] = q0.open   ?? []
  const highs:  (number | null)[] = q0.high   ?? []
  const lows:   (number | null)[] = q0.low    ?? []
  const vols:   (number | null)[] = q0.volume ?? []
  const candles: YfCandle[] = []

  ;(r.timestamp as number[]).forEach((ts: number, i: number) => {
    const c = closes[i]
    if (c == null || c === 0) return
    const d = new Date(ts * 1000)
    candles.push({
      time:   `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`,
      open:   opens[i]  ?? c,
      high:   highs[i]  ?? c,
      low:    lows[i]   ?? c,
      price:  c,
      volume: vols[i]   ?? 0,
    })
  })

  return { quote, candles: candles.slice(-days) }
}

