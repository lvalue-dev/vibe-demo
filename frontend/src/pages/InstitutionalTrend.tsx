import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
  LineChart, Line, Legend,
} from 'recharts'
import { fetchInstitutionalTrend } from '../api/finnhubApi'
import { formatFlow } from '../utils/format'

type InstType = '금융투자' | '투신' | '연기금' | '보험' | '은행' | '기타법인' | '외국인'
type MarketFilter = 'KOSPI' | 'KOSDAQ' | 'NASDAQ' | 'NYSE'
type ViewMode = 'stocks' | 'trend'
type SortMode = 'buy' | 'sell'

const INST_TYPES: Array<{ key: InstType; color: string; desc: string }> = [
  { key: '연기금',   color: '#10b981', desc: '국민연금·사학연금·공제회' },
  { key: '금융투자', color: '#3b82f6', desc: '증권사·투자은행' },
  { key: '투신',     color: '#8b5cf6', desc: '자산운용사·펀드' },
  { key: '외국인',   color: '#f59e0b', desc: '외국계 기관·헤지펀드' },
  { key: '보험',     color: '#ec4899', desc: '생명보험·손해보험' },
  { key: '은행',     color: '#06b6d4', desc: '시중은행·지방은행' },
  { key: '기타법인', color: '#9ca3af', desc: '기타 법인 투자자' },
]

const MARKETS: Array<{ key: MarketFilter; label: string }> = [
  { key: 'KOSPI',  label: 'KOSPI' },
  { key: 'KOSDAQ', label: 'KOSDAQ' },
  { key: 'NASDAQ', label: 'NASDAQ' },
  { key: 'NYSE',   label: 'NYSE' },
]

