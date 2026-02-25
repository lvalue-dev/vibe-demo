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

export function formatReturnRate(rate: number): string {
  const pct = (rate * 100).toFixed(2)
  return rate >= 0 ? `+${pct}%` : `${pct}%`
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

export const RISK_COLORS: Record<RiskLevel, string> = {
  LOW: '#16a34a',
  MEDIUM: '#f59e0b',
  HIGH: '#ef4444',
}
