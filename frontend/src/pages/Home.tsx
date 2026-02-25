import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { stockApi } from '../api/stockApi'
import StockCard from '../components/stock/StockCard'
import type { Recommendation } from '../types'

function formatTime(ms: number) {
  if (!ms) return null
  const d = new Date(ms)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
}

const MARKETS = ['전체', 'KOSPI', 'KOSDAQ', 'NASDAQ', 'NYSE']
const RECOMMENDATIONS: Array<{ label: string; value: Recommendation | 'ALL' }> = [
  { label: '전체', value: 'ALL' },
  { label: '강한 매수', value: 'STRONG_BUY' },
  { label: '매수', value: 'BUY' },
  { label: '관망', value: 'HOLD' },
  { label: '매도', value: 'SELL' },
]

export default function Home() {
  const [market, setMarket] = useState('전체')
  const [rec, setRec] = useState<Recommendation | 'ALL'>('ALL')
  const [search, setSearch] = useState('')

  const { data: stocks = [], isLoading, isError, isFetching, dataUpdatedAt } = useQuery({
    queryKey: ['stocks'],
    queryFn: stockApi.getAll,
    staleTime: 30 * 1000,      // 30초 후 stale
    refetchInterval: 30 * 1000, // 30초마다 자동 갱신
    retry: 1,
  })

  const filtered = useMemo(() => {
    return stocks.filter((s) => {
      if (market !== '전체' && s.market !== market) return false
      if (rec !== 'ALL' && s.recommendation !== rec) return false
      if (search && !s.name.includes(search) && !s.symbol.toUpperCase().includes(search.toUpperCase())) return false
      return true
    })
  }, [stocks, market, rec, search])

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Hero */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">주식 투자 가이드</h1>
        <p className="text-gray-500 text-sm">지금 매수해도 될까요? AI 분석으로 쉽게 확인하세요.</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6 space-y-3">
        <input
          type="text"
          placeholder="종목명 또는 심볼 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        <div className="flex flex-wrap gap-2">
          {MARKETS.map((m) => (
            <button
              key={m}
              onClick={() => setMarket(m)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                market === m
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {RECOMMENDATIONS.map((r) => (
            <button
              key={r.value}
              onClick={() => setRec(r.value)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                rec === r.value
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-green-300'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {isLoading && (
        <div className="text-center py-16 text-gray-400">
          <div className="text-3xl mb-2 animate-spin">⟳</div>
          데이터 불러오는 중...
        </div>
      )}
      {!isLoading && (
        <div className="flex items-center gap-2 mb-3">
          {isFetching
            ? <span className="inline-block w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            : <span className="inline-block w-2 h-2 rounded-full bg-green-400" />}
          <p className="text-xs text-gray-400">
            {isFetching ? '데이터 갱신 중...' : `마지막 업데이트: ${formatTime(dataUpdatedAt) ?? '-'}`}
            &nbsp;·&nbsp;30초마다 자동 갱신
          </p>
        </div>
      )}
      {isError && (
        <div className="text-center py-16 text-red-400">
          <div className="text-3xl mb-2">⚠️</div>
          데이터를 불러올 수 없습니다. 잠시 후 다시 시도해 주세요.
        </div>
      )}
      {!isLoading && !isError && (
        <>
          <p className="text-xs text-gray-400 mb-3">{filtered.length}개 종목 표시 중</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((stock) => (
              <StockCard key={stock.symbol} stock={stock} />
            ))}
            {filtered.length === 0 && (
              <div className="col-span-3 text-center py-16 text-gray-400">
                조건에 맞는 종목이 없습니다.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
