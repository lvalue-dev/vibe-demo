import type {
  InstitutionalFlow, InstitutionTypeSummary, InstitutionDailyRow, InstitutionPlayer,
  MarketRankItem, MarketTrend,
  InstitutionalTrendData, PlayerTrendData, PlayerInfo, PlayerStockFlow,
} from '../types'

// ── sessionStorage cache (1분 TTL) ───────────────────────────────────────────
const CACHE_TTL = 60 * 1000

function getCached<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw) as { data: T; ts: number }
    if (Date.now() - ts > CACHE_TTL) return null
    return data
  } catch { return null }
}

function setCache<T>(key: string, data: T): void {
  try { sessionStorage.setItem(key, JSON.stringify({ data, ts: Date.now() })) } catch { /* ignore */ }
}

// ── 종목 정보 (시드 기반 데이터 생성에 사용) ─────────────────────────────────
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
  '003550.KS': { name: 'LG',              market: 'KOSPI', sector: '지주' },
  '096770.KS': { name: 'SK이노베이션',     market: 'KOSPI', sector: '에너지' },
  '034730.KS': { name: 'SK',              market: 'KOSPI', sector: '지주' },
  '000810.KS': { name: '삼성화재',         market: 'KOSPI', sector: '보험' },
  '009150.KS': { name: '삼성전기',         market: 'KOSPI', sector: '전자부품' },
  '003490.KS': { name: '대한항공',         market: 'KOSPI', sector: '항공' },
  // ── KOSDAQ ─────────────────────────────────────────────────────────────────
  '247540.KQ': { name: '에코프로비엠',     market: 'KOSDAQ', sector: '전기차배터리' },
  '086520.KQ': { name: '에코프로',         market: 'KOSDAQ', sector: '전기차배터리' },
  '091990.KQ': { name: '셀트리온헬스케어', market: 'KOSDAQ', sector: '바이오' },
  '196170.KQ': { name: '알테오젠',         market: 'KOSDAQ', sector: '바이오' },
  '041510.KQ': { name: 'SM엔터테인먼트',   market: 'KOSDAQ', sector: '엔터' },
  '035900.KQ': { name: 'JYP Ent.',        market: 'KOSDAQ', sector: '엔터' },
  '122870.KQ': { name: '와이지엔터테인먼트', market: 'KOSDAQ', sector: '엔터' },
  '263750.KQ': { name: '펄어비스',         market: 'KOSDAQ', sector: '게임' },
  '036570.KQ': { name: 'NC소프트',         market: 'KOSDAQ', sector: '게임' },
  '112040.KQ': { name: '위메이드',         market: 'KOSDAQ', sector: '게임' },
  // ── NASDAQ ─────────────────────────────────────────────────────────────────
  'AAPL':  { name: 'Apple',              market: 'NASDAQ', sector: 'Technology' },
  'MSFT':  { name: 'Microsoft',          market: 'NASDAQ', sector: 'Technology' },
  'GOOGL': { name: 'Alphabet',           market: 'NASDAQ', sector: 'Technology' },
  'AMZN':  { name: 'Amazon',             market: 'NASDAQ', sector: 'E-Commerce' },
  'META':  { name: 'Meta Platforms',     market: 'NASDAQ', sector: 'Technology' },
  'TSLA':  { name: 'Tesla',              market: 'NASDAQ', sector: 'EV' },
  'NVDA':  { name: 'NVIDIA',             market: 'NASDAQ', sector: 'Semiconductor' },
  'NFLX':  { name: 'Netflix',            market: 'NASDAQ', sector: 'Streaming' },
  'INTC':  { name: 'Intel',              market: 'NASDAQ', sector: 'Semiconductor' },
  'AMD':   { name: 'Advanced Micro Devices', market: 'NASDAQ', sector: 'Semiconductor' },
  'QCOM':  { name: 'Qualcomm',           market: 'NASDAQ', sector: 'Semiconductor' },
  'ADBE':  { name: 'Adobe',              market: 'NASDAQ', sector: 'Software' },
  'CRM':   { name: 'Salesforce',         market: 'NASDAQ', sector: 'Software' },
  'ORCL':  { name: 'Oracle',             market: 'NASDAQ', sector: 'Software' },
  'CSCO':  { name: 'Cisco',              market: 'NASDAQ', sector: 'Networking' },
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

