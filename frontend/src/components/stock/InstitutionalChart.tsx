import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts'
import type { InstitutionalFlow } from '../../types'
import { formatFlow } from '../../utils/format'

interface Props {
  data: InstitutionalFlow[]
  market: string
}

const INVESTOR_META = [
  { key: 'institutional' as const, label: '기관',   color: '#3b82f6', dot: 'bg-blue-500' },
  { key: 'foreign'      as const, label: '외국인',  color: '#f59e0b', dot: 'bg-amber-400' },
  { key: 'individual'   as const, label: '개인',    color: '#9ca3af', dot: 'bg-gray-400' },
]

export default function InstitutionalChart({ data, market }: Props) {
  if (!data.length) return null

  const today = data[data.length - 1]
  const cumInst = data.reduce((s, d) => s + d.institutional, 0)
  const cumFgn  = data.reduce((s, d) => s + d.foreign, 0)
  const cumInd  = data.reduce((s, d) => s + d.individual, 0)
  const cums    = [cumInst, cumFgn, cumInd]
  const todays  = [today.institutional, today.foreign, today.individual]

  return (
    <div className="space-y-5">
      {/* 요약 카드 3개 */}
      <div className="grid grid-cols-3 gap-3">
        {INVESTOR_META.map(({ key, label, dot }, i) => {
          const t = todays[i]
          const c = cums[i]
          const isPos = t >= 0
          return (
            <div
              key={key}
              className={`rounded-xl border p-3 ${isPos ? 'border-blue-100 bg-blue-50' : 'border-red-100 bg-red-50'}`}
            >
              <div className="flex items-center gap-1.5 mb-2">
                <span className={`w-2.5 h-2.5 rounded-full ${dot}`} />
                <span className="text-xs font-semibold text-gray-700">{label}</span>
              </div>
              <p className={`text-sm font-bold ${isPos ? 'text-blue-700' : 'text-red-600'}`}>
                {formatFlow(t, market)}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">오늘 순매수</p>
              <div className="mt-2 pt-2 border-t border-gray-200/60">
                <p className={`text-xs font-semibold ${c >= 0 ? 'text-gray-700' : 'text-red-500'}`}>
                  {formatFlow(c, market)}
                </p>
                <p className="text-[10px] text-gray-400">20일 누적</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* 꺾은선 추이 */}
      <div>
        <p className="text-xs font-semibold text-gray-600 mb-3">순매수 추이 (20거래일)</p>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data} margin={{ top: 5, right: 10, left: 5, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} interval="preserveStartEnd" />
            <YAxis
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => formatFlow(v, market)}
              width={64}
            />
            <Tooltip
              formatter={(v: number, name: string) => {
                const m = INVESTOR_META.find(x => x.key === name)
                return [formatFlow(v, market), m?.label ?? name]
              }}
              contentStyle={{ fontSize: 11, borderRadius: 8 }}
            />
            <Legend
              formatter={(v) => INVESTOR_META.find(x => x.key === v)?.label ?? v}
              wrapperStyle={{ fontSize: 12 }}
            />
            <ReferenceLine y={0} stroke="#e5e7eb" strokeWidth={1.5} />
            {INVESTOR_META.map(({ key, color }) => (
              <Line key={key} type="monotone" dataKey={key} stroke={color} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p className="text-[10px] text-gray-400 text-right">
        * 거래량·가격 기반 추정치. 실제 기관 신고 데이터와 다를 수 있음.
      </p>
    </div>
  )
}
