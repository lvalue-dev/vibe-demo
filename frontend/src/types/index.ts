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

/** 개별 기관 매수/매도 상세 */
export interface InstitutionPlayer {
  name: string        // e.g., '국민연금', '미래에셋증권'
  type: string        // e.g., '연기금', '금융투자'
  buyAmount: number   // 20일 누적 매수
  sellAmount: number  // 20일 누적 매도
  netAmount: number   // 순매수 (+ 매수우세, - 매도우세)
}

/** 시장 전체 순위 1개 항목 */
export interface MarketRankItem {
  symbol: string
  name: string
  market: string
  value: number           // 기관순매수 or 거래량
  priceChangeRate: number
}

/** 시장 동향 랭킹 (홈 화면용) */
export interface MarketTrend {
  instBuyTop5:  MarketRankItem[]  // 기관 순매수 상위 5
  instSellTop5: MarketRankItem[]  // 기관 순매도 상위 5
  volumeTop5:   MarketRankItem[]  // 거래량 상위 5
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
  institutionPlayers: InstitutionPlayer[]
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

/** 기관별 매매동향 - 종목별 데이터 */
export interface InstTypeStockFlow {
  symbol: string
  name: string
  market: string
  buyAmount: number
  sellAmount: number
  netAmount: number
  dailyNet: number[]  // 날짜별 순매수 (20거래일)
}

/** 기관별 매매동향 - 전체 데이터 */
export interface InstitutionalTrendData {
  dates: string[]  // ['02/07', '02/08', ...]
  byType: Record<string, {
    totalDailyNet: number[]       // 날짜별 전 종목 합산 순매수
    stocks: InstTypeStockFlow[]   // 종목별 상세 (순매수 기준 정렬)
  }>
}
