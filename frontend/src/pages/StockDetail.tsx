import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { stockApi, watchlistApi } from '../api/stockApi'
import StockChart from '../components/stock/StockChart'
import VolumeChart from '../components/stock/VolumeChart'
import InstitutionalChart from '../components/stock/InstitutionalChart'
import RecommendationBadge from '../components/common/RecommendationBadge'
import RiskBadge from '../components/common/RiskBadge'
import ScoreBar from '../components/common/ScoreBar'
import { useAuthStore } from '../store/authStore'
import { formatChange, formatPriceWithCurrency, formatVolume, RECOMMENDATION_COLORS } from '../utils/format'

export default function StockDetail() {
  const { symbol } = useParams<{ symbol: string }>()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
  const queryClient = useQueryClient()

  const { data: stock, isLoading, isError } = useQuery({
    queryKey: ['stock', symbol],
    queryFn: () => stockApi.getDetail(symbol!),
    enabled: !!symbol,
    refetchInterval: 60_000,
  })

  const { data: watchlist = [] } = useQuery({
    queryKey: ['watchlist'],
    queryFn: watchlistApi.getAll,
    enabled: isAuthenticated,
  })

  const isWatched = watchlist.some((w) => w.symbol === symbol)

  const addMutation = useMutation({
    mutationFn: () => watchlistApi.add(symbol!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['watchlist'] }),
  })

  const removeMutation = useMutation({
    mutationFn: () => watchlistApi.remove(symbol!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['watchlist'] }),
  })

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center text-gray-400">
        <div className="text-3xl mb-2 animate-spin">⟳</div>불러오는 중...
      </div>
    )
  }

  if (isError || !stock) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center text-red-400">
        <div className="text-3xl mb-2">⚠️</div>종목 정보를 불러올 수 없습니다.
      </div>
    )
  }

  const isUp = stock.priceChangeRate >= 0
  const recColor = stock.recommendation ? RECOMMENDATION_COLORS[stock.recommendation] : '#6b7280'

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="text-sm text-gray-500 hover:text-gray-700 mb-4 flex items-center gap-1"
      >
        ← 목록으로
      </button>

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">{stock.name}</h1>
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">{stock.market}</span>
            </div>
            <p className="text-sm text-gray-400">{stock.symbol} · {stock.sector}</p>
          </div>
          {isAuthenticated && (
            <button
              onClick={() => isWatched ? removeMutation.mutate() : addMutation.mutate()}
              disabled={addMutation.isPending || removeMutation.isPending}
              className={`text-sm px-4 py-2 rounded-lg border transition-colors ${
                isWatched
                  ? 'border-yellow-300 bg-yellow-50 text-yellow-600 hover:bg-yellow-100'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {isWatched ? '★ 관심종목' : '☆ 관심추가'}
            </button>
          )}
        </div>

        <div className="flex items-baseline gap-3 mt-4">
          <span className="text-3xl font-bold text-gray-900">{formatPriceWithCurrency(stock.currentPrice, stock.market)}</span>
          <span className={`text-lg font-semibold ${isUp ? 'text-green-600' : 'text-red-500'}`}>
            {formatChange(stock.priceChangeRate)}
          </span>
        </div>

        <div className="flex gap-4 mt-2 text-sm text-gray-500">
          <span>거래량: {formatVolume(stock.volume)}</span>
          {stock.prevClose && <span>전일종가: {formatPriceWithCurrency(stock.prevClose, stock.market)}</span>}
        </div>
      </div>

      {/* Analysis Summary */}
      {stock.recommendation && (
        <div
          className="rounded-xl p-5 mb-4 border-2"
          style={{ borderColor: recColor, backgroundColor: recColor + '10' }}
        >
          <div className="flex items-center justify-between mb-3">
            <RecommendationBadge
              recommendation={stock.recommendation}
              label={stock.recommendationLabel}
              size="lg"
            />
            <RiskBadge risk={stock.risk} label={stock.riskLabel} />
          </div>

          {stock.score !== null && (
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 font-medium">추천 점수</span>
                <span className="font-bold" style={{ color: recColor }}>{stock.score} / 100</span>
              </div>
              <ScoreBar score={stock.score} />
            </div>
          )}

          {stock.reasons.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">📋 추천 이유</p>
              <ul className="space-y-1.5">
                {stock.reasons.map((reason, i) => (
                  <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">✓</span>
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Price Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-4">
        <h2 className="text-base font-bold text-gray-800 mb-4">가격 차트</h2>
        <StockChart data={stock.chartData} ma5={stock.ma5} ma20={stock.ma20} />
      </div>

      {/* Volume Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-4">
        <h2 className="text-base font-bold text-gray-800 mb-1">거래량 분석</h2>
        <p className="text-xs text-gray-400 mb-4">최근 20거래일 · 초록 = 상승일, 빨강 = 하락일</p>
        <VolumeChart
          data={stock.volumeHistory}
          todayVolume={stock.volume}
          avgVolume5={stock.avgVolume5}
          avgVolume20={stock.avgVolume20}
        />
      </div>

      {/* Institutional Flow Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-4">
        <h2 className="text-base font-bold text-gray-800 mb-1">투자자별 순매수 추이</h2>
        <p className="text-xs text-gray-400 mb-4">최근 20거래일 · 기관 / 외국인 / 개인</p>
        <InstitutionalChart
          data={stock.institutionalFlow}
          market={stock.market}
        />
      </div>

      {/* Technical Indicators */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-base font-bold text-gray-800 mb-3">기술 지표</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'MA5 (5일 이동평균)', value: stock.ma5 ? formatPriceWithCurrency(stock.ma5, stock.market) : '-' },
            { label: 'MA20 (20일 이동평균)', value: stock.ma20 ? formatPriceWithCurrency(stock.ma20, stock.market) : '-' },
            { label: '거래량 비율 (전일 평균 대비)', value: stock.volumeRatio ? `${stock.volumeRatio.toFixed(2)}배` : '-' },
            { label: '5일 평균 거래량', value: stock.avgVolume5 ? formatVolume(stock.avgVolume5) : '-' },
            { label: '20일 평균 거래량', value: stock.avgVolume20 ? formatVolume(stock.avgVolume20) : '-' },
            { label: '일 등락률', value: formatChange(stock.priceChangeRate) },
          ].map((item) => (
            <div key={item.label} className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">{item.label}</p>
              <p className="text-sm font-bold text-gray-800">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
