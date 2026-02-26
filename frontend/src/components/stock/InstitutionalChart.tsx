import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts'
import type { InstitutionalFlow } from '../../types'

interface Props {
  data: InstitutionalFlow[]
  market: string
}

function formatFlow(v: number, market: string): string {
  const isKR = market === 'KOSPI' || market === 'KOSDAQ'
  const sign = v >= 0 ? '+' : ''
  const abs = Math.abs(v)
  if (isKR) {
    if (abs >= 1e12) return `${sign}${(v / 1e12).toFixed(1)}조`
    if (abs >= 1e8)  return `${sign}${(v / 1e8).toFixed(0)}억`
    if (abs >= 1e4)  return `${sign}${(v / 1e4).toFixed(0)}만`
    return `${sign}${v.toFixed(0)}`
  }
  if (abs >= 1e9) return `${sign}$${(v / 1e9).toFixed(1)}B`
  if (abs >= 1e6) return `${sign}$${(v / 1e6).toFixed(0)}M`
  if (abs >= 1e3) return `${sign}$${(v / 1e3).toFixed(0)}K`
  return `${sign}$${v.toFixed(0)}`
}

const LABELS: Record<string, string> = {
  institutional: '기관',
  foreign: '외국인',
  individual: '개인',
}

// 누적 순매수 합계
function cumulativeSum(data: InstitutionalFlow[], key: keyof Omit<InstitutionalFlow, 'date'>): number {
  return data.reduce((sum, d) => sum + (d[key] as number), 0)
}

export default function InstitutionalChart({ data, market }: Props) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-32 bg-gray-50 rounded-lg text-gray-400 text-sm">
        투자자 데이터 수집 중...
      </div>
    )
  }

  const totalInst = cumulativeSum(data, 'institutional')
  const totalFgn  = cumulativeSum(data, 'foreign')
  const totalInd  = cumulativeSum(data, 'individual')

  return (
    <div>
      {/* 기간 누적 요약 */}
      <div className="flex flex-wrap gap-x-5 gap-y-1 mb-3 text-xs text-gray-600">
        <span className="flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-blue-500" />
          기관&nbsp;
          <strong className={totalInst >= 0 ? 'text-blue-600' : 'text-red-500'}>
            {formatFlow(totalInst, market)}
          </strong>
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-amber-400" />
          외국인&nbsp;
          <strong className={totalFgn >= 0 ? 'text-amber-600' : 'text-red-500'}>
            {formatFlow(totalFgn, market)}
          </strong>
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-gray-400" />
          개인&nbsp;
          <strong className={totalInd >= 0 ? 'text-gray-700' : 'text-red-500'}>
            {formatFlow(totalInd, market)}
          </strong>
        </span>
        <span className="text-gray-400 ml-auto">기간 누적 순매수</span>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barCategoryGap="35%">
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
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
            width={58}
          />
          <Tooltip
            formatter={(v: number, name: string) => [formatFlow(v, market), LABELS[name] ?? name]}
            contentStyle={{ fontSize: 11, borderRadius: 8 }}
          />
          <Legend
            formatter={(v) => LABELS[v] ?? v}
            wrapperStyle={{ fontSize: 12 }}
          />
          <ReferenceLine y={0} stroke="#d1d5db" />
          <Bar dataKey="institutional" fill="#3b82f6" fillOpacity={0.85} radius={[2, 2, 0, 0]} />
          <Bar dataKey="foreign"       fill="#f59e0b" fillOpacity={0.85} radius={[2, 2, 0, 0]} />
          <Bar dataKey="individual"    fill="#9ca3af" fillOpacity={0.85} radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      <p className="text-[10px] text-gray-400 mt-1 text-right">
        * 거래량·가격 데이터 기반 추정치 (실제 기관 신고 데이터와 다를 수 있음)
      </p>
    </div>
  )
}
