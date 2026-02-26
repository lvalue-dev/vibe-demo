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

/** 일별 거래량 바 (색상: 상승일=초록, 하락일=빨강) */
export interface DailyBar {
  date: string
  volume: number
  isUp: boolean  // close >= open
}

/** 투자자별 순매수 추이 (추정치) */
export interface InstitutionalFlow {
  date: string
  institutional: number  // 기관 순매수 (양수=매수, 음수=매도)
  foreign: number        // 외국인 순매수
  individual: number     // 개인 순매수
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
  avgVolume5: number | null
  avgVolume20: number | null
  chartData: PricePoint[]
  volumeHistory: DailyBar[]
  institutionalFlow: InstitutionalFlow[]
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
