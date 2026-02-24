import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { watchlistApi } from '../api/stockApi'
import RecommendationBadge from '../components/common/RecommendationBadge'
import ScoreBar from '../components/common/ScoreBar'
import { formatChange, formatPrice } from '../utils/format'

export default function Watchlist() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['watchlist'],
    queryFn: watchlistApi.getAll,
    refetchInterval: 60_000,
  })

  const removeMutation = useMutation({
    mutationFn: watchlistApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['watchlist'] }),
  })

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">관심 종목</h1>
        <button
          onClick={() => navigate('/')}
          className="text-sm text-blue-600 hover:underline"
        >
          + 종목 추가
        </button>
      </div>

      {isLoading && (
        <div className="text-center py-16 text-gray-400">불러오는 중...</div>
      )}

      {!isLoading && items.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">☆</div>
          <p className="text-lg font-medium mb-2">관심 종목이 없습니다</p>
          <p className="text-sm">종목 상세 페이지에서 관심 종목을 추가하세요.</p>
        </div>
      )}

      <div className="space-y-3">
        {items.map((item) => {
          const isUp = item.priceChangeRate >= 0
          return (
            <div
              key={item.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"
            >
              <div className="flex items-start justify-between">
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => navigate(`/stocks/${item.symbol}`)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-gray-900">{item.name}</h3>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{item.market}</span>
                  </div>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-lg font-bold text-gray-900">₩{formatPrice(item.currentPrice)}</span>
                    <span className={`text-sm font-semibold ${isUp ? 'text-green-600' : 'text-red-500'}`}>
                      {formatChange(item.priceChangeRate)}
                    </span>
                  </div>
                  {item.recommendation && (
                    <div className="flex items-center gap-3">
                      <RecommendationBadge
                        recommendation={item.recommendation}
                        label={item.recommendationLabel}
                        size="sm"
                      />
                      {item.score !== null && (
                        <div className="flex-1 max-w-32">
                          <ScoreBar score={item.score} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => removeMutation.mutate(item.symbol)}
                  disabled={removeMutation.isPending}
                  className="ml-3 text-gray-300 hover:text-red-400 transition-colors text-lg"
                  title="관심 종목에서 제거"
                >
                  ✕
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
