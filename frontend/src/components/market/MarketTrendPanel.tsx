import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchMarketTrend } from '../../api/finnhubApi'
import { formatFlow, formatVolume } from '../../utils/format'
import type { MarketRankItem } from '../../types'

type RankTab = 'buy' | 'sell' | 'volume'

const TABS: { key: RankTab; label: string; emoji: string }[] = [
  { key: 'buy',    label: '기관 순매수 TOP 5',  emoji: '📈' },
  { key: 'sell',   label: '기관 순매도 TOP 5',  emoji: '📉' },
  { key: 'volume', label: '거래량 TOP 5',       emoji: '🔥' },
]

function RankRow({
  rank, item, valueLabel, valueColor, onClick,
}: {
  rank: number
  item: MarketRankItem
  valueLabel: string
  valueColor: string
  onClick: () => void
}) {
  const isUp = item.priceChangeRate >= 0
  const pct = (item.priceChangeRate * 100).toFixed(2)
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left group"
    >
      {/* 순위 */}
      <span className={`text-base font-black w-5 shrink-0 ${rank <= 3 ? 'text-blue-500' : 'text-gray-300'}`}>
        {rank}
      </span>
      {/* 종목 정보 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
            {item.name}
          </p>
          <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded shrink-0">
            {item.market}
          </span>
        </div>
        <p className="text-[11px] text-gray-400 truncate">{item.symbol}</p>
      </div>
      {/* 수치 */}
      <div className="text-right shrink-0">
        <p className={`text-sm font-bold ${valueColor}`}>{valueLabel}</p>
        <p className={`text-xs font-semibold ${isUp ? 'text-green-600' : 'text-red-500'}`}>
          {isUp ? '+' : ''}{pct}%
        </p>
      </div>
    </button>
  )
}

export default function MarketTrendPanel() {
  const [tab, setTab] = useState<RankTab>('buy')
  const navigate = useNavigate()

  const { data: trend, isLoading } = useQuery({
    queryKey: ['marketTrend'],
    queryFn: fetchMarketTrend,
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  })

  const activeTab = TABS.find(t => t.key === tab)!

  const renderList = () => {
    if (!trend) return null

    if (tab === 'buy') {
      return trend.instBuyTop5.map((item, i) => (
        <RankRow
          key={item.symbol} rank={i + 1} item={item}
          valueLabel={formatFlow(item.value, item.market)}
          valueColor="text-blue-600"
          onClick={() => navigate(`/stocks/${item.symbol}`)}
        />
      ))
    }
    if (tab === 'sell') {
      return trend.instSellTop5.map((item, i) => (
        <RankRow
          key={item.symbol} rank={i + 1} item={item}
          valueLabel={formatFlow(item.value, item.market)}
          valueColor="text-red-500"
          onClick={() => navigate(`/stocks/${item.symbol}`)}
        />
      ))
    }
    // volume
    return trend.volumeTop5.map((item, i) => (
      <RankRow
        key={item.symbol} rank={i + 1} item={item}
        valueLabel={formatVolume(item.value)}
        valueColor="text-orange-500"
        onClick={() => navigate(`/stocks/${item.symbol}`)}
      />
    ))
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-gray-900">오늘의 시장 동향</h2>
        <span className="text-[10px] text-gray-400">추정치 · 1분 갱신</span>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-3">
        {TABS.map(({ key, label, emoji }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 text-xs font-semibold py-1.5 rounded-md transition-all whitespace-nowrap ${
              tab === key ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="hidden sm:inline">{emoji} </span>{label.replace('TOP 5', '').trim()}
            <span className="hidden sm:inline"> TOP 5</span>
            <span className="sm:hidden"> TOP5</span>
          </button>
        ))}
      </div>

      {/* 제목 */}
      <p className="text-xs font-semibold text-gray-500 mb-1 px-3">
        {activeTab.emoji} {activeTab.label}
      </p>

      {/* 목록 */}
      {isLoading ? (
        <div className="text-center py-6 text-gray-400 text-sm">불러오는 중...</div>
      ) : (
        <div className="space-y-0.5">{renderList()}</div>
      )}
    </div>
  )
}