export default function InstitutionalTrend() {
  const navigate = useNavigate()
  const [instType, setInstType]   = useState<InstType>('연기금')
  const [market, setMarket]       = useState<MarketFilter>('KOSPI')
  const [view, setView]           = useState<ViewMode>('stocks')
  const [sortMode, setSortMode]   = useState<SortMode>('buy')
  const [dateRange, setDateRange] = useState(20)

  const { data, isLoading } = useQuery({
    queryKey: ['institutional_trend'],
    queryFn: fetchInstitutionalTrend,
    staleTime: 5 * 60 * 1000,
  })

  const instMeta = INST_TYPES.find(t => t.key === instType)!

  // 선택한 시장으로 필터링
  const filteredStocks = useMemo(() => {
    const stocks = data?.byType[instType]?.stocks ?? []
    return stocks.filter(s => s.market === market)
  }, [data, instType, market])

  // 날짜 범위 슬라이스
  const dates = useMemo(() => (data?.dates ?? []).slice(-dateRange), [data, dateRange])

  // 날짜별 총 순매수 (필터링된 종목만 합산)
  const dailyTotals = useMemo(() => {
    const offset = 20 - dateRange
    return dates.map((date, di) => {
      const total = filteredStocks.reduce((sum, s) => sum + (s.dailyNet[offset + di] ?? 0), 0)
      return { date, net: total }
    })
  }, [filteredStocks, dates, dateRange])

  // 종목별: 날짜 범위에 맞게 순매수 재합산
  const stocksInRange = useMemo(() => {
    const offset = 20 - dateRange
    return filteredStocks
      .map(s => ({
        ...s,
        netAmount:   s.dailyNet.slice(offset).reduce((a, b) => a + b, 0),
        buyAmount:   s.dailyNet.slice(offset).reduce((sum, v) => sum + Math.max(v, 0), 0) +
                     s.buyAmount * (dateRange / 20) * 0.3,  // 매수 추정
        sellAmount:  s.dailyNet.slice(offset).reduce((sum, v) => sum + Math.abs(Math.min(v, 0)), 0) +
                     s.sellAmount * (dateRange / 20) * 0.3,
      }))
      .sort(sortMode === 'buy'
        ? (a, b) => b.netAmount - a.netAmount
        : (a, b) => a.netAmount - b.netAmount)
      .slice(0, 15)
  }, [filteredStocks, sortMode, dateRange])

  const maxAbsNet = Math.max(...stocksInRange.map(s => Math.abs(s.netAmount)), 1)

  // 20일 추이: 상위 5종목 + 전체합계 라인차트용
  const topStocksForChart = useMemo(() => {
    const offset = 20 - dateRange
    return filteredStocks.slice(0, 5).map(s => ({
      name: s.name,
      data: s.dailyNet.slice(offset),
    }))
  }, [filteredStocks, dateRange])

  const lineColors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']

  // 라인차트 데이터: 날짜 × (total + 상위5종목)
  const lineData = useMemo(() => dates.map((date, di) => {
    const offset = 20 - dateRange
    const row: Record<string, number | string> = { date }
    topStocksForChart.forEach(s => { row[s.name] = s.data[di] ?? 0 })
    row['전체합계'] = filteredStocks.reduce((sum, s) => sum + (s.dailyNet[offset + di] ?? 0), 0)
    return row
  }), [topStocksForChart, filteredStocks, dates, dateRange])

  const cumNet = dailyTotals.reduce((a, b) => a + b.net, 0)

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* 뒤로 가기 */}
      <button
        onClick={() => navigate(-1)}
        className="text-sm text-gray-500 hover:text-gray-700 mb-4 flex items-center gap-1"
      >
        ← 돌아가기
      </button>

      {/* 헤더 */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">기관별 매매동향</h1>
        <p className="text-sm text-gray-500">날짜별 매수·매도 현황과 종목별 순매수 추이</p>
      </div>

      {/* 기관 유형 탭 */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">기관 유형</p>
        <div className="flex flex-wrap gap-2">
          {INST_TYPES.map(({ key, color, desc }) => (
            <button
              key={key}
              onClick={() => setInstType(key)}
              title={desc}
              className={`text-sm px-3 py-1.5 rounded-full border font-semibold transition-all ${
                instType === key
                  ? 'text-white border-transparent shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
              style={instType === key ? { backgroundColor: color, borderColor: color } : {}}
            >
              {key}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">{instMeta.desc}</p>
      </div>

      {/* 마켓 필터 + 기간 */}
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {MARKETS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setMarket(key)}
              className={`text-xs px-3 py-1.5 rounded-md font-semibold transition-all ${
                market === key ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 ml-auto">
          {[5, 10, 20].map(d => (
            <button
              key={d}
              onClick={() => setDateRange(d)}
              className={`text-xs px-3 py-1.5 rounded-md font-semibold transition-all ${
                dateRange === d ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {d}일
            </button>
          ))}
        </div>
      </div>

      {/* 요약 카드 */}
      {!isLoading && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className={`rounded-xl border p-3 ${cumNet >= 0 ? 'border-blue-100 bg-blue-50' : 'border-red-100 bg-red-50'}`}>
            <p className="text-[11px] text-gray-400 mb-1">{dateRange}일 누적 순매수</p>
            <p className={`text-base font-bold ${cumNet >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
              {formatFlow(cumNet, market)}
            </p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
            <p className="text-[11px] text-gray-400 mb-1">일평균 순매수</p>
            <p className={`text-base font-bold ${cumNet / dateRange >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
              {formatFlow(Math.round(cumNet / dateRange), market)}
            </p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
            <p className="text-[11px] text-gray-400 mb-1">조회 종목수</p>
            <p className="text-base font-bold text-gray-800">{filteredStocks.length}개</p>
          </div>
        </div>
      )}

      {/* 뷰 전환 탭 */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-4">
        {[
          { key: 'stocks' as ViewMode, label: '종목별 현황' },
          { key: 'trend'  as ViewMode, label: '날짜별 추이' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={`flex-1 text-sm font-semibold py-2 rounded-lg transition-all ${
              view === key ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">

        {isLoading && (
          <div className="text-center py-12 text-gray-400">
            <div className="text-2xl mb-2 animate-spin">⟳</div>
            <p className="text-sm">데이터 생성 중...</p>
          </div>
        )}

        {/* ── 종목별 현황 ── */}
        {!isLoading && view === 'stocks' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-bold text-gray-800">{instType} 종목별 매매 현황</p>
                <p className="text-xs text-gray-400">{market} · {dateRange}거래일 누적 · 순매수 기준</p>
              </div>
              {/* 순매수/순매도 토글 */}
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setSortMode('buy')}
                  className={`text-xs px-3 py-1 rounded-md font-semibold transition-all ${
                    sortMode === 'buy' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
                  }`}
                >
                  순매수↑
                </button>
                <button
                  onClick={() => setSortMode('sell')}
                  className={`text-xs px-3 py-1 rounded-md font-semibold transition-all ${
                    sortMode === 'sell' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500'
                  }`}
                >
                  순매도↑
                </button>
              </div>
            </div>

            {/* 헤더 */}
            <div className="grid grid-cols-[1.5rem_1fr_auto_auto_auto] gap-x-2 px-2 pb-1.5 border-b border-gray-100 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
              <span>#</span>
              <span>종목</span>
              <span className="text-right">매수</span>
              <span className="text-right">매도</span>
              <span className="text-right">순매수</span>
            </div>

            <div className="divide-y divide-gray-50">
              {stocksInRange.map((s, i) => {
                const isPos = s.netAmount >= 0
                const barPct = (Math.abs(s.netAmount) / maxAbsNet) * 100
                return (
                  <div
                    key={s.symbol}
                    className="grid grid-cols-[1.5rem_1fr_auto_auto_auto] gap-x-2 items-center px-2 py-2.5 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                    onClick={() => navigate(`/stocks/${s.symbol}`)}
                  >
                    <span className="text-xs text-gray-300 font-mono">{i + 1}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <p className="text-sm font-semibold text-gray-800 truncate">{s.name}</p>
                        <span className="text-[9px] px-1 py-0.5 rounded bg-gray-100 text-gray-400 shrink-0">{s.market}</span>
                      </div>
                      {/* 미니 바 */}
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden w-full max-w-[120px]">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${barPct}%`,
                            backgroundColor: isPos ? instMeta.color : '#ef4444',
                            opacity: 0.7,
                          }}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-blue-500 font-medium text-right whitespace-nowrap">
                      {formatFlow(s.buyAmount, market)}
                    </span>
                    <span className="text-xs text-red-400 font-medium text-right whitespace-nowrap">
                      {formatFlow(-s.sellAmount, market)}
                    </span>
                    <span className={`text-xs font-bold text-right whitespace-nowrap ${isPos ? 'text-blue-700' : 'text-red-600'}`}>
                      {formatFlow(s.netAmount, market)}
                    </span>
                  </div>
                )
              })}
            </div>

            <p className="text-[10px] text-gray-400 text-right mt-3">
              * 거래량·가격 기반 추정치. 실제 기관 신고 데이터와 다를 수 있음.
            </p>
          </div>
        )}

        {/* ── 날짜별 추이 ── */}
        {!isLoading && view === 'trend' && (
          <div className="space-y-6">
            {/* 일별 순매수 바차트 */}
            <div>
              <p className="text-sm font-bold text-gray-800 mb-1">{instType} 일별 순매수</p>
              <p className="text-xs text-gray-400 mb-4">{market} 전 종목 합산 · 파란색=순매수, 빨간색=순매도</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dailyTotals} margin={{ top: 5, right: 10, left: 5, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} interval="preserveStartEnd" />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => formatFlow(v, market)}
                    width={72}
                  />
                  <Tooltip
                    formatter={(v: number) => [formatFlow(v, market), '순매수']}
                    contentStyle={{ fontSize: 11, borderRadius: 8 }}
                  />
                  <ReferenceLine y={0} stroke="#e5e7eb" strokeWidth={1.5} />
                  <Bar dataKey="net" radius={[3, 3, 0, 0]}>
                    {dailyTotals.map((entry, i) => (
                      <Cell key={i} fill={entry.net >= 0 ? instMeta.color : '#ef4444'} opacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* 상위 5종목 라인차트 */}
            <div>
              <p className="text-sm font-bold text-gray-800 mb-1">상위 5종목 순매수 추이</p>
              <p className="text-xs text-gray-400 mb-4">순매수 상위 5개 종목 개별 동향</p>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={lineData} margin={{ top: 5, right: 10, left: 5, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} interval="preserveStartEnd" />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => formatFlow(v, market)}
                    width={72}
                  />
                  <Tooltip
                    formatter={(v: number, name: string) => [formatFlow(v, market), name]}
                    contentStyle={{ fontSize: 11, borderRadius: 8 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <ReferenceLine y={0} stroke="#e5e7eb" strokeWidth={1.5} />
                  {topStocksForChart.map((s, i) => (
                    <Line
                      key={s.name}
                      type="monotone"
                      dataKey={s.name}
                      stroke={lineColors[i % lineColors.length]}
                      strokeWidth={1.8}
                      dot={false}
                      activeDot={{ r: 3 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* 날짜별 표 */}
            <div>
              <p className="text-sm font-bold text-gray-800 mb-3">날짜별 순매수 상세</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400">
                      <th className="text-left py-1.5 pr-3 font-semibold">날짜</th>
                      <th className="text-right py-1.5 font-semibold">순매수</th>
                      <th className="text-right py-1.5 pl-3 font-semibold">누적</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {[...dailyTotals].reverse().map((row, i, arr) => {
                      const cum = arr.slice(i).reduce((s, r) => s + r.net, 0)
                      return (
                        <tr key={row.date} className="hover:bg-gray-50">
                          <td className="py-1.5 pr-3 text-gray-500 font-mono">{row.date}</td>
                          <td className={`py-1.5 text-right font-semibold ${row.net >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                            {formatFlow(row.net, market)}
                          </td>
                          <td className={`py-1.5 pl-3 text-right font-medium ${cum >= 0 ? 'text-blue-500' : 'text-red-400'}`}>
                            {formatFlow(cum, market)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <p className="text-[10px] text-gray-400 text-right">
              * 거래량·가격 기반 추정치. 실제 기관 신고 데이터와 다를 수 있음.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
