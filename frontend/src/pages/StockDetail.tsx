import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { stockApi, watchlistApi } from '../api/stockApi'
import StockChart from '../components/stock/StockChart'
import VolumeChart from '../components/stock/VolumeChart'
import InstitutionalChart from '../components/stock/InstitutionalChart'
import InstitutionBreakdown from '../components/stock/InstitutionBreakdown'
import RecommendationBadge from '../components/common/RecommendationBadge'
import RiskBadge from '../components/common/RiskBadge'
import ScoreBar from '../components/common/ScoreBar'
import { useAuthStore } from '../store/authStore'
import { formatChange, formatPriceWithCurrency, formatVolume, RECOMMENDATION_COLORS } from '../utils/format'

type Tab = 'price' | 'volume' | 'investor'
type Period = 'daily' | 'weekly' | 'intraday'

const TABS: { key: Tab; label: string }[] = [
  { key: 'price',    label: '가격 차트' },
  { key: 'volume',   label: '거래량 분석' },
  { key: 'investor', label: '투자자 동향' },
]

const PERIODS: { key: Period; label: string }[] = [
  { key: 'daily',    label: '일봉' },
  { key: 'weekly',   label: '주봉' },
  { key: 'intraday', label: '분봉' },
]

export default function StockDetail() {
  const { symbol } = useParams<{ symbol: string }>()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>('price')
  const [period, setPeriod] = useState<Period>('daily')

  const { data: stock, isLoading, isError } = useQuery({
    queryKey: ['stock', symbol, period],
    queryFn: () => stockApi.getDetail(symbol!, period),
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
        <div className="text-3xl mb-2 animate-spin">⟳</div>
        불러오는 중...
      </div>
    )
  }

  if (isError || !stock) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center text-red-400">
        <div className="text-3xl mb-2">⚠️</div>
        종목 정보를 불러올 수 없습니다.
      </div>
    )
  }

  const isUp = stock.priceChangeRate >= 0
  const recColor = stock.recommendation ? RECOMMENDATION_COLORS[stock.recommendation] : '#6b7280'

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* 뒤로 가기 */}
      <button
        onClick={() => navigate(-1)}
        className="text-sm text-gray-500 hover:text-gray-700 mb-4 flex items-center gap-1"
      >
        ← 목록으로
      </button>

      {/* ── 헤더: 종목명 + 현재가 ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">{stock.name}</h1>
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded shrink-0">{stock.market}</span>
              <span className="text-xs text-gray-400 shrink-0">{stock.sector}</span>
            </div>
            <p className="text-xs text-gray-400">{stock.symbol}</p>
          </div>
          {isAuthenticated && (
            <button
              onClick={() => isWatched ? removeMutation.mutate() : addMutation.mutate()}
              disabled={addMutation.isPending || removeMutation.isPending}
              className={`shrink-0 text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                isWatched
                  ? 'border-yellow-300 bg-yellow-50 text-yellow-600'
                  : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
              }`}
            >
              {isWatched ? '★ 관심' : '☆ 추가'}
            </button>
          )}
        </div>

        <div className="flex items-baseline gap-3 mt-3">
          <span className="text-3xl font-bold text-gray-900">
            {formatPriceWithCurrency(stock.currentPrice, stock.market)}
          </span>
          <span className={`text-lg font-bold ${isUp ? 'text-green-600' : 'text-red-500'}`}>
            {formatChange(stock.priceChangeRate)}
          </span>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-2 text-xs text-gray-500">
          <span>거래량 {formatVolume(stock.volume)}</span>
          {stock.avgVolume20 && (
            <span className={stock.volume >= stock.avgVolume20 * 1.5 ? 'text-orange-500 font-semibold' : ''}>
              20일 평균 대비 {((stock.volume / stock.avgVolume20) * 100).toFixed(0)}%
            </span>
          )}
          {stock.prevClose > 0 && (
            <span>전일 {formatPriceWithCurrency(stock.prevClose, stock.market)}</span>
          )}
        </div>
      </div>

      {/* ── AI 추천 요약 ── */}
      {stock.recommendation && (
        <div
          className="rounded-xl p-4 mb-4 border-2"
          style={{ borderColor: recColor, backgroundColor: recColor + '12' }}
        >
          <div className="flex items-center justify-between mb-3">
            <RecommendationBadge recommendation={stock.recommendation} label={stock.recommendationLabel} size="lg" />
            <RiskBadge risk={stock.risk} label={stock.riskLabel} />
          </div>
          {stock.score !== null && (
            <div className="mb-3">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 font-medium">추천 점수</span>
                <span className="font-bold" style={{ color: recColor }}>{stock.score} / 100</span>
              </div>
              <ScoreBar score={stock.score} />
            </div>
          )}
          {stock.reasons.length > 0 && (
            <ul className="space-y-1">
              {stock.reasons.map((r, i) => (
                <li key={i} className="text-sm text-gray-700 flex items-start gap-1.5">
                  <span className="text-green-500 mt-0.5 shrink-0">✓</span>{r}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── 탭 네비게이션 ── */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-4">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 text-sm font-semibold py-2 rounded-lg transition-all ${
              tab === key
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── 탭 컨텐츠 ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">

        {/* 가격 차트 탭 */}
        {tab === 'price' && (
          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-gray-800">가격 차트</p>
                {/* 기간 선택 버튼 */}
                <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5">
                  {PERIODS.map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setPeriod(key)}
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                        period === key
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-xs text-gray-400 mb-3">
                {period === 'intraday' ? '당일 분봉' : period === 'weekly' ? '주봉 · MA5 / MA20' : '일봉 · MA5 / MA20'}
              </p>
              <StockChart data={stock.chartData} ma5={stock.ma5} ma20={stock.ma20} />
            </div>
            {/* 기술 지표 */}
            <div>
              <p className="text-sm font-bold text-gray-800 mb-3">기술 지표</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: 'MA5',    value: stock.ma5  ? formatPriceWithCurrency(stock.ma5,  stock.market) : '-' },
                  { label: 'MA20',   value: stock.ma20 ? formatPriceWithCurrency(stock.ma20, stock.market) : '-' },
                  { label: '등락률', value: formatChange(stock.priceChangeRate) },
                  { label: '거래량 비율', value: stock.volumeRatio ? `${stock.volumeRatio.toFixed(2)}배` : '-' },
                  { label: '5일 평균 거래량',  value: stock.avgVolume5  ? formatVolume(stock.avgVolume5)  : '-' },
                  { label: '20일 평균 거래량', value: stock.avgVolume20 ? formatVolume(stock.avgVolume20) : '-' },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-[11px] text-gray-400 mb-0.5">{label}</p>
                    <p className="text-sm font-bold text-gray-800">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 거래량 분석 탭 */}
        {tab === 'volume' && (
          <div>
            <p className="text-sm font-bold text-gray-800 mb-1">거래량 분석</p>
            <p className="text-xs text-gray-400 mb-5">최근 20거래일 · 초록 = 상승일, 빨강 = 하락일</p>
            <VolumeChart
              data={stock.volumeHistory}
              todayVolume={stock.volume}
              avgVolume5={stock.avgVolume5}
              avgVolume20={stock.avgVolume20}
            />
          </div>
        )}

        {/* 투자자 동향 탭 */}
        {tab === 'investor' && (
          <div className="space-y-8">
            {/* 기관/외국인/개인 */}
            <div>
              <p className="text-sm font-bold text-gray-800 mb-1">투자자별 순매수</p>
              <p className="text-xs text-gray-400 mb-5">기관 / 외국인 / 개인 · 최근 20거래일</p>
              <InstitutionalChart data={stock.institutionalFlow} market={stock.market} />
            </div>

            {/* 구분선 */}
            <div className="border-t border-gray-100" />

            {/* 기관 세분화 */}
            <div>
              <p className="text-sm font-bold text-gray-800 mb-1">기관 유형별 세부 현황</p>
              <p className="text-xs text-gray-400 mb-5">금융투자 / 투신 / 연기금 / 보험 / 은행 / 기타법인</p>
              <InstitutionBreakdown
                summary={stock.institutionSummary}
                daily={stock.institutionDaily}
                players={stock.institutionPlayers}
                market={stock.market}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
