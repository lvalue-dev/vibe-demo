/**
 * 백엔드 API 클라이언트.
 * VITE_BACKEND_URL 이 설정되면 백엔드 우선, 없으면 Yahoo Finance 직접 사용.
 */
import type { StockListItem, StockDetail } from '../types'

const BASE = import.meta.env.VITE_BACKEND_URL ?? ''

export const isBackendEnabled = !!BASE

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
  // 65초 타임아웃: Render 무료 티어 cold start(~60초) 대응
  const res = await fetch(`${BASE}/api/stocks`, { signal: AbortSignal.timeout(65000) })
  if (res.status === 503) {
    // 캐시 준비 중 → 5초 후 재시도
    await new Promise(r => setTimeout(r, 5000))
    const retry = await fetch(`${BASE}/api/stocks`, { signal: AbortSignal.timeout(30000) })
    if (!retry.ok) throw new Error(`Backend stocks failed: ${retry.status}`)
    return retry.json()
  }
  if (!res.ok) throw new Error(`Backend stocks failed: ${res.status}`)
  return res.json()
}

// ── 종목 상세 ─────────────────────────────────────────────────────────────────
export async function fetchDetailFromBackend(symbol: string): Promise<StockDetail> {
  const res = await fetch(`${BASE}/api/stocks/${encodeURIComponent(symbol)}`, {
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`Backend detail failed: ${res.status}`)
  const data = await res.json()

  // 백엔드가 투자자 데이터를 반환하지 않는 경우 프론트 시드 데이터로 채움
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
