/**
 * 종목 목록 인메모리 캐시.
 * - 서버 시작 시 백그라운드에서 초기 로드
 * - 이후 1분마다 갱신 (장중) / 5분마다 (장 외)
 * - GET /api/stocks 는 캐시를 즉시 반환 → cold start 이후 첫 요청도 빠름
 */
import { isKisConfigured } from './kis/auth'
import { getDomesticPrice } from './kis/domestic'
import { getOverseasPrice } from './kis/overseas'
import { parseYfSymbol, isMarketOpen } from './kis/symbols'
import { yfQuote } from './yahoo/proxy'
import { STOCK_INFO } from './stockInfo'

export interface CachedStock {
  symbol: string
  name: string
  market: string
  currentPrice: number
  prevClose: number
  priceChangeRate: number
  volume: number
  recommendation: null
  recommendationLabel: string
  score: null
  risk: null
  riskLabel: string
  analyzedAt: null
}

let cache: CachedStock[] = []
let lastUpdated = 0
let refreshTimer: ReturnType<typeof setTimeout> | null = null

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

async function fetchOne(sym: string): Promise<CachedStock | null> {
  const info = STOCK_INFO[sym]
  const kisInfo = parseYfSymbol(sym)
  try {
    let price: number, prevClose: number, changeRate: number, volume: number
    if (isKisConfigured()) {
      const q = kisInfo.type === 'domestic'
        ? await getDomesticPrice(kisInfo.code)
        : await getOverseasPrice(kisInfo.exchange!, kisInfo.code)
      if (!q) return null
      price = q.price; prevClose = q.prevClose; changeRate = q.changeRate; volume = q.volume
    } else {
      const q = await yfQuote(sym)
      if (!q) return null
      price = q.price; prevClose = q.prevClose; changeRate = q.changeRate; volume = q.volume
    }
    return {
      symbol: sym, name: info.name, market: info.market,
      currentPrice: price, prevClose, priceChangeRate: changeRate, volume,
      recommendation: null, recommendationLabel: '-', score: null, risk: null, riskLabel: '-', analyzedAt: null,
    }
  } catch { return null }
}

async function refreshCache(): Promise<void> {
  const symbols = Object.keys(STOCK_INFO)
  const results: CachedStock[] = []

  if (isKisConfigured()) {
    // Paper 모드: 초당 2건 제한 → 500ms 간격으로 순차 처리
    const isPaper = (process.env.KIS_MODE ?? 'paper') !== 'real'
    if (isPaper) {
      for (let i = 0; i < symbols.length; i++) {
        const item = await fetchOne(symbols[i])
        if (item) results.push(item)
        if (i < symbols.length - 1) await sleep(500)
      }
    } else {
      // Real 모드: 10개씩 병렬
      for (let i = 0; i < symbols.length; i += 10) {
        const batch = await Promise.all(symbols.slice(i, i + 10).map(fetchOne))
        batch.forEach(item => { if (item) results.push(item) })
        if (i + 10 < symbols.length) await sleep(500)
      }
    }
  } else {
    // KIS 미설정: Yahoo Finance 병렬 (외부 API라 rate limit 없음)
    const batch = await Promise.all(symbols.map(fetchOne))
    batch.forEach(item => { if (item) results.push(item) })
  }

  if (results.length > 0) {
    cache = results
    lastUpdated = Date.now()
    console.log(`[Cache] Updated: ${results.length} stocks`)
  }
}

function scheduleRefresh(): void {
  const anyOpen = Object.keys(STOCK_INFO).some(sym =>
    isMarketOpen(parseYfSymbol(sym).market)
  )
  const interval = anyOpen ? 60_000 : 300_000  // 장중 1분, 장 외 5분
  refreshTimer = setTimeout(async () => {
    await refreshCache().catch(e => console.error('[Cache] refresh error:', e))
    scheduleRefresh()
  }, interval)
}

export function getCache(): CachedStock[] { return cache }
export function getCacheAge(): number { return lastUpdated ? Date.now() - lastUpdated : -1 }

export function startCache(): void {
  console.log('[Cache] Starting background stock cache...')
  // 서버 시작 3초 후 첫 로드 (서버가 완전히 뜬 후)
  setTimeout(async () => {
    await refreshCache().catch(e => console.error('[Cache] initial load error:', e))
    scheduleRefresh()
  }, 3000)
}

export function stopCache(): void {
  if (refreshTimer) { clearTimeout(refreshTimer); refreshTimer = null }
}
