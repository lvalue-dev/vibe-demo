/**
 * 종목 목록 인메모리 캐시.
 * - 서버 시작 시 STOCK_INFO 전체를 placeholder(가격 0)로 초기화
 * - poller.ts 가 가격을 조회할 때마다 updateCacheEntry() 로 갱신
 * - GET /api/stocks 는 캐시를 즉시 반환 → KIS 중복 호출 없음
 */
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

// symbol → CachedStock 맵 (빠른 업데이트)
const cacheMap = new Map<string, CachedStock>()
let lastUpdated = 0

/** poller / cache refresh 에서 호출: 개별 종목 가격 갱신 */
export function updateCacheEntry(
  sym: string,
  price: number,
  prevClose: number,
  changeRate: number,
  volume: number,
): void {
  const info = STOCK_INFO[sym]
  if (!info) return
  cacheMap.set(sym, {
    symbol: sym, name: info.name, market: info.market,
    currentPrice: price, prevClose, priceChangeRate: changeRate, volume,
    recommendation: null, recommendationLabel: '-',
    score: null, risk: null, riskLabel: '-', analyzedAt: null,
  })
  lastUpdated = Date.now()
}

/** 전체 캐시 반환 (가격이 한 번이라도 조회된 종목만) */
export function getCache(): CachedStock[] {
  return Array.from(cacheMap.values())
}

export function getCacheAge(): number {
  return lastUpdated ? Date.now() - lastUpdated : -1
}

/** 서버 시작 시 호출 – placeholder 없이 빈 맵으로 시작, poller 가 채움 */
export function startCache(): void {
  console.log('[Cache] Ready – will be populated by poller')
}

export function stopCache(): void {
  // poller 가 멈추면 캐시도 더 이상 갱신 안 됨 (별도 타이머 없음)
}
