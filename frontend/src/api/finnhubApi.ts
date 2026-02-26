import type { StockListItem, StockDetail, PricePoint, DailyBar, InstitutionalFlow, InstitutionTypeSummary, InstitutionDailyRow, Recommendation, RiskLevel } from '../types'

// ── sessionStorage cache (5분 TTL, stale fallback 포함) ──────────────────────
const CACHE_TTL = 60 * 1000  // 1분

function getCached<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw) as { data: T; ts: number }
    if (Date.now() - ts > CACHE_TTL) return null  // 만료됐지만 삭제 않음 (stale fallback 용)
    return data
  } catch { return null }
}

// TTL 만료 여부 무시하고 마지막 성공 데이터 반환 (API 실패 시 fallback)
function getStaleCached<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    const { data } = JSON.parse(raw) as { data: T; ts: number }
    return data
  } catch { return null }
}

function setCache<T>(key: string, data: T): void {
  try { sessionStorage.setItem(key, JSON.stringify({ data, ts: Date.now() })) } catch { /* ignore */ }
}

// ── Yahoo Finance (전 종목) ───────────────────────────────────────────────────
const YF_BASE = 'https://query2.finance.yahoo.com/v8/finance/chart'
const CORS_PROXY_1 = 'https://api.allorigins.win/raw?url='
const CORS_PROXY_2 = 'https://corsproxy.io/?'

