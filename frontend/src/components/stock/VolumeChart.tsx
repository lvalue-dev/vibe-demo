import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts'
import type { DailyBar } from '../../types'
import { formatVolume } from '../../utils/format'

interface Props {
  data: DailyBar[]
  todayVolume: number
  avgVolume5: number | null
  avgVolume20: number | null
}

export default function VolumeChart({ data, todayVolume, avgVolume5, avgVolume20 }: Props) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-32 bg-gray-50 rounded-lg text-gray-400 text-sm">
        거래량 데이터 수집 중...
      </div>
    )
  }

  const vs5  = avgVolume5  && avgVolume5  > 0 ? ((todayVolume / avgVolume5  - 1) * 100) : null
  const vs20 = avgVolume20 && avgVolume20 > 0 ? ((todayVolume / avgVolume20 - 1) * 100) : null
  const status =
    vs20 == null ? '' :
    vs20 >= 50  ? '거래량 급증' :
    vs20 >= -20 ? '평균 수준' : '거래량 저조'

  const statusColor =
    status === '거래량 급증' ? 'text-orange-500' :
    status === '거래량 저조' ? 'text-blue-400' : 'text-gray-500'

  return (
    <div>
      {/* 요약 통계 */}
      <div className="flex flex-wrap gap-x-5 gap-y-1 mb-3 text-xs text-gray-600">
        <span>
          오늘&nbsp;
          <strong className="text-gray-900">{formatVolume(todayVolume)}</strong>
        </span>
        {vs5 != null && avgVolume5 != null && (
          <span>
            5일 평균&nbsp;{formatVolume(avgVolume5)}&nbsp;
            <span className={vs5 >= 0 ? 'text-green-600 font-semibold' : 'text-red-500 font-semibold'}>
              ({vs5 >= 0 ? '+' : ''}{vs5.toFixed(0)}%)
            </span>
          </span>
        )}
        {vs20 != null && avgVolume20 != null && (
          <span>
            20일 평균&nbsp;{formatVolume(avgVolume20)}&nbsp;
            <span className={vs20 >= 0 ? 'text-green-600 font-semibold' : 'text-red-500 font-semibold'}>
              ({vs20 >= 0 ? '+' : ''}{vs20.toFixed(0)}%)
            </span>
          </span>
        )}
        {status && <span className={`font-bold ${statusColor}`}>{status}</span>}
      </div>

      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
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
            tickFormatter={formatVolume}
            width={52}
          />
          <Tooltip
            formatter={(v: number) => [formatVolume(v), '거래량']}
            contentStyle={{ fontSize: 11, borderRadius: 8 }}
          />
          {avgVolume20 != null && (
            <ReferenceLine
              y={avgVolume20}
              stroke="#6b7280"
              strokeDasharray="4 2"
              strokeWidth={1.5}
              label={{ value: '20일 평균', position: 'insideTopRight', fontSize: 9, fill: '#6b7280' }}
            />
          )}
          <Bar dataKey="volume" radius={[2, 2, 0, 0]} maxBarSize={18}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.isUp ? '#22c55e' : '#ef4444'} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* 범례 */}
      <div className="flex gap-4 mt-1 justify-end text-xs text-gray-400">
        <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-green-500" />상승일</span>
        <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-red-500" />하락일</span>
        <span className="flex items-center gap-1"><span className="inline-block w-5 border-t border-dashed border-gray-500" />20일 평균</span>
      </div>
    </div>
  )
}
