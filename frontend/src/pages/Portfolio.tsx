import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { portfolioApi } from '../api/stockApi'
import RecommendationBadge from '../components/common/RecommendationBadge'
import { formatPriceWithCurrency, formatReturnRate } from '../utils/format'

function isSameCurrency(markets: string[]): 'KRW' | 'USD' | 'mixed' {
  const korean = markets.filter((m) => m === 'KOSPI' || m === 'KOSDAQ')
  if (korean.length === markets.length) return 'KRW'
  if (korean.length === 0) return 'USD'
  return 'mixed'
}

export default function Portfolio() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ symbol: '', avgPrice: '', quantity: '' })
  const [formError, setFormError] = useState('')

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['portfolio'],
    queryFn: portfolioApi.getAll,
    refetchInterval: 60_000,
  })

  const addMutation = useMutation({
    mutationFn: portfolioApi.addOrUpdate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] })
      setShowForm(false)
      setForm({ symbol: '', avgPrice: '', quantity: '' })
    },
    onError: (e: { message?: string; response?: { data?: { error?: string } } }) => {
      setFormError(e.message || e.response?.data?.error || '추가에 실패했습니다.')
    },
  })

  const removeMutation = useMutation({
    mutationFn: portfolioApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['portfolio'] }),
  })

  const totalInvested = items.reduce((sum, i) => sum + i.totalInvested, 0)
  const currentValue = items.reduce((sum, i) => sum + i.currentValue, 0)
  const totalPL = currentValue - totalInvested
  const totalReturn = totalInvested > 0 ? totalPL / totalInvested : 0
  const currencyType = isSameCurrency(items.map((i) => i.market))
  const summaryMarket = currencyType === 'KRW' ? 'KOSPI' : currencyType === 'USD' ? 'NASDAQ' : null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    const avgPrice = parseFloat(form.avgPrice)
    const quantity = parseInt(form.quantity)
    if (!form.symbol || isNaN(avgPrice) || isNaN(quantity) || avgPrice <= 0 || quantity <= 0) {
      setFormError('모든 항목을 올바르게 입력해주세요.')
      return
    }
    addMutation.mutate({ symbol: form.symbol.toUpperCase(), avgPrice, quantity })
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">포트폴리오</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          + 종목 추가
        </button>
      </div>

      {/* Summary Card */}
      {items.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-4">
          <h2 className="text-sm font-medium text-gray-500 mb-3">
            총 평가
            {currencyType === 'mixed' && (
              <span className="ml-2 text-xs text-amber-500">원·달러 혼합</span>
            )}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">투자 원금</p>
              <p className="font-bold text-gray-800">
                {summaryMarket ? formatPriceWithCurrency(totalInvested, summaryMarket) : totalInvested.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">평가 금액</p>
              <p className="font-bold text-gray-800">
                {summaryMarket ? formatPriceWithCurrency(currentValue, summaryMarket) : currentValue.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">수익률</p>
              <p className={`font-bold ${totalReturn >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {formatReturnRate(totalReturn)}
              </p>
              <p className={`text-xs ${totalPL >= 0 ? 'text-green-500' : 'text-red-400'}`}>
                {totalPL >= 0 ? '+' : ''}
                {summaryMarket
                  ? formatPriceWithCurrency(Math.abs(totalPL), summaryMarket)
                  : Math.abs(totalPL).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Add Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-blue-50 rounded-xl border border-blue-100 p-4 mb-4">
          <h3 className="text-sm font-bold text-blue-800 mb-3">종목 추가</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="text-xs text-gray-600 block mb-1">심볼</label>
              <input
                type="text"
                placeholder="예: AAPL, 005930.KS"
                value={form.symbol}
                onChange={(e) => setForm({ ...form, symbol: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 block mb-1">평균 단가</label>
              <input
                type="number"
                placeholder="0"
                value={form.avgPrice}
                onChange={(e) => setForm({ ...form, avgPrice: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 block mb-1">수량</label>
              <input
                type="number"
                placeholder="0"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
          </div>
          {formError && <p className="text-xs text-red-500 mb-3">{formError}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={addMutation.isPending}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {addMutation.isPending ? '추가 중...' : '추가'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 text-gray-500 hover:text-gray-700 text-sm"
            >
              취소
            </button>
          </div>
        </form>
      )}

      {isLoading && <div className="text-center py-16 text-gray-400">불러오는 중...</div>}

      {!isLoading && items.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">💼</div>
          <p className="text-lg font-medium mb-2">포트폴리오가 비어있습니다</p>
          <p className="text-sm">보유 종목을 추가해 수익률을 확인하세요.</p>
        </div>
      )}

      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 cursor-pointer" onClick={() => navigate(`/stocks/${item.symbol}`)}>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-bold text-gray-900">{item.name}</h3>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{item.market}</span>
                  {item.recommendation && (
                    <RecommendationBadge
                      recommendation={item.recommendation}
                      label={item.recommendationLabel}
                      size="sm"
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">평균단가</p>
                    <p className="font-medium text-gray-700">{formatPriceWithCurrency(item.avgPrice, item.market)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">수량</p>
                    <p className="font-medium text-gray-700">{item.quantity}주</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">현재가</p>
                    <p className="font-medium text-gray-700">{formatPriceWithCurrency(item.currentPrice, item.market)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">수익률</p>
                    <p className={`font-bold ${item.returnRate >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {formatReturnRate(item.returnRate)}
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => removeMutation.mutate(item.symbol)}
                disabled={removeMutation.isPending}
                className="ml-3 text-gray-300 hover:text-red-400 transition-colors text-lg"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
