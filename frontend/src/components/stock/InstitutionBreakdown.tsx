import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts'
import type { InstitutionTypeSummary, InstitutionDailyRow } from '../../types'
import { formatFlow } from '../../utils/format'

interface Props {
  summary: InstitutionTypeSummary[]
  daily: InstitutionDailyRow[]
  market: string
}

const TYPE_META: Record<string, { color: string; desc: string }> = {
  '금융투자': { color: '#3b82f6', desc: '증권사·투자은행' },
  '투신':     { color: '#8b5cf6', desc: '뮤추얼펀드·자산운용' },
  '연기금':   { color: '#10b981', desc: '국민연금·공제회 등' },
  '보험':     { color: '#f59e0b', desc: '생명보험·손해보험' },
  '은행':     { color: '#ec4899', desc: '시중은행·지방은행' },
  '기타법인': { color: '#9ca3af', desc: '기타 법인 투자자' },
}

export default function InstitutionBreakdown({ summary, daily, market }: Props) {
  if (!summary.length) return null

  // cumFlow 절대값 기준 최대치 (bar 비율 계산)
  const maxAbs = Math.max(...summary.map(s => Math.abs(s.cumFlow)), 1)

  // cumFlow 기준 내림차순 정렬
  const sorted = [...summary].sort((a, b) => b.cumFlow - a.cumFlow)

  return (
    <div className="space-y-6">
      {/* ── 기관 유형별 순매수 표 ── */}
      <div>
        <p className="text-xs font-semibold text-gray-600 mb-4">기관 유형별 순매수 (20일 누적)</p>
        <div className="space-y-3">
          {sorted.map(({ name, todayFlow, cumFlow }) => {
            const meta = TYPE_META[name]
            const barPct = (Math.abs(cumFlow) / maxAbs) * 100
            const isPos = cumFlow >= 0
            const isTodayPos = todayFlow >= 0
            return (
              <div key={name}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: meta.color }}
                    />
                    <span className="text-sm font-semibold text-gray-800">{name}</span>
                    <span className="text-[10px] text-gray-400 hidden sm:inline">{meta.desc}</span>
                  </div>
                  <div className="text-right leading-tight">
                    <p className={`text-sm font-bold ${isPos ? 'text-blue-600' : 'text-red-500'}`}>
                      {formatFlow(cumFlow, market)}
                    </p>
                    <p className={`text-[11px] ${isTodayPos ? 'text-green-600' : 'text-red-500'}`}>
                      오늘 {formatFlow(todayFlow, market)}
                    </p>
                  </div>
                </div>
                {/* Bar track */}
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${barPct}%`,
                      backgroundColor: meta.color,
                      opacity: 0.75,
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── 기관 유형별 20일 추이 ── */}
      <div>
        <p className="text-xs font-semibold text-gray-600 mb-3">기관 유형별 추이 (20거래일)</p>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={daily} margin={{ top: 5, right: 10, left: 5, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => formatFlow(v, market)}
              width={64}
            />
            <Tooltip
              formatter={(v: number, name: string) => [formatFlow(v, market), name]}
              contentStyle={{ fontSize: 11, borderRadius: 8 }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <ReferenceLine y={0} stroke="#e5e7eb" strokeWidth={1.5} />
            {Object.entries(TYPE_META).map(([type, { color }]) => (
              <Line
                key={type}
                type="monotone"
                dataKey={type}
                stroke={color}
                strokeWidth={1.8}
                dot={false}
                activeDot={{ r: 3 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
