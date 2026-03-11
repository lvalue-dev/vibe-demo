/**
 * 가격 분석 엔진 — backend/src/analysis.ts 와 동일한 로직
 * (프론트엔드에서 Yahoo Finance 데이터를 직접 분석할 때 사용)
 */

export type Recommendation = 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL'
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH'

function calcMA(prices: number[], period: number): number | null {
  if (prices.length < period) return null
  return prices.slice(-period).reduce((a, b) => a + b, 0) / period
}

function calcVolatility(prices: number[]): number {
  if (prices.length < 2) return 0
  const returns = prices.slice(1).map((p, i) => (p - prices[i]) / prices[i])
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length
  return Math.sqrt(returns.reduce((s, r) => s + (r - mean) ** 2, 0) / returns.length)
}

export interface AnalysisResult {
  score: number
  recommendation: Recommendation
  recommendationLabel: string
  risk: RiskLevel
  riskLabel: string
  reasons: string[]
  ma5: number | null
  ma20: number | null
  volumeRatio: number | null
  avgVolume5: number | null
  avgVolume20: number | null
}

export function analyze(
  closes: number[],
  volumes: number[],
  currentPrice: number,
  priceChangeRate: number
): AnalysisResult {
  const ma5  = calcMA(closes, 5)
  const ma20 = calcMA(closes, 20)
  const volatility = calcVolatility(closes.slice(-10))

  const avgVolume5  = volumes.length >= 5  ? volumes.slice(-5).reduce((a, b)  => a + b, 0) / 5  : null
  const avgVolume20 = volumes.length >= 20 ? volumes.slice(-20).reduce((a, b) => a + b, 0) / 20 : null
  const todayVol    = volumes[volumes.length - 1] ?? null
  const volumeRatio = todayVol && avgVolume20 ? todayVol / avgVolume20 : null

  let score = 0
  const reasons: string[] = []

  if (ma20 && currentPrice < ma20) {
    score += 20
    reasons.push(`현재 가격이 20일 평균보다 ${(((ma20 - currentPrice) / ma20) * 100).toFixed(1)}% 낮음 (저평가 구간)`)
  }
  if (ma5 && ma20) {
    if (ma5 > ma20) { score += 20; reasons.push('단기(5일) 이동평균이 장기(20일)를 상회 - 상승 모멘텀') }
    else reasons.push('단기(5일) 이동평균이 장기(20일) 하회 - 하락 추세')
  }
  if (volumeRatio && volumeRatio >= 1.5) {
    score += 20; reasons.push(`거래량이 평균 대비 ${volumeRatio.toFixed(1)}배 증가 - 관심 집중`)
  }
  if (priceChangeRate > 0) { score += 20; reasons.push(`전일 대비 +${(priceChangeRate * 100).toFixed(2)}% 상승 중`) }
  else reasons.push(`전일 대비 ${(priceChangeRate * 100).toFixed(2)}% 하락 중`)

  if (volatility < 0.05) { score += 20; reasons.push('변동성 낮음 - 안정적인 가격 흐름') }
  else reasons.push('변동성 높음 - 단기 급등락 주의')

  const recommendation: Recommendation =
    score >= 80 ? 'STRONG_BUY' : score >= 60 ? 'BUY' : score >= 40 ? 'HOLD' : 'SELL'
  const recommendationLabel =
    score >= 80 ? '강한 매수' : score >= 60 ? '매수 적절' : score >= 40 ? '관망' : '매도'
  const risk: RiskLevel = (score < 40 || volatility >= 0.05) ? 'HIGH' : score < 60 ? 'MEDIUM' : 'LOW'
  const riskLabel = risk === 'HIGH' ? '높음' : risk === 'MEDIUM' ? '보통' : '낮음'

  return {
    score, recommendation, recommendationLabel, risk, riskLabel, reasons,
    ma5, ma20, volumeRatio, avgVolume5, avgVolume20,
  }
}
