import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { PricePoint } from '../../types'
import { formatPrice } from '../../utils/format'

interface Props {
  data: PricePoint[]
  ma5?: number | null
  ma20?: number | null
}

export default function StockChart({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 bg-gray-50 rounded-lg text-gray-400 text-sm">
        차트 데이터를 수집 중입니다...
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
        <defs>
          <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="time"
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => formatPrice(v)}
          width={70}
        />
        <Tooltip
          formatter={(value: number, name: string) => [
            `₩${formatPrice(value)}`,
            name === 'price' ? '현재가' : name === 'ma5' ? 'MA5' : 'MA20',
          ]}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
        />
        <Legend
          formatter={(value) =>
            value === 'price' ? '현재가' : value === 'ma5' ? 'MA5 (5일)' : 'MA20 (20일)'
          }
          wrapperStyle={{ fontSize: 12 }}
        />
        <Area
          type="monotone"
          dataKey="price"
          stroke="#3b82f6"
          strokeWidth={2}
          fill="url(#priceGradient)"
          dot={false}
        />
        {data.some((d) => d.ma5) && (
          <Area
            type="monotone"
            dataKey="ma5"
            stroke="#f59e0b"
            strokeWidth={1.5}
            fill="none"
            dot={false}
            strokeDasharray="4 2"
          />
        )}
        {data.some((d) => d.ma20) && (
          <Area
            type="monotone"
            dataKey="ma20"
            stroke="#8b5cf6"
            strokeWidth={1.5}
            fill="none"
            dot={false}
            strokeDasharray="4 2"
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  )
}
