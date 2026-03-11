/**
 * 퀀트 기술 지표 계산 유틸리티
 * 순수 JS로 구현 — 외부 라이브러리 불필요
 */

// ── EMA (지수이동평균) ─────────────────────────────────────────────────────────
function calcEMA(values: number[], period: number): number[] {
  if (values.length === 0) return []
  const k = 2 / (period + 1)
  const ema: number[] = [values[0]]
  for (let i = 1; i < values.length; i++) {
    ema.push(values[i] * k + ema[i - 1] * (1 - k))
  }
  return ema
}

// ── RSI (상대강도지수, 기본 14일) ─────────────────────────────────────────────
export function calcRSI(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null
  let gains = 0, losses = 0
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1]
    if (diff > 0) gains += diff
    else losses -= diff
  }
  const avgGain = gains / period
  const avgLoss = losses / period
  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return parseFloat((100 - 100 / (1 + rs)).toFixed(2))
}

// ── MACD (12/26/9) ────────────────────────────────────────────────────────────
export interface MACDResult {
  macd: number | null
  signal: number | null
  histogram: number | null
  /** 최근 9일 히스토그램 (차트용) */
  historyBars: { value: number }[]
}
export function calcMACD(closes: number[]): MACDResult {
  if (closes.length < 26) return { macd: null, signal: null, histogram: null, historyBars: [] }
  const ema12 = calcEMA(closes, 12)
  const ema26 = calcEMA(closes, 26)
  // ema26이 유효해지는 25번 인덱스부터 macdLine 계산
  const macdLine = closes.map((_, i) => ema12[i] - ema26[i]).slice(25)
  if (macdLine.length < 1) return { macd: null, signal: null, histogram: null, historyBars: [] }

  const signalLine = calcEMA(macdLine, 9)
  const histLine   = macdLine.map((m, i) => m - signalLine[i])

  const last    = macdLine.length - 1
  const macd    = parseFloat(macdLine[last].toFixed(4))
  const signal  = parseFloat(signalLine[last].toFixed(4))
  const histogram = parseFloat(histLine[last].toFixed(4))
  const historyBars = histLine.slice(-20).map(v => ({ value: parseFloat(v.toFixed(4)) }))

  return { macd, signal, histogram, historyBars }
}

// ── 볼린저 밴드 (기본 20일, ±2σ) ─────────────────────────────────────────────
export interface BollingerResult {
  upper: number | null
  middle: number | null
  lower: number | null
  /** 최근 30일 밴드 데이터 (차트 오버레이용) */
  bands: { upper: number; middle: number; lower: number }[]
}
export function calcBollinger(closes: number[], period = 20): BollingerResult {
  if (closes.length < period) return { upper: null, middle: null, lower: null, bands: [] }

  const bands: { upper: number; middle: number; lower: number }[] = []
  for (let i = period - 1; i < closes.length; i++) {
    const slice  = closes.slice(i - period + 1, i + 1)
    const mean   = slice.reduce((a, b) => a + b, 0) / period
    const std    = Math.sqrt(slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period)
    bands.push({
      upper:  parseFloat((mean + 2 * std).toFixed(2)),
      middle: parseFloat(mean.toFixed(2)),
      lower:  parseFloat((mean - 2 * std).toFixed(2)),
    })
  }

  const last = bands[bands.length - 1]
  return { upper: last.upper, middle: last.middle, lower: last.lower, bands: bands.slice(-30) }
}

// ── 지지/저항선 (최근 20일 고/저점 클러스터) ──────────────────────────────────
export function findSupportResistance(
  highs: number[],
  lows: number[]
): { support: number; resistance: number } {
  const h = highs.slice(-20)
  const l = lows.slice(-20)
  return {
    resistance: Math.max(...h),
    support:    Math.min(...l),
  }
}

// ── 선형 회귀 기울기 (최근 N일 종가 트렌드) ──────────────────────────────────
export function calcTrendSlope(closes: number[], n = 10): number | null {
  if (closes.length < n) return null
  const recent = closes.slice(-n)
  const sumX   = (n * (n - 1)) / 2
  const sumY   = recent.reduce((a, b) => a + b, 0)
  const sumXY  = recent.reduce((a, b, i) => a + b * i, 0)
  const sumX2  = recent.reduce((a, _, i) => a + i * i, 0)
  return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
}

// ── 가격 예측 (기술 신호 종합) ────────────────────────────────────────────────
export interface PredictionResult {
  direction: 'up' | 'down' | 'neutral'
  probability: number       // 0~100 (방향 신뢰도)
  targetLow:  number
  targetHigh: number
  basis: string[]           // 각 신호 설명 (한국어)
}