export const STOCK_INFO: Record<string, { name: string; market: string; sector: string }> = {
  // ── KOSPI ──────────────────────────────────────────────────────────────────
  '005930.KS': { name: '삼성전자',         market: 'KOSPI', sector: '반도체' },
  '000660.KS': { name: 'SK하이닉스',       market: 'KOSPI', sector: '반도체' },
  '207940.KS': { name: '삼성바이오로직스', market: 'KOSPI', sector: '바이오' },
  '005380.KS': { name: '현대자동차',       market: 'KOSPI', sector: '자동차' },
  '373220.KS': { name: 'LG에너지솔루션',   market: 'KOSPI', sector: '전기차배터리' },
  '000270.KS': { name: '기아',             market: 'KOSPI', sector: '자동차' },
  '005490.KS': { name: 'POSCO홀딩스',      market: 'KOSPI', sector: '철강' },
  '035420.KS': { name: 'NAVER',            market: 'KOSPI', sector: 'IT' },
  '068270.KS': { name: '셀트리온',         market: 'KOSPI', sector: '바이오' },
  '051910.KS': { name: 'LG화학',           market: 'KOSPI', sector: '화학' },
  '105560.KS': { name: 'KB금융',           market: 'KOSPI', sector: '금융' },
  '035720.KS': { name: '카카오',           market: 'KOSPI', sector: 'IT' },
  '055550.KS': { name: '신한지주',         market: 'KOSPI', sector: '금융' },
  '086790.KS': { name: '하나금융지주',     market: 'KOSPI', sector: '금융' },
  '028260.KS': { name: '삼성물산',         market: 'KOSPI', sector: '건설·무역' },
  '066570.KS': { name: 'LG전자',           market: 'KOSPI', sector: '전자' },
  '012330.KS': { name: '현대모비스',       market: 'KOSPI', sector: '자동차부품' },
  '003670.KS': { name: '포스코퓨처엠',     market: 'KOSPI', sector: '2차전지소재' },
  '323410.KS': { name: '카카오뱅크',       market: 'KOSPI', sector: '인터넷은행' },
  '032830.KS': { name: '삼성생명',         market: 'KOSPI', sector: '보험' },
  '017670.KS': { name: 'SK텔레콤',         market: 'KOSPI', sector: '통신' },
  '030200.KS': { name: 'KT',               market: 'KOSPI', sector: '통신' },
  '003490.KS': { name: '대한항공',         market: 'KOSPI', sector: '항공' },
  '096770.KS': { name: 'SK이노베이션',     market: 'KOSPI', sector: '에너지' },
  '034020.KS': { name: '두산에너빌리티',   market: 'KOSPI', sector: '에너지' },
  '010950.KS': { name: 'S-Oil',            market: 'KOSPI', sector: '에너지' },
  '316140.KS': { name: '우리금융지주',     market: 'KOSPI', sector: '금융' },
  '009150.KS': { name: '삼성전기',         market: 'KOSPI', sector: '전자부품' },
  '251270.KS': { name: '넷마블',           market: 'KOSPI', sector: '게임' },
  '047050.KS': { name: '포스코인터내셔널', market: 'KOSPI', sector: '무역' },
  // ── KOSDAQ ─────────────────────────────────────────────────────────────────
  '247540.KQ': { name: '에코프로비엠',     market: 'KOSDAQ', sector: '2차전지소재' },
  '086520.KQ': { name: '에코프로',         market: 'KOSDAQ', sector: '2차전지소재' },
  '196170.KQ': { name: '알테오젠',         market: 'KOSDAQ', sector: '바이오' },
  '035900.KQ': { name: 'JYP엔터',          market: 'KOSDAQ', sector: '엔터' },
  '041510.KQ': { name: 'SM엔터',           market: 'KOSDAQ', sector: '엔터' },
  '122870.KQ': { name: 'YG엔터',           market: 'KOSDAQ', sector: '엔터' },
  '263750.KQ': { name: '펄어비스',         market: 'KOSDAQ', sector: '게임' },
  '293490.KQ': { name: '카카오게임즈',     market: 'KOSDAQ', sector: '게임' },
  '112040.KQ': { name: '위메이드',         market: 'KOSDAQ', sector: '게임' },
  '145020.KQ': { name: '휴젤',             market: 'KOSDAQ', sector: '바이오' },
  // ── NASDAQ ─────────────────────────────────────────────────────────────────
  'AAPL':  { name: 'Apple',       market: 'NASDAQ', sector: 'Technology' },
  'NVDA':  { name: 'NVIDIA',      market: 'NASDAQ', sector: 'Semiconductor' },
  'MSFT':  { name: 'Microsoft',   market: 'NASDAQ', sector: 'Technology' },
  'AMZN':  { name: 'Amazon',      market: 'NASDAQ', sector: 'E-Commerce' },
  'META':  { name: 'Meta',        market: 'NASDAQ', sector: 'Social Media' },
  'TSLA':  { name: 'Tesla',       market: 'NASDAQ', sector: 'EV' },
  'GOOGL': { name: 'Alphabet',    market: 'NASDAQ', sector: 'Technology' },
  'AVGO':  { name: 'Broadcom',    market: 'NASDAQ', sector: 'Semiconductor' },
  'AMD':   { name: 'AMD',         market: 'NASDAQ', sector: 'Semiconductor' },
  'NFLX':  { name: 'Netflix',     market: 'NASDAQ', sector: 'Streaming' },
  'INTC':  { name: 'Intel',       market: 'NASDAQ', sector: 'Semiconductor' },
  'QCOM':  { name: 'Qualcomm',    market: 'NASDAQ', sector: 'Semiconductor' },
  'MU':    { name: 'Micron',      market: 'NASDAQ', sector: 'Semiconductor' },
  'ADBE':  { name: 'Adobe',       market: 'NASDAQ', sector: 'Software' },
  'CRM':   { name: 'Salesforce',  market: 'NASDAQ', sector: 'Software' },
  'PYPL':  { name: 'PayPal',      market: 'NASDAQ', sector: 'Fintech' },
  'UBER':  { name: 'Uber',        market: 'NASDAQ', sector: 'Mobility' },
  'PLTR':  { name: 'Palantir',    market: 'NASDAQ', sector: 'AI·Data' },
  'COIN':  { name: 'Coinbase',    market: 'NASDAQ', sector: 'Crypto' },
  'MSTR':  { name: 'MicroStrategy', market: 'NASDAQ', sector: 'Crypto' },
  // ── NYSE ───────────────────────────────────────────────────────────────────
  'JPM':  { name: 'JPMorgan Chase',      market: 'NYSE', sector: 'Finance' },
  'V':    { name: 'Visa',                market: 'NYSE', sector: 'Finance' },
  'WMT':  { name: 'Walmart',             market: 'NYSE', sector: 'Retail' },
  'JNJ':  { name: 'Johnson & Johnson',   market: 'NYSE', sector: 'Healthcare' },
  'XOM':  { name: 'ExxonMobil',          market: 'NYSE', sector: 'Energy' },
  'BAC':  { name: 'Bank of America',     market: 'NYSE', sector: 'Finance' },
  'GS':   { name: 'Goldman Sachs',       market: 'NYSE', sector: 'Finance' },
  'UNH':  { name: 'UnitedHealth',        market: 'NYSE', sector: 'Healthcare' },
  'PFE':  { name: 'Pfizer',              market: 'NYSE', sector: 'Healthcare' },
  'KO':   { name: 'Coca-Cola',           market: 'NYSE', sector: 'Consumer' },
  'MCD':  { name: "McDonald's",          market: 'NYSE', sector: 'Consumer' },
  'DIS':  { name: 'Walt Disney',         market: 'NYSE', sector: 'Entertainment' },
  'BA':   { name: 'Boeing',              market: 'NYSE', sector: 'Aerospace' },
  'GM':   { name: 'General Motors',      market: 'NYSE', sector: 'Automotive' },
  'BABA': { name: 'Alibaba',             market: 'NYSE', sector: 'E-Commerce' },
}

