import { useNavigate } from 'react-router-dom'
import type { StockListItem } from '../../types'
import { formatChange, formatPrice } from '../../utils/format'
import RecommendationBadge from '../common/RecommendationBadge'
import RiskBadge from '../common/RiskBadge'
import ScoreBar from '../common/ScoreBar'

interface Props {
  stock: StockListItem
}

export default function StockCard({ stock }: Props) {
  const navigate = useNavigate()
  const isUp = stock.priceChangeRate >= 0

  return (
    <div
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 cursor-pointer hover:shadow-md hover:border-blue-200 transition-all duration-200"
      onClick={() => navigate(`/stocks/${stock.symbol}`)}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-gray-900 text-base">{stock.name}</h3>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{stock.market}</span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{stock.symbol}</p>
        </div>
        {stock.recommendation && (
          <RecommendationBadge recommendation={stock.recommendation} label={stock.recommendationLabel} size="sm" />
        )}
      </div>

      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-xl font-bold text-gray-900">₩{formatPrice(stock.currentPrice)}</span>
        <span className={`text-sm font-semibold ${isUp ? 'text-green-600' : 'text-red-500'}`}>
          {formatChange(stock.priceChangeRate)}
        </span>
      </div>

      {stock.score !== null && (
        <div className="mb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500">추천 점수</span>
            <RiskBadge risk={stock.risk} label={stock.riskLabel} />
          </div>
          <ScoreBar score={stock.score} />
        </div>
      )}
    </div>
  )
}