export function predictPrice(
  currentPrice: number,
  closes: number[],
  rsi: number | null,
  macdHistogram: number | null,
  bollinger: BollingerResult,
): PredictionResult {
  let score = 0
  let signals = 0
  const basis: string[] = []

  // RSI 신호
  if (rsi !== null) {
    signals++
    if (rsi < 30)       { score++; basis.push(`RSI ${rsi.toFixed(1)} — 과매도 구간, 반등 가능성`) }
    else if (rsi < 45)  { score += 0.5; basis.push(`RSI ${rsi.toFixed(1)} — 약세권 하단, 회복 대기`) }
    else if (rsi > 70)  { score--; basis.push(`RSI ${rsi.toFixed(1)} — 과매수 구간, 조정 가능성`) }
    else if (rsi > 55)  { score += 0.5; basis.push(`RSI ${rsi.toFixed(1)} — 강세 유지 중`) }
    else                 { basis.push(`RSI ${rsi.toFixed(1)} — 중립 구간`) }
  }

  // MACD 히스토그램 신호
  if (macdHistogram !== null) {
    signals++
    if (macdHistogram > 0)  { score++; basis.push('MACD 양(+) — 상승 모멘텀 유지') }
    else                     { score--; basis.push('MACD 음(−) — 하락 압력 우세') }
  }

  // 볼린저 밴드 위치
  if (bollinger.lower !== null && bollinger.upper !== null && bollinger.middle !== null) {
    signals++
    const range = bollinger.upper - bollinger.lower
    if (range > 0) {
      const pct = (currentPrice - bollinger.lower) / range
      if (pct < 0.2)      { score++; basis.push('볼린저 하단 근접 — 기술적 지지 구간') }
      else if (pct > 0.8) { score--; basis.push('볼린저 상단 근접 — 과매수 경계') }
      else                 { basis.push(`볼린저 중간 위치 (${(pct * 100).toFixed(0)}%)`) }
    }
  }

  // 트렌드 기울기 (10일)
  const slope = calcTrendSlope(closes, 10)
  if (slope !== null) {
    signals++
    const slopePct = (slope / currentPrice) * 100
    if (slopePct > 0.3)       { score++; basis.push(`10일 추세 상향 (+${slopePct.toFixed(2)}%/일)`) }
    else if (slopePct < -0.3) { score--; basis.push(`10일 추세 하향 (${slopePct.toFixed(2)}%/일)`) }
    else                       { basis.push(`10일 추세 횡보 (${slopePct.toFixed(2)}%/일)`) }
  }

  if (signals === 0) {
    return {
      direction: 'neutral', probability: 50,
      targetLow:  Math.round(currentPrice * 0.97),
      targetHigh: Math.round(currentPrice * 1.03),
      basis: ['데이터 부족 — 지표 계산 불가'],
    }
  }

  const normalizedScore = score / signals  // -1 ~ +1

  // 일별 변동성 (최근 20일 평균 절대 변화율)
  const dailyVolatility = closes.length >= 2
    ? closes.slice(-20).reduce((acc, c, i, arr) => {
        if (i === 0) return acc
        return acc + Math.abs(c - arr[i - 1]) / arr[i - 1]
      }, 0) / Math.min(19, closes.length - 1)
    : 0.015

  const direction: PredictionResult['direction'] =
    normalizedScore > 0.2 ? 'up' : normalizedScore < -0.2 ? 'down' : 'neutral'

  // 5거래일 기대 범위
  const expectedMove = currentPrice * dailyVolatility * Math.sqrt(5)
  const center = direction === 'up'   ? currentPrice * (1 + dailyVolatility * 2) :
                 direction === 'down' ? currentPrice * (1 - dailyVolatility * 2) :
                 currentPrice

  const probability = Math.min(85, Math.max(50, Math.round(50 + Math.abs(normalizedScore) * 35)))

  return {
    direction,
    probability,
    targetLow:  Math.round(center - expectedMove),
    targetHigh: Math.round(center + expectedMove),
    basis,
  }
}

// ── 전체 퀀트 분석 (단일 진입점) ──────────────────────────────────────────────
export interface QuantAnalysis {
  rsi:         number | null
  macd:        MACDResult
  bollinger:   BollingerResult
  support:     number | null
  resistance:  number | null
  prediction:  PredictionResult
}

export function runQuantAnalysis(
  closes:  number[],
  highs:   number[],
  lows:    number[],
  currentPrice: number,
): QuantAnalysis {
  const rsi       = calcRSI(closes)
  const macd      = calcMACD(closes)
  const bollinger = calcBollinger(closes)

  const { support, resistance } = (highs.length > 0 && lows.length > 0)
    ? findSupportResistance(highs, lows)
    : { support: null, resistance: null }

  const prediction = predictPrice(currentPrice, closes, rsi, macd.histogram, bollinger)

  return { rsi, macd, bollinger, support, resistance, prediction }
}