// ── 결정론적 PRNG ────────────────────────────────────────────────────────────
function seededRand(n: number): number {
  let h = n ^ 0x9e3779b9
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b)
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35)
  return ((h ^ (h >>> 16)) >>> 0) / 0x100000000
}

function symbolSeed(sym: string): number {
  return sym.split('').reduce((a, c, i) => a + c.charCodeAt(0) * (i + 3), 0)
}

// ── 개별 기관 이름 풀 ────────────────────────────────────────────────────────
const INST_PLAYERS: Record<string, string[]> = {
  '금융투자': ['미래에셋증권', 'KB증권', '삼성증권', 'NH투자증권', '한국투자증권', '신한투자증권', '키움증권', '대신증권'],
  '투신':     ['삼성자산운용', '미래에셋자산운용', 'KB자산운용', '한국투자신탁운용', '신한자산운용', '하나UBS자산운용'],
  '연기금':   ['국민연금', '사학연금', '공무원연금', '우정사업본부'],
  '보험':     ['삼성생명', '한화생명', '교보생명', '삼성화재', 'DB손해보험'],
  '은행':     ['KB국민은행', '신한은행', '하나은행', '우리은행', 'NH농협은행'],
  '기타법인': ['기타금융기관', '기타외국기관', '기타국내기관'],
  '외국인':   ['골드만삭스', 'JP모건', '블랙록', '뱅가드', '피델리티', '모건스탠리', 'UBS', '도이체방크', 'HSBC', '노무라', '씨티그룹', '메릴린치'],
}

function buildInstitutionPlayers(summary: InstitutionTypeSummary[], symbol: string): InstitutionPlayer[] {
  const seed0 = symbolSeed(symbol) * 29
  const players: InstitutionPlayer[] = []
  summary.forEach((typeSummary, ti) => {
    const names = INST_PLAYERS[typeSummary.name] ?? []
    const typeNet = typeSummary.cumFlow
    const weights = names.map((_, ni) => 0.3 + 0.7 * seededRand(seed0 + ti * 100 + ni * 7))
    const totalW = weights.reduce((a, b) => a + b, 0)
    names.forEach((name, ni) => {
      const net = Math.round(typeNet * weights[ni] / totalW)
      const extra = Math.abs(net) * (0.3 + 0.5 * seededRand(seed0 + ti * 100 + ni * 7 + 1))
      const buyAmount  = net >= 0 ? net + extra : extra
      const sellAmount = net >= 0 ? extra : -net + extra
      players.push({ name, type: typeSummary.name, buyAmount: Math.round(buyAmount), sellAmount: Math.round(sellAmount), netAmount: net })
    })
  })
  return players.sort((a, b) => Math.abs(b.netAmount) - Math.abs(a.netAmount))
}

// ── 시장 전체 기관·거래량 랭킹 ───────────────────────────────────────────────
function buildMarketTrend(): MarketTrend {
  const dailySeed = Math.floor(Date.now() / 86400000)
  const symbols = Object.keys(STOCK_INFO)

  const items = symbols.map((sym, si) => {
    const s = symbolSeed(sym) + dailySeed * 997 + si
    const isKR = STOCK_INFO[sym].market === 'KOSPI' || STOCK_INFO[sym].market === 'KOSDAQ'
    const scale = isKR ? 1e10 : 1e8
    const instNet = Math.round((seededRand(s * 3 + 1) - 0.42) * 2.8 * scale)
    const volume  = Math.round((0.1 + seededRand(s * 3 + 2) * 0.9) * (isKR ? 3e7 : 3e6))
    const priceChangeRate = (seededRand(s * 3 + 3) - 0.5) * 0.1
    return { symbol: sym, name: STOCK_INFO[sym].name, market: STOCK_INFO[sym].market, instNet, volume, priceChangeRate }
  })

  const byInst = [...items].sort((a, b) => b.instNet - a.instNet)
  const byVol  = [...items].sort((a, b) => b.volume  - a.volume)

  const toRankItem = (x: typeof items[0], valueKey: 'instNet' | 'volume'): MarketRankItem => ({
    symbol: x.symbol, name: x.name, market: x.market,
    value: x[valueKey], priceChangeRate: x.priceChangeRate,
  })

  return {
    instBuyTop5:  byInst.slice(0, 5).map(x => toRankItem(x, 'instNet')),
    instSellTop5: byInst.slice(-5).reverse().map(x => toRankItem(x, 'instNet')),
    volumeTop5:   byVol.slice(0, 5).map(x => toRankItem(x, 'volume')),
  }
}

