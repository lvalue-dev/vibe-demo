export type Recommendation = 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL'
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH'

export interface StockListItem {
  symbol: string
  name: string
  market: string
  currentPrice: number
  priceChangeRate: number
  volume: number
  recommendation: Recommendation | null
  recommendationLabel: string
  score: number | null
  risk: RiskLevel | null
  riskLabel: string
  analyzedAt: string | null
}

export interface PricePoint {
  time: string
  price: number
  ma5?: number
  ma20?: number
  volume: number
}

export interface StockDetail {
  symbol: string
  name: string
  market: string
  sector: string
  currentPrice: number
  prevClose: number
  priceChangeRate: number
  volume: number
  score: number | null
  recommendation: Recommendation | null
  recommendationLabel: string
  risk: RiskLevel | null
  riskLabel: string
  reasons: string[]
  ma5: number | null
  ma20: number | null
  volumeRatio: number | null
  chartData: PricePoint[]
  analyzedAt: string | null
}

export interface Analysis {
  score: number
  recommendation: Recommendation
  recommendationLabel: string
  risk: RiskLevel
  riskLabel: string
  reasons: string[]
  ma5: number | null
  ma20: number | null
  volumeRatio: number | null
  priceChangeRate: number | null
  analyzedAt: string
}

export interface WatchlistItem {
  id: number
  symbol: string
  name: string
  market: string
  currentPrice: number
  priceChangeRate: number
  recommendation: Recommendation | null
  recommendationLabel: string
  score: number | null
  risk: RiskLevel | null
  riskLabel: string
  addedAt: string
}

export interface PortfolioItem {
  id: number
  symbol: string
  name: string
  market: string
  avgPrice: number
  quantity: number
  currentPrice: number
  totalInvested: number
  currentValue: number
  profitLoss: number
  returnRate: number
  recommendation: Recommendation | null
  recommendationLabel: string
  score: number | null
  risk: RiskLevel | null
  riskLabel: string
}

export interface AuthResponse {
  token: string
  email: string
  nickname: string
}
