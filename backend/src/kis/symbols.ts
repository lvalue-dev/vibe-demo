/** Yahoo Finance 심볼 → KIS 요청 파라미터 변환 */

export type KisMarket = 'KOSPI' | 'KOSDAQ' | 'NASDAQ' | 'NYSE'
export type KisExchange = 'NAS' | 'NYS' | 'AMS'

export interface KisSymbolInfo {
  type: 'domestic' | 'overseas'
  code: string          // KIS에서 쓰는 코드 (6자리 or 티커)
  exchange?: KisExchange
  market: KisMarket
}

// NASDAQ 상장 종목 (우리 앱에 포함된 것들)
const NASDAQ_SET = new Set([
  'AAPL', 'MSFT', 'NVDA', 'GOOGL', 'GOOG', 'META', 'AMZN', 'TSLA',
  'AVGO', 'ADBE', 'ASML', 'QCOM', 'NFLX', 'INTC', 'AMD', 'COST',
  'PYPL', 'SBUX', 'TXN', 'AMAT', 'ADI', 'MU', 'REGN', 'LRCX',
])

// NYSE 상장 종목
const NYSE_SET = new Set([
  'BRK-B', 'V', 'MA', 'JPM', 'WMT', 'XOM', 'JNJ', 'PG',
  'UNH', 'HD', 'BAC', 'KO', 'WFC', 'MRK', 'CVX', 'ABBV',
  'PM', 'TMO', 'NKE', 'MCD',
])

export function parseYfSymbol(sym: string): KisSymbolInfo {
  if (sym.endsWith('.KS')) {
    return { type: 'domestic', code: sym.slice(0, -3), market: 'KOSPI' }
  }
  if (sym.endsWith('.KQ')) {
    return { type: 'domestic', code: sym.slice(0, -3), market: 'KOSDAQ' }
  }
  if (NASDAQ_SET.has(sym)) {
    return { type: 'overseas', code: sym, exchange: 'NAS', market: 'NASDAQ' }
  }
  if (NYSE_SET.has(sym)) {
    return { type: 'overseas', code: sym, exchange: 'NYS', market: 'NYSE' }
  }
  // 기본: NASDAQ 시도
  return { type: 'overseas', code: sym, exchange: 'NAS', market: 'NASDAQ' }
}

/** 장 시간 여부 (KST 기준) */
export function isMarketOpen(market: KisMarket): boolean {
  const now = new Date()
  const kst = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
  const day = kst.getDay()  // 0=일, 6=토
  const hh = kst.getHours()
  const mm = kst.getMinutes()
  const time = hh * 100 + mm

  if (day === 0 || day === 6) return false

  if (market === 'KOSPI' || market === 'KOSDAQ') {
    return time >= 900 && time < 1530
  }
  // US 주식: 한국 시간 23:30~06:00 (서머타임 22:30~05:00)
  return time >= 2330 || time < 600
}