export async function fetchMarketTrend(): Promise<MarketTrend> {
  const key = 'market_trend'
  const cached = getCached<MarketTrend>(key)
  if (cached) return cached
  const result = buildMarketTrend()
  setCache(key, result)
  return result
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

// ── 백엔드 chartData 기반 투자자 동향 생성 (Spring/KIS 전용, Yahoo 불필요) ───
export function buildInstitutionalDataFromChart(
  chartData: { time: string; price: number; volume: number }[],
  symbol: string,
  refPrice: number,
): {
  institutionalFlow: InstitutionalFlow[]
  institutionDaily: InstitutionDailyRow[]
  institutionSummary: InstitutionTypeSummary[]
  institutionPlayers: InstitutionPlayer[]
} {
  const seed0 = symbolSeed(symbol)

  const flow: InstitutionalFlow[] = chartData.map((c, i) => {
    const vol = c.volume ?? 0
    const tradVal = vol * refPrice

    const r1 = seededRand(seed0 + i * 13 + 1)
    const r2 = seededRand(seed0 + i * 13 + 2)
    const r3 = seededRand(seed0 + i * 13 + 3)
    const r4 = seededRand(seed0 + i * 13 + 4)

    const dir = r1 > 0.5 ? 1 : -1
    const mag = 0.2 + 0.6 * seededRand(seed0 + i * 13 + 5)

    const instSign = dir * (r1 > 0.25 ? 1 : -1)
    const fgnSign  = dir * (r2 > 0.35 ? 1 : -1) * (r3 > 0.5 ? 1 : -0.6)
    const institutional = Math.round(instSign * (0.02 + 0.06 * r1) * (0.5 + mag) * tradVal)
    const foreign       = Math.round(fgnSign  * (0.015 + 0.04 * r2) * (0.4 + mag) * tradVal)
    const individual    = Math.round(-(institutional + foreign) * (0.8 + 0.4 * r4))

    return { date: c.time, institutional, foreign, individual }
  })

  const daily   = buildInstitutionDaily(flow, symbol)
  const summary = buildInstitutionSummary(daily)
  const players = buildInstitutionPlayers(summary, symbol)

  return { institutionalFlow: flow, institutionDaily: daily, institutionSummary: summary, institutionPlayers: players }
}

// ── 기관별 매매동향 (전 종목 집계, 결정론적) ─────────────────────────────────
const INST_TYPES_ALL = ['금융투자', '투신', '연기금', '보험', '은행', '기타법인', '외국인'] as const
const TYPE_WEIGHT_ALL = [0.28, 0.20, 0.18, 0.09, 0.05, 0.04, 0.16]

function buildTradingDates(n: number): string[] {
  const dates: string[] = []
  const d = new Date()
  while (dates.length < n) {
    d.setDate(d.getDate() - 1)
    if (d.getDay() !== 0 && d.getDay() !== 6)
      dates.unshift(`${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`)
  }
  return dates
}

function buildInstitutionalTrendSync(): InstitutionalTrendData {
  const dates = buildTradingDates(20)
  const symbols = Object.keys(STOCK_INFO)
  const byType: InstitutionalTrendData['byType'] = Object.fromEntries(
    INST_TYPES_ALL.map(t => [t, { totalDailyNet: new Array(20).fill(0), stocks: [] }])
  )

  symbols.forEach(sym => {
    const isKR = ['KOSPI', 'KOSDAQ'].includes(STOCK_INFO[sym].market)
    const base = isKR ? 4e9 : 4e7
    const s0 = symbolSeed(sym)

    INST_TYPES_ALL.forEach((type, ti) => {
      const dailyNet = dates.map((_, di) => {
        const sign = seededRand(s0 + di * 13 + ti * 17 + 3) > 0.45 ? 1 : -1
        const mag  = seededRand(s0 + di * 7  + ti * 11 + 5) * TYPE_WEIGHT_ALL[ti] * 0.5
        return Math.round(sign * mag * base)
      })
      const net   = dailyNet.reduce((a, b) => a + b, 0)
      const gross = dailyNet.reduce((a, b) => a + Math.abs(b), 0)
      byType[type].stocks.push({
        symbol: sym, name: STOCK_INFO[sym].name, market: STOCK_INFO[sym].market,
        buyAmount:  Math.round((gross + net) / 2),
        sellAmount: Math.round((gross - net) / 2),
        netAmount: net, dailyNet,
      })
      dailyNet.forEach((v, di) => { byType[type].totalDailyNet[di] += v })
    })
  })

  INST_TYPES_ALL.forEach(t => { byType[t].stocks.sort((a, b) => b.netAmount - a.netAmount) })
  return { dates, byType }
}

export async function fetchInstitutionalTrend(): Promise<InstitutionalTrendData> {
  const cached = getCached<InstitutionalTrendData>('inst_trend')
  if (cached) return cached
  const result = buildInstitutionalTrendSync()
  setCache('inst_trend', result)
  return result
}

// ── 개별 기관별 매매동향 ──────────────────────────────────────────────────────
function playerSeed(name: string): number {
  return name.split('').reduce((a, c, i) => a + c.charCodeAt(0) * (i + 7), 0)
}

function buildPlayerTrendSync(): PlayerTrendData {
  const dates = buildTradingDates(20)
  const symbols = Object.keys(STOCK_INFO)

  const allPlayers: Array<{ name: string; type: string }> = []
  Object.entries(INST_PLAYERS).forEach(([type, names]) => {
    names.forEach(name => allPlayers.push({ name, type }))
  })

  const players: PlayerInfo[] = allPlayers.map(({ name, type }) => {
    const typIdx = INST_TYPES_ALL.indexOf(type as typeof INST_TYPES_ALL[number])
    const typeWeight = typIdx >= 0 ? TYPE_WEIGHT_ALL[typIdx] : 0.05
    const ps = playerSeed(name)
    const sizeFactor = 0.08 + 0.22 * seededRand(ps * 41)

    const totalDailyNet = new Array(20).fill(0)
    const stocks: PlayerStockFlow[] = []

    symbols.forEach(sym => {
      const isKR = ['KOSPI', 'KOSDAQ'].includes(STOCK_INFO[sym].market)
      const base = isKR ? 4e9 : 4e7
      const s0 = symbolSeed(sym)

      const tradable = type === '외국인'
        ? seededRand(ps + s0 * 3) > 0.15
        : isKR
          ? seededRand(ps + s0 * 3) > 0.25
          : seededRand(ps + s0 * 3) > 0.80

      const dailyNet = tradable
        ? dates.map((_, di) => {
            const sign = seededRand(s0 + di * 13 + typIdx * 17 + (ps % 7) + 3) > 0.45 ? 1 : -1
            const mag  = seededRand(s0 + di * 7 + typIdx * 11 + (ps % 5) + 5) * typeWeight * sizeFactor
            return Math.round(sign * mag * base)
          })
        : new Array(20).fill(0)

      const net   = dailyNet.reduce((a, b) => a + b, 0)
      const gross = dailyNet.reduce((a, b) => a + Math.abs(b), 0)
      if (gross > 0) {
        stocks.push({
          symbol: sym, name: STOCK_INFO[sym].name, market: STOCK_INFO[sym].market,
          buyAmount:  Math.round((gross + net) / 2),
          sellAmount: Math.round((gross - net) / 2),
          netAmount: net, dailyNet,
        })
        dailyNet.forEach((v, di) => { totalDailyNet[di] += v })
      }
    })

    stocks.sort((a, b) => Math.abs(b.netAmount) - Math.abs(a.netAmount))
    return { name, type, totalDailyNet, stocks }
  })

  return { dates, players }
}

export async function fetchPlayerTrend(): Promise<PlayerTrendData> {
  const cached = getCached<PlayerTrendData>('player_trend')
  if (cached) return cached
  const result = buildPlayerTrendSync()
  setCache('player_trend', result)
  return result
}
