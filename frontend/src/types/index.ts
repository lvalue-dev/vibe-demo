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

/** 일별 거래량 바 */
export interface DailyBar {
  date: string
  volume: number
  isUp: boolean
}

/** 기관/외국인/개인 일별 순매수 */
export interface InstitutionalFlow {
  date: string
  institutional: number
  foreign: number
  individual: number
}

/** 기관 유형별 요약 */
export interface InstitutionTypeSummary {
  name: string
  todayFlow: number
  cumFlow: number
}

/** 기관 유형별 일별 순매수 */
export interface InstitutionDailyRow {
  date: string
  금융투자: number
  투신: number
  연기금: number
  보험: number
  은행: number
  기타법인: number
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
  institutionSummary: InstitutionTypeSummary[]
  institutionDaily: InstitutionDailyRow[]
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
