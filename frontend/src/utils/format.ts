import type { Recommendation, RiskLevel } from '../types'

const isKoreanMarket = (market: string) => market === 'KOSPI' || market === 'KOSDAQ'

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('ko-KR').format(Math.round(price))
}

/** 시장에 따라 통화 기호를 붙여 가격을 포맷합니다. KOSPI/KOSDAQ → ₩, 그 외 → $ */
export function formatPriceWithCurrency(price: number, market: string): string {
  if (isKoreanMarket(market)) {
    return `₩${new Intl.NumberFormat('ko-KR').format(Math.round(price))}`
  }
  return `$${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(price)}`
}

export function formatChange(rate: number): string {
  const pct = (rate * 100).toFixed(2)
  return rate >= 0 ? `+${pct}%` : `${pct}%`
}

export function formatVolume(vol: number): string {
  if (vol >= 1_000_000) return (vol / 1_000_000).toFixed(1) + 'M'
  if (vol >= 1_000) return (vol / 1_000).toFixed(0) + 'K'
  return String(vol)
}

export function formatFlow(v: number, market: string): string {
  const isKR = market === 'KOSPI' || market === 'KOSDAQ'
  const sign = v >= 0 ? '+' : ''
  const abs = Math.abs(v)
  if (isKR) {
    if (abs >= 1e12) return `${sign}${(v / 1e12).toFixed(1)}조`
    if (abs >= 1e8)  return `${sign}${(v / 1e8).toFixed(0)}억`
    if (abs >= 1e4)  return `${sign}${(v / 1e4).toFixed(0)}만`
    return `${sign}${Math.round(v)}`
  }
  if (abs >= 1e9) return `${sign}$${(v / 1e9).toFixed(1)}B`
  if (abs >= 1e6) return `${sign}$${(v / 1e6).toFixed(0)}M`
  if (abs >= 1e3) return `${sign}$${(v / 1e3).toFixed(0)}K`
  return `${sign}$${Math.round(v)}`
}

export const RECOMMENDATION_COLORS: Record<Recommendation, string> = {
  STRONG_BUY: '#16a34a',
  BUY: '#22c55e',
  HOLD: '#f59e0b',
  SELL: '#ef4444',
}

export const RECOMMENDATION_BG: Record<Recommendation, string> = {
  STRONG_BUY: '#dcfce7',
  BUY: '#f0fdf4',
  HOLD: '#fef3c7',
  SELL: '#fee2e2',
}

export function formatReturnRate(rate: number): string {
  const pct = (rate * 100).toFixed(2)
  return rate >= 0 ? `+${pct}%` : `${pct}%`
}

export const RISK_COLORS: Record<RiskLevel, string> = {
  LOW: '#16a34a',
  MEDIUM: '#f59e0b',
  HIGH: '#ef4444',
}
