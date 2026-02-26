/**
 * KIS API 미설정 시 Yahoo Finance 서버사이드 프록시.
 * 서버에서 호출하므로 CORS 문제 없음.
 */
import axios from 'axios'

const YF_BASE = 'https://query2.finance.yahoo.com/v8/finance/chart'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function yfFetch(symbol: string, range: string, interval: string): Promise<any | null> {
  const url = `${YF_BASE}/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`
  try {
    const res = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      timeout: 10000,
    })
    return res.data?.chart?.result?.[0] ?? null
  } catch (err) {
    console.error('[YF proxy]', symbol, (err as Error).message)
    return null
  }
}

export interface YfQuote {
  price: number
  prevClose: number
  changeRate: number
  volume: number
}

export interface YfCandle {
  date: string
  open: number
  close: number
  volume: number
}

export async function yfQuote(symbol: string): Promise<YfQuote | null> {
  const r = await yfFetch(symbol, '1d', '1d')
  if (!r) return null
  const price = r.meta?.regularMarketPrice
  if (!price || price === 0) return null
  const prevClose = r.meta?.previousClose ?? r.meta?.chartPreviousClose ?? price
  return {
    price,
    prevClose,
    changeRate: prevClose > 0 ? (price - prevClose) / prevClose : 0,
    volume: r.meta?.regularMarketVolume ?? 0,
  }
}

export async function yfCandles(symbol: string, days = 30): Promise<YfCandle[]> {
  const r = await yfFetch(symbol, `${days + 10}d`, '1d')
  if (!r?.timestamp) return []

  const closes: (number | null)[] = r.indicators?.quote?.[0]?.close ?? []
  const opens:  (number | null)[] = r.indicators?.quote?.[0]?.open  ?? []
  const vols:   (number | null)[] = r.indicators?.quote?.[0]?.volume ?? []

  const result: YfCandle[] = []
  ;(r.timestamp as number[]).forEach((ts, i) => {
    const c = closes[i]
    if (c == null || c === 0) return
    const d = new Date(ts * 1000)
    result.push({
      date:   `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`,
      open:   opens[i] ?? c,
      close:  c,
      volume: vols[i] ?? 0,
    })
  })
  return result.slice(-days)
}
