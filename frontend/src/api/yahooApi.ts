/**
 * 브라우저 측 Yahoo Finance 클라이언트 (GitHub Pages 개발계 전용)
 *
 * CORS 처리:
 *   1. 직접 fetch 시도 (간혹 Yahoo가 CORS 허용)
 *   2. 실패 시 corsproxy.io 경유 (무료 · 데모 목적)
 *
 * 운영계(Oracle + Java)에서는 이 파일을 사용하지 않습니다.
 */

const YF = 'https://query1.finance.yahoo.com'
const PROXY = 'https://corsproxy.io/?url='

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function yfGet(path: string): Promise<any> {
  const url = `${YF}${path}`
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (r.ok) return r.json()
  } catch { /* CORS 차단이면 프록시로 재시도 */ }

  const r = await fetch(`${PROXY}${encodeURIComponent(url)}`, {
    signal: AbortSignal.timeout(12000),
  })
  if (!r.ok) throw new Error(`Yahoo Finance ${r.status}`)
  return r.json()
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
  price: number
  volume: number
}

/**
 * 배치 현재가 조회 (홈 화면 종목 목록용)
 * v7/finance/quote 는 여러 심볼을 한 번에 처리
 */
export async function yfBatchQuotes(symbols: string[]): Promise<Map<string, YfQuote>> {
  const result = new Map<string, YfQuote>()
  const BATCH = 25   // URL 길이 한계 고려

  for (let i = 0; i < symbols.length; i += BATCH) {
    const batch = symbols.slice(i, i + BATCH)
    try {
      const fields = 'regularMarketPrice,regularMarketPreviousClose,regularMarketVolume'
      const data = await yfGet(
        `/v7/finance/quote?symbols=${encodeURIComponent(batch.join(','))}&fields=${fields}`
      )
      const quotes: Record<string, number | string>[] = data?.quoteResponse?.result ?? []
      for (const q of quotes) {
        const price = (q.regularMarketPrice as number) ?? 0
        const prevClose = (q.regularMarketPreviousClose as number) ?? price
        result.set(q.symbol as string, {
          symbol: q.symbol as string,
          price,
          prevClose,
          changeRate: prevClose > 0 ? (price - prevClose) / prevClose : 0,
          volume: (q.regularMarketVolume as number) ?? 0,
        })
      }
    } catch {
      // 배치 실패 시 건너뜀 (seed 기반 fallback 이 처리)
    }
  }
  return result
}

/**
 * 단일 종목 차트 + 현재가 (상세 화면용)
 * v8/finance/chart 는 OHLCV 캔들 데이터를 제공
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

  const meta = r.meta ?? {}
  const price     = meta.regularMarketPrice ?? 0
  const prevClose = meta.previousClose ?? meta.chartPreviousClose ?? price
  const quote: YfQuote = {
    symbol,
    price,
    prevClose,
    changeRate: prevClose > 0 ? (price - prevClose) / prevClose : 0,
    volume: meta.regularMarketVolume ?? 0,
  }

  const closes: (number | null)[] = r.indicators?.quote?.[0]?.close ?? []
  const vols:   (number | null)[] = r.indicators?.quote?.[0]?.volume ?? []
  const candles: YfCandle[] = []

  ;(r.timestamp as number[]).forEach((ts: number, i: number) => {
    const c = closes[i]
    if (c == null || c === 0) return
    const d = new Date(ts * 1000)
    candles.push({
      time:   `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`,
      price:  c,
      volume: vols[i] ?? 0,
    })
  })

  return { quote, candles: candles.slice(-days) }
}
