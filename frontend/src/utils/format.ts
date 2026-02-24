import type { Recommendation, RiskLevel } from '../types'

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('ko-KR').format(Math.round(price))
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