export const REAL_SYMBOLS = Object.keys(STOCK_INFO)

interface NormalizedQuote { currentPrice: number; prevClose: number; volume: number }
interface NormalizedCandle { timestamps: number[]; opens: number[]; closes: number[]; volumes: number[] }

// ── 결정론적 PRNG (종목·날짜별 일관된 난수) ─────────────────────────────────
function seededRand(n: number): number {
  let h = n ^ 0x9e3779b9
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b)
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35)
  return ((h ^ (h >>> 16)) >>> 0) / 0x100000000
}

function symbolSeed(sym: string): number {
  return sym.split('').reduce((a, c, i) => a + c.charCodeAt(0) * (i + 3), 0)
}

function buildVolumeHistory(ts: number[], opens: number[], closes: number[], vols: number[]): DailyBar[] {
  return ts.map((t, i) => {
    const d = new Date(t * 1000)
    return {
      date: `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`,
      volume: vols[i] ?? 0,
      isUp: (closes[i] ?? 0) >= (opens[i] ?? closes[i] ?? 0),
    }
  })
}

// ── 기관 유형 분해 ────────────────────────────────────────────────────────────
const INST_TYPES = ['금융투자', '투신', '연기금', '보험', '은행', '기타법인'] as const
const INST_BASE_W = [0.35, 0.25, 0.20, 0.10, 0.05, 0.05]

function buildInstitutionDaily(flow: InstitutionalFlow[], symbol: string): InstitutionDailyRow[] {
  const seed0 = symbolSeed(symbol) * 17
  return flow.map((f, di) => {
    const total = f.institutional
    const raw = INST_BASE_W.map((w, ti) => w * (0.7 + 0.6 * seededRand(seed0 + di * 31 + ti * 7)))
    const tw = raw.reduce((a, b) => a + b, 0)
    const row = { date: f.date } as unknown as InstitutionDailyRow
    INST_TYPES.forEach((t, ti) => { (row as unknown as Record<string, number | string>)[t] = Math.round(total * raw[ti] / tw) })
    return row
  })
}

function buildInstitutionSummary(daily: InstitutionDailyRow[]): InstitutionTypeSummary[] {
  if (!daily.length) return INST_TYPES.map(name => ({ name, todayFlow: 0, cumFlow: 0 }))
  const today = daily[daily.length - 1]
  return INST_TYPES.map(name => ({
    name,
    todayFlow: today[name as keyof InstitutionDailyRow] as number,
    cumFlow: daily.reduce((s, r) => s + (r[name as keyof InstitutionDailyRow] as number), 0),
  }))
}

