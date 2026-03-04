/**
 * 백엔드 API 클라이언트.
 * VITE_BACKEND_URL 이 설정되면 백엔드 우선, 없으면 Yahoo Finance 직접 사용.
 */
import type { StockListItem, StockDetail } from '../types'
import { buildInstitutionalDataFromChart } from './finnhubApi'

const BASE = import.meta.env.VITE_BACKEND_URL ?? ''

export const isBackendEnabled = !!BASE

console.log('[backendApi] VITE_BACKEND_URL:', BASE || '(미설정)', '| isBackendEnabled:', !!BASE)

// ── 헬스체크 ──────────────────────────────────────────────────────────────────
export async function checkHealth(): Promise<boolean> {
  if (!BASE) return false
  try {
    const res = await fetch(`${BASE}/health`, { signal: AbortSignal.timeout(3000) })
    return res.ok
  } catch { return false }
}

// ── 종목 목록 ─────────────────────────────────────────────────────────────────
export async function fetchStocksFromBackend(): Promise<StockListItem[]> {
  const res = await fetch(`${BASE}/api/stocks`, { signal: AbortSignal.timeout(30000) })
  if (res.ok) return res.json()
  if (res.status !== 503) throw new Error(`Backend stocks failed: ${res.status}`)

  // 503: KIS 첫 폴링 사이클 진행 중 (paper 모드 ~165초)
  // → 15초 간격으로 최대 12회 재시도 (총 180초 대기)
  for (let i = 0; i < 12; i++) {
    await new Promise(r => setTimeout(r, 15000))
    const retry = await fetch(`${BASE}/api/stocks`, { signal: AbortSignal.timeout(30000) })
    if (retry.ok) return retry.json()
    if (retry.status !== 503) throw new Error(`Backend stocks failed: ${retry.status}`)
  }
  throw new Error('서버 캐시 준비 시간 초과 (3분)')
}

// ── 종목 상세 ─────────────────────────────────────────────────────────────────
export async function fetchDetailFromBackend(symbol: string): Promise<StockDetail> {
  const res = await fetch(`${BASE}/api/stocks/${encodeURIComponent(symbol)}`, {
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`Backend detail failed: ${res.status}`)
  const data = await res.json()

  // 백엔드가 투자자 데이터를 반환하지 않으면 chartData 기반 시드 데이터로 채움
  if (!data.institutionalFlow?.length && data.chartData?.length) {
    const inst = buildInstitutionalDataFromChart(data.chartData, symbol, data.currentPrice)
    Object.assign(data, inst)
  }

  return data as StockDetail
}

// ── SSE 실시간 구독 ───────────────────────────────────────────────────────────
export interface PriceUpdate {
  symbol: string
  price: number
  changeRate: number
  volume: number
  ts: number
}

export function subscribeSSE(
  symbols: string[],
  onUpdate: (update: PriceUpdate) => void,
  onError?: (err: Event) => void,
): () => void {
  if (!BASE) return () => {}

  const params = symbols.length > 0 ? `?symbols=${symbols.join(',')}` : ''
  const es = new EventSource(`${BASE}/api/stocks/stream/sse${params}`)

  es.onmessage = (e) => {
    try { onUpdate(JSON.parse(e.data) as PriceUpdate) } catch { /* ignore */ }
  }
  if (onError) es.onerror = onError

  return () => es.close()
}
