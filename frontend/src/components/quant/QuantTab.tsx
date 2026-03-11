/**
 * 퀀트 예측 탭
 * RSI / MACD / 볼린저 밴드 + AI 기반 5일 가격 예측
 */
import { useMemo } from 'react'
import {
  BarChart, Bar, Cell, Line, ReferenceLine,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart, Area,
} from 'recharts'
import { runQuantAnalysis } from '../../utils/quant'
import type { PricePoint } from '../../types'
import { formatPriceWithCurrency } from '../../utils/format'

interface Props {
  chartData: PricePoint[]
  currentPrice: number
  market: string
}

// ── RSI 게이지 (수평 바) ──────────────────────────────────────────────────────
function RSIGauge({ value }: { value: number }) {
  const color = value < 30 ? '#16a34a' : value > 70 ? '#dc2626' : '#2563eb'
  const label = value < 30 ? '과매도' : value > 70 ? '과매수' : value < 45 ? '약세' : value > 55 ? '강세' : '중립'
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span>과매도(30)</span>
        <span className="font-bold text-sm" style={{ color }}>{value.toFixed(1)} {label}</span>
        <span>과매수(70)</span>
      </div>
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden relative">
        {/* 색상 구간 */}
        <div className="absolute inset-0 flex">
          <div className="h-full bg-green-100" style={{ width: '30%' }} />
          <div className="h-full bg-gray-100" style={{ width: '40%' }} />
          <div className="h-full bg-red-100"   style={{ width: '30%' }} />
        </div>
        {/* 마커 */}
        <div
          className="absolute top-0 w-3 h-3 rounded-full border-2 border-white shadow"
          style={{ left: `calc(${Math.min(98, Math.max(1, value))}% - 6px)`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

// ── MACD 히스토그램 차트 ──────────────────────────────────────────────────────
function MACDHistogram({ bars }: { bars: { value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={80}>
      <BarChart data={bars} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
        <XAxis hide />
        <YAxis hide />
        <ReferenceLine y={0} stroke="#9ca3af" strokeWidth={1} />
        <Tooltip
          formatter={(v: number) => [v.toFixed(4), 'MACD 히스토그램']}
          contentStyle={{ fontSize: 11 }}
        />
        <Bar dataKey="value" radius={[2, 2, 0, 0]}>
          {bars.map((b, i) => (
            <Cell key={i} fill={b.value >= 0 ? '#16a34a' : '#dc2626'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── 볼린저 밴드 오버레이 차트 ─────────────────────────────────────────────────
function BollingerChart({
  priceData,
  bands,
}: {
  priceData: { time: string; price: number }[]
  bands:     { upper: number; middle: number; lower: number }[]
}) {
  // priceData와 bands를 정렬하여 병합
  const start = priceData.length - bands.length
  const merged = bands.map((b, i) => ({
    time:   priceData[start + i]?.time ?? '',
    price:  priceData[start + i]?.price ?? 0,
    upper:  b.upper,
    middle: b.middle,
    lower:  b.lower,
  }))

  return (
    <ResponsiveContainer width="100%" height={140}>
      <ComposedChart data={merged} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="time" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
        <YAxis
          tick={{ fontSize: 10 }}
          tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)}
          width={40}
          domain={['auto', 'auto']}
        />
        <Tooltip
          contentStyle={{ fontSize: 11 }}
          formatter={(v: number, name: string) => {
            const labels: Record<string, string> = { upper: '상단', middle: '중간(MA20)', lower: '하단', price: '종가' }
            return [v.toLocaleString(), labels[name] ?? name]
          }}
        />
        {/* 밴드 영역 */}
        <Area dataKey="upper"  fill="#dbeafe" stroke="#93c5fd" strokeWidth={1} fillOpacity={0.3} dot={false} />
        <Area dataKey="lower"  fill="#dbeafe" stroke="#93c5fd" strokeWidth={1} fillOpacity={0.0} dot={false} />
        <Line dataKey="middle" stroke="#60a5fa" strokeWidth={1} strokeDasharray="4 2" dot={false} />
        {/* 종가 */}
        <Line dataKey="price"  stroke="#1d4ed8" strokeWidth={2} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

// ── 예측 방향 배지 ────────────────────────────────────────────────────────────
function DirectionBadge({ direction, probability }: { direction: string; probability: number }) {
  const cfg = {
    up:      { label: '▲ 상승 우세', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
    down:    { label: '▼ 하락 우세', bg: 'bg-red-50',   text: 'text-red-600',   border: 'border-red-200' },
    neutral: { label: '→ 횡보 예상', bg: 'bg-gray-50',  text: 'text-gray-600',  border: 'border-gray-200' },
  }[direction] ?? { label: '→ 횡보 예상', bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' }

  return (
    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${cfg.bg} ${cfg.border}`}>
      <span className={`text-lg font-bold ${cfg.text}`}>{cfg.label}</span>
      <span className={`text-sm ${cfg.text} opacity-75`}>신뢰도 {probability}%</span>
    </div>
  )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────
export default function QuantTab({ chartData, currentPrice, market }: Props) {
  const analysis = useMemo(() => {
    const closes = chartData.map(d => d.price)
    const highs  = chartData.map(d => d.high  ?? d.price)
    const lows   = chartData.map(d => d.low   ?? d.price)
    return runQuantAnalysis(closes, highs, lows, currentPrice)
  }, [chartData, currentPrice])

  const { rsi, macd, bollinger, support, resistance, prediction } = analysis
  const fmt = (v: number) => formatPriceWithCurrency(v, market)

  return (
    <div className="space-y-6">

      {/* ── 1. 5일 예측 ── */}
      <div>
        <p className="text-sm font-bold text-gray-800 mb-1">5거래일 가격 예측</p>
        <p className="text-xs text-gray-400 mb-3">기술 지표 종합 분석 · 투자 판단의 참고 자료로만 활용하세요</p>
        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
          <DirectionBadge direction={prediction.direction} probability={prediction.probability} />
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">예상 범위</span>
            <span className="font-bold text-gray-800">
              {fmt(prediction.targetLow)} ~ {fmt(prediction.targetHigh)}
            </span>
          </div>
          {/* 근거 */}
          <ul className="space-y-1 pt-1 border-t border-gray-200">
            {prediction.basis.map((b, i) => (
              <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                <span className="text-blue-400 mt-0.5 shrink-0">•</span>
                {b}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── 2. 지지/저항선 ── */}
      {(support !== null || resistance !== null) && (
        <div>
          <p className="text-sm font-bold text-gray-800 mb-3">지지·저항선 (최근 20거래일)</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-center">
              <p className="text-xs text-green-600 mb-1">지지선</p>
              <p className="font-bold text-green-700">{support !== null ? fmt(support) : '-'}</p>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-center">
              <p className="text-xs text-red-500 mb-1">저항선</p>
              <p className="font-bold text-red-600">{resistance !== null ? fmt(resistance) : '-'}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. RSI ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold text-gray-800">RSI (14일)</p>
          <span className="text-xs text-gray-400">0 ← 과매도 / 과매수 → 100</span>
        </div>
        {rsi !== null
          ? <RSIGauge value={rsi} />
          : <p className="text-xs text-gray-400">데이터 부족 (최소 15일 필요)</p>
        }
      </div>

      {/* ── 4. MACD ── */}
      <div>
        <p className="text-sm font-bold text-gray-800 mb-1">MACD (12/26/9)</p>
        {macd.macd !== null ? (
          <>
            <div className="flex gap-4 text-xs text-gray-500 mb-2">
              <span>MACD <strong className="text-gray-800">{macd.macd?.toFixed(2)}</strong></span>
              <span>시그널 <strong className="text-gray-800">{macd.signal?.toFixed(2)}</strong></span>
              <span className={`font-semibold ${(macd.histogram ?? 0) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                히스토그램 {macd.histogram !== null && macd.histogram >= 0 ? '+' : ''}{macd.histogram?.toFixed(2)}
              </span>
            </div>
            <MACDHistogram bars={macd.historyBars} />
          </>
        ) : (
          <p className="text-xs text-gray-400">데이터 부족 (최소 26일 필요)</p>
        )}
      </div>

      {/* ── 5. 볼린저 밴드 ── */}
      <div>
        <p className="text-sm font-bold text-gray-800 mb-1">볼린저 밴드 (20일, ±2σ)</p>
        {bollinger.upper !== null ? (
          <>
            <div className="flex gap-4 text-xs text-gray-500 mb-2">
              <span>상단 <strong className="text-blue-600">{fmt(bollinger.upper)}</strong></span>
              <span>중간 <strong className="text-gray-700">{bollinger.middle !== null ? fmt(bollinger.middle) : '-'}</strong></span>
              <span>하단 <strong className="text-blue-600">{fmt(bollinger.lower!)}</strong></span>
            </div>
            <BollingerChart priceData={chartData} bands={bollinger.bands} />
          </>
        ) : (
          <p className="text-xs text-gray-400">데이터 부족 (최소 20일 필요)</p>
        )}
      </div>

      {/* 면책 고지 */}
      <p className="text-[11px] text-gray-400 text-center pb-2">
        ※ 본 예측은 기술적 지표 기반 참고 정보입니다. 실제 투자 결과와 다를 수 있으며, 투자 손실의 책임은 본인에게 있습니다.
      </p>
    </div>
  )
}
