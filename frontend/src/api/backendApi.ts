/**
 * Spring Boot 백엔드 API 클라이언트.
 * Vite 개발 서버가 /api 요청을 localhost:8080(Spring)으로 프록시함.
 */
import type { StockListItem, StockDetail } from '../types'
import { buildInstitutionalDataFromChart } from './finnhubApi'

// Vite proxy: /api → http://localhost:8080 (vite.config.ts 설정)
const BASE = '/api'

export const isBackendEnabled = true

// ── 종목 목록 ─────────────────────────────────────────────────────────────────
export async function fetchStocksFromBackend(): Promise<StockListItem[]> {
  const res = await fetch(`${BASE}/stocks`, { signal: AbortSignal.timeout(30000) })
  if (!res.ok) throw new Error(`Backend stocks failed: ${res.status}`)
  return res.json()
}

// ── 종목 상세 ─────────────────────────────────────────────────────────────────
export async function fetchDetailFromBackend(symbol: string, period = 'daily'): Promise<StockDetail> {
  const res = await fetch(`${BASE}/stocks/${encodeURIComponent(symbol)}?period=${period}`, {
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`Backend detail failed: ${res.status}`)
  const data = await res.json()

  // Spring이 반환하지 않는 필드를 chartData 기반으로 생성
  const chartData: { time: string; price: number; volume: number }[] = data.chartData ?? []

  // 거래량 히스토리
  if (!data.volumeHistory?.length && chartData.length) {
    const prices = chartData.map((c: { price: number }) => c.price)
    data.volumeHistory = chartData.map((c, i) => ({
      date: c.time,
      volume: c.volume,
      isUp: i === 0 || c.price >= prices[i - 1],
    }))
  }

  // 평균 거래량
  const vols = chartData.map((c: { volume: number }) => c.volume)
  if (data.avgVolume5 == null && vols.length >= 5)
    data.avgVolume5 = vols.slice(-5).reduce((a: number, b: number) => a + b, 0) / 5
  if (data.avgVolume20 == null && vols.length >= 20)
    data.avgVolume20 = vols.slice(-20).reduce((a: number, b: number) => a + b, 0) / 20

  // 투자자 동향 (시드 기반 추정)
  if (!data.institutionalFlow?.length && chartData.length) {
    const inst = buildInstitutionalDataFromChart(chartData, symbol, data.currentPrice)
    Object.assign(data, inst)
  }

  return data as StockDetail
}

// ── 현재가 목록 (watchlist/portfolio 가격 갱신용) ─────────────────────────────
export async function fetchPricesFromBackend(): Promise<Pick<StockListItem, 'symbol' | 'currentPrice' | 'priceChangeRate'>[]> {
  const res = await fetch(`${BASE}/stocks`, { signal: AbortSignal.timeout(15000) })
  if (!res.ok) return []
  const list: StockListItem[] = await res.json()
  return list.map(({ symbol, currentPrice, priceChangeRate }) => ({ symbol, currentPrice, priceChangeRate }))
}