function buildInstitutionalFlow(
  ts: number[], opens: number[], closes: number[], vols: number[],
  symbol: string, refPrice: number
): InstitutionalFlow[] {
  const seed0 = symbolSeed(symbol)
  return ts.map((t, i) => {
    const d = new Date(t * 1000)
    const date = `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
    const open = opens[i] ?? closes[i]
    const close = closes[i]
    const vol = vols[i] ?? 0
    const dir = close >= open ? 1 : -1
    const mag = Math.min(Math.abs((close - open) / (open || 1)) * 15, 1)
    const tradVal = vol * refPrice   // 총 거래대금 (KRW 또는 USD)

    const r1 = seededRand(seed0 + i * 13 + 1)
    const r2 = seededRand(seed0 + i * 13 + 2)
    const r3 = seededRand(seed0 + i * 13 + 3)
    const r4 = seededRand(seed0 + i * 13 + 4)

    // 순매수 = 총거래대금의 2~8%, 방향에 편향 (상승일엔 기관·외국인 순매수 경향)
    const instSign = dir * (r1 > 0.25 ? 1 : -1)
    const fgnSign  = dir * (r2 > 0.35 ? 1 : -1) * (r3 > 0.5 ? 1 : -0.6)
    const institutional = Math.round(instSign * (0.02 + 0.06 * r1) * (0.5 + mag) * tradVal)
    const foreign       = Math.round(fgnSign  * (0.015 + 0.04 * r2) * (0.4 + mag) * tradVal)
    const individual    = Math.round(-(institutional + foreign) * (0.8 + 0.4 * r4))

    return { date, institutional, foreign, individual }
  })
}

// ── Yahoo Finance fetcher: 직접 + 프록시 2개 동시 경쟁 ─────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchYahoo(symbol: string, range: string, interval: string): Promise<any | null> {
  const url = `${YF_BASE}/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`

  const parseResult = (json: unknown) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = (json as any)?.chart?.result?.[0]
    return r ?? null
  }

  // 직접 요청 (1.5초 제한)
  const direct = (async () => {
    const ctrl = new AbortController()
    const tid = setTimeout(() => ctrl.abort(), 1500)
    try {
      const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } })
      clearTimeout(tid)
      if (res.ok) return parseResult(await res.json())
    } catch { clearTimeout(tid) }
    return null
  })()

  // 프록시1: allorigins.win (200ms 후 시작)
  const proxy1 = (async () => {
    await new Promise(r => setTimeout(r, 200))
    try {
      const res = await fetch(`${CORS_PROXY_1}${encodeURIComponent(url)}`)
      if (res.ok) return parseResult(await res.json())
    } catch { /* ignore */ }
    return null
  })()

  // 프록시2: corsproxy.io (400ms 후 시작 — 두 번째 백업)
  const proxy2 = (async () => {
    await new Promise(r => setTimeout(r, 400))
    try {
      const res = await fetch(`${CORS_PROXY_2}${encodeURIComponent(url)}`)
      if (res.ok) return parseResult(await res.json())
    } catch { /* ignore */ }
    return null
  })()

  // 먼저 non-null 결과를 반환한 쪽 사용
  return new Promise<unknown>(resolve => {
    let settled = false
    let pending = 3
    const done = (val: unknown) => {
      if (val && !settled) { settled = true; resolve(val) }
      if (--pending === 0 && !settled) resolve(null)
    }
    direct.then(done)
    proxy1.then(done)
    proxy2.then(done)
  })
}

async function yfQuote(symbol: string): Promise<NormalizedQuote | null> {
  const result = await fetchYahoo(symbol, '1d', '1d')
  if (!result) return null
  const price = result.meta?.regularMarketPrice
  const prevClose = result.meta?.previousClose ?? result.meta?.chartPreviousClose
  if (!price || price === 0) return null
  return { currentPrice: price, prevClose: prevClose ?? price, volume: result.meta?.regularMarketVolume ?? 0 }
}

async function yfCandles(symbol: string, range: string, interval: string): Promise<NormalizedCandle | null> {
  const result = await fetchYahoo(symbol, range, interval)
  if (!result?.timestamp) return null
  const rawC: (number | null)[] = result.indicators?.quote?.[0]?.close ?? []
  const rawO: (number | null)[] = result.indicators?.quote?.[0]?.open ?? []
  const rawV: (number | null)[] = result.indicators?.quote?.[0]?.volume ?? []
  const timestamps: number[] = [], opens: number[] = [], closes: number[] = [], volumes: number[] = []
  result.timestamp.forEach((ts: number, i: number) => {
    const c = rawC[i]
    if (c != null && c > 0) {
      timestamps.push(ts)
      opens.push(rawO[i] ?? c)
      closes.push(c)
      volumes.push(rawV[i] ?? 0)
    }
  })
  return closes.length ? { timestamps, opens, closes, volumes } : null
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
  return Math.sqrt(returns.reduce((s, r) => s + (r - mean) ** 2, 0) / returns.length)
}

function analyze(p: {
  currentPrice: number; ma5: number | null; ma20: number | null
  volumeRatio: number | null; priceChangeRate: number; volatility: number
}): { score: number; recommendation: Recommendation; recommendationLabel: string; risk: RiskLevel; riskLabel: string; reasons: string[] } {
  let score = 0
  const reasons: string[] = []

  if (p.ma20 && p.currentPrice < p.ma20) {
    score += 20
    reasons.push(`현재 가격이 20일 평균보다 ${(((p.ma20 - p.currentPrice) / p.ma20) * 100).toFixed(1)}% 낮음 (저평가 구간)`)
  }
  if (p.ma5 && p.ma20) {
    if (p.ma5 > p.ma20) { score += 20; reasons.push('단기(5일) 이동평균이 장기(20일)를 상회 - 상승 모멘텀') }
    else reasons.push('단기(5일) 이동평균이 장기(20일) 하회 - 하락 추세')
  }
  if (p.volumeRatio && p.volumeRatio >= 1.5) {
    score += 20; reasons.push(`거래량이 평균 대비 ${p.volumeRatio.toFixed(1)}배 증가 - 관심 집중`)
  }
  if (p.priceChangeRate > 0) { score += 20; reasons.push(`전일 대비 +${(p.priceChangeRate * 100).toFixed(2)}% 상승 중`) }
  else reasons.push(`전일 대비 ${(p.priceChangeRate * 100).toFixed(2)}% 하락 중`)

  if (p.volatility < 0.05) { score += 20; reasons.push('변동성 낮음 - 안정적인 가격 흐름') }
  else reasons.push('변동성 높음 - 단기 급등락 주의')

  const recommendation: Recommendation = score >= 80 ? 'STRONG_BUY' : score >= 60 ? 'BUY' : score >= 40 ? 'HOLD' : 'SELL'
  const recommendationLabel = score >= 80 ? '강한 매수' : score >= 60 ? '매수 적절' : score >= 40 ? '관망' : '매도'
  const risk: RiskLevel = (score < 40 || p.volatility >= 0.05) ? 'HIGH' : score < 60 ? 'MEDIUM' : 'LOW'
  const riskLabel = risk === 'HIGH' ? '높음' : risk === 'MEDIUM' ? '보통' : '낮음'
  return { score, recommendation, recommendationLabel, risk, riskLabel, reasons }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function fetchRealStocks(): Promise<StockListItem[]> {
  const cached = getCached<StockListItem[]>('stocks_list')
  if (cached) return cached

  const results = await Promise.all(
    REAL_SYMBOLS.map(async (symbol): Promise<StockListItem | null> => {
      // 종목별 최대 8초 제한 (느린 종목이 전체를 막지 않도록)
      const timeout = new Promise<null>(r => setTimeout(() => r(null), 8000))

      const fetchOne = async (): Promise<StockListItem | null> => {
        const [quote, daily] = await Promise.all([
          yfQuote(symbol),
          yfCandles(symbol, '22d', '1d'),  // 22일 (MA20 계산에 충분, 35d보다 빠름)
        ])
        if (!quote) return null

        const closes = daily?.closes ?? []
        const volumes = daily?.volumes ?? []
        const ma5 = calcMA(closes, 5)
        const ma20 = calcMA(closes, 20)
        const todayVol = volumes[volumes.length - 1] ?? null
        const prevAvgVol = volumes.length > 1
          ? volumes.slice(0, -1).reduce((a, b) => a + b, 0) / (volumes.length - 1) : null
        const volumeRatio = todayVol && prevAvgVol ? todayVol / prevAvgVol : null
        const volatility = calcVolatility(closes.slice(-10))
        const priceChangeRate = quote.prevClose > 0 ? (quote.currentPrice - quote.prevClose) / quote.prevClose : 0
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
      }

      return Promise.race([fetchOne(), timeout])
    })
  )

  const valid = results.filter((r): r is StockListItem => r !== null)
  if (valid.length === 0) {
    // 실패 시 만료된 캐시라도 반환 (rate limit / 네트워크 오류 대응)
    const stale = getStaleCached<StockListItem[]>('stocks_list')
    if (stale) return stale
    throw new Error('주식 데이터를 불러올 수 없습니다')
  }
  setCache('stocks_list', valid)
  return valid
}

export async function fetchRealStockDetail(symbol: string): Promise<StockDetail> {
  const cached = getCached<StockDetail>(`stock_${symbol}`)
  if (cached) return cached

  const info = STOCK_INFO[symbol]
  if (!info) throw new Error('지원하지 않는 종목입니다')

  const [quote, daily, intraday] = await Promise.all([
    yfQuote(symbol),
    yfCandles(symbol, '22d', '1d'),
    yfCandles(symbol, '2d', '5m'),
  ])

  if (!quote) {
    const stale = getStaleCached<StockDetail>(`stock_${symbol}`)
    if (stale) return stale
    throw new Error('주식 데이터를 불러올 수 없습니다')
  }

  const timestamps = daily?.timestamps ?? []
  const opens = daily?.opens ?? []
  const closes = daily?.closes ?? []
  const volumes = daily?.volumes ?? []
  const ma5 = calcMA(closes, 5)
  const ma20 = calcMA(closes, 20)
  const todayVol = volumes[volumes.length - 1] ?? null
  const prevAvgVol = volumes.length > 1
    ? volumes.slice(0, -1).reduce((a, b) => a + b, 0) / (volumes.length - 1) : null
  const volumeRatio = todayVol && prevAvgVol ? todayVol / prevAvgVol : null
  const avgVolume5  = volumes.length >= 5  ? volumes.slice(-5).reduce((a, b) => a + b, 0) / 5   : null
  const avgVolume20 = volumes.length >= 20 ? volumes.slice(-20).reduce((a, b) => a + b, 0) / 20 : null
  const volatility = calcVolatility(closes.slice(-10))
  const priceChangeRate = quote.prevClose > 0 ? (quote.currentPrice - quote.prevClose) / quote.prevClose : 0
  const result = analyze({ currentPrice: quote.currentPrice, ma5, ma20, volumeRatio, priceChangeRate, volatility })

  // 거래량 히스토리 & 투자자별 순매수 (추정)
  const volumeHistory     = buildVolumeHistory(timestamps, opens, closes, volumes)
  const institutionalFlow = buildInstitutionalFlow(timestamps, opens, closes, volumes, symbol, quote.currentPrice)
  const institutionDaily  = buildInstitutionDaily(institutionalFlow, symbol)
  const institutionSummary = buildInstitutionSummary(institutionDaily)

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
    symbol, name: info.name, market: info.market, sector: info.sector,
    currentPrice: quote.currentPrice, prevClose: quote.prevClose, priceChangeRate,
    volume: quote.volume || todayVol || 0,
    score: result.score, recommendation: result.recommendation,
    recommendationLabel: result.recommendationLabel, risk: result.risk,
    riskLabel: result.riskLabel, reasons: result.reasons,
    ma5, ma20, volumeRatio, avgVolume5, avgVolume20,
    chartData, volumeHistory, institutionalFlow, institutionSummary, institutionDaily,
    analyzedAt: new Date().toISOString(),
  }
  setCache(`stock_${symbol}`, detail)
  return detail
}
