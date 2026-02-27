import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
  LineChart, Line, Legend,
} from 'recharts'
import { fetchInstitutionalTrend, fetchPlayerTrend } from '../api/finnhubApi'
import { formatFlow } from '../utils/format'

type PageMode    = 'type' | 'player'
type InstType    = '금융투자' | '투신' | '연기금' | '보험' | '은행' | '기타법인' | '외국인'
type MarketFilter = 'KOSPI' | 'KOSDAQ' | 'NASDAQ' | 'NYSE'
type ViewMode    = 'stocks' | 'trend'
type SortMode    = 'buy' | 'sell'

const INST_TYPES: Array<{ key: InstType; color: string; desc: string }> = [
  { key: '연기금',   color: '#10b981', desc: '국민연금·사학연금·공제회' },
  { key: '금융투자', color: '#3b82f6', desc: '증권사·투자은행' },
  { key: '투신',     color: '#8b5cf6', desc: '자산운용사·펀드' },
  { key: '외국인',   color: '#f59e0b', desc: '외국계 기관·헤지펀드' },
  { key: '보험',     color: '#ec4899', desc: '생명보험·손해보험' },
  { key: '은행',     color: '#06b6d4', desc: '시중은행·지방은행' },
  { key: '기타법인', color: '#9ca3af', desc: '기타 법인 투자자' },
]

const TYPE_COLOR: Record<string, string> = Object.fromEntries(INST_TYPES.map(t => [t.key, t.color]))

const MARKETS: Array<{ key: MarketFilter; label: string }> = [
  { key: 'KOSPI',  label: 'KOSPI' },
  { key: 'KOSDAQ', label: 'KOSDAQ' },
  { key: 'NASDAQ', label: 'NASDAQ' },
  { key: 'NYSE',   label: 'NYSE' },
]

const PLAYER_TYPE_FILTERS = ['전체', '연기금', '금융투자', '투신', '외국인', '보험', '은행', '기타법인']

const lineColors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']

export default function InstitutionalTrend() {
  const navigate = useNavigate()

  // ── 공통 상태 ──────────────────────────────────────────────────────────────
  const [mode, setMode]           = useState<PageMode>('type')
  const [market, setMarket]       = useState<MarketFilter>('KOSPI')
  const [dateRange, setDateRange] = useState(20)

  // ── 기관유형별 상태 ──────────────────────────────────────────────────────────
  const [instType, setInstType]   = useState<InstType>('연기금')
  const [view, setView]           = useState<ViewMode>('stocks')
  const [sortMode, setSortMode]   = useState<SortMode>('buy')

  // ── 개별기관별 상태 ──────────────────────────────────────────────────────────
  const [playerTypeFilter, setPlayerTypeFilter] = useState('전체')
  const [selectedPlayer, setSelectedPlayer]     = useState<string | null>(null)
  const [playerView, setPlayerView]             = useState<ViewMode>('stocks')

  // ── 데이터 ──────────────────────────────────────────────────────────────────
  const { data: typeData,   isLoading: typeLoading }   = useQuery({
    queryKey: ['institutional_trend'],
    queryFn: fetchInstitutionalTrend,
    staleTime: 5 * 60 * 1000,
  })
  const { data: playerData, isLoading: playerLoading } = useQuery({
    queryKey: ['player_trend'],
    queryFn: fetchPlayerTrend,
    staleTime: 5 * 60 * 1000,
  })

  // ── 기관유형별 계산 ──────────────────────────────────────────────────────────
  const instMeta = INST_TYPES.find(t => t.key === instType)!

  const typeFilteredStocks = useMemo(() =>
    (typeData?.byType[instType]?.stocks ?? []).filter(s => s.market === market),
    [typeData, instType, market]
  )

  const typeDates = useMemo(() =>
    (typeData?.dates ?? []).slice(-dateRange), [typeData, dateRange])

  const typeDailyTotals = useMemo(() => {
    const offset = 20 - dateRange
    return typeDates.map((date, di) => ({
      date,
      net: typeFilteredStocks.reduce((sum, s) => sum + (s.dailyNet[offset + di] ?? 0), 0),
    }))
  }, [typeFilteredStocks, typeDates, dateRange])

  const typeStocksInRange = useMemo(() => {
    const offset = 20 - dateRange
    return typeFilteredStocks
      .map(s => ({
        ...s,
        netAmount:  s.dailyNet.slice(offset).reduce((a, b) => a + b, 0),
        buyAmount:  s.dailyNet.slice(offset).reduce((sum, v) => sum + Math.max(v, 0), 0) + s.buyAmount * (dateRange / 20) * 0.3,
        sellAmount: s.dailyNet.slice(offset).reduce((sum, v) => sum + Math.abs(Math.min(v, 0)), 0) + s.sellAmount * (dateRange / 20) * 0.3,
      }))
      .sort(sortMode === 'buy'
        ? (a, b) => b.netAmount - a.netAmount
        : (a, b) => a.netAmount - b.netAmount)
      .slice(0, 15)
  }, [typeFilteredStocks, sortMode, dateRange])

  const typeMaxAbs = Math.max(...typeStocksInRange.map(s => Math.abs(s.netAmount)), 1)
  const typeCumNet = typeDailyTotals.reduce((a, b) => a + b.net, 0)

  const typeTopStocks = useMemo(() => {
    const offset = 20 - dateRange
    return typeFilteredStocks.slice(0, 5).map(s => ({ name: s.name, data: s.dailyNet.slice(offset) }))
  }, [typeFilteredStocks, dateRange])

  const typeLineData = useMemo(() =>
    typeDates.map((date, di) => {
      const offset = 20 - dateRange
      const row: Record<string, number | string> = { date }
      typeTopStocks.forEach(s => { row[s.name] = s.data[di] ?? 0 })
      row['전체합계'] = typeFilteredStocks.reduce((sum, s) => sum + (s.dailyNet[offset + di] ?? 0), 0)
      return row
    }), [typeTopStocks, typeFilteredStocks, typeDates, dateRange])

  // ── 개별기관별 계산 ──────────────────────────────────────────────────────────
  const filteredPlayers = useMemo(() => {
    if (!playerData) return []
    const offset = 20 - dateRange
    return playerData.players
      .map(p => {
        const marketStocks = p.stocks.filter(s => s.market === market)
        const marketNet = marketStocks.reduce((sum, s) =>
          sum + s.dailyNet.slice(offset).reduce((a, b) => a + b, 0), 0)
        return { ...p, marketNet }
      })
      .filter(p => playerTypeFilter === '전체' || p.type === playerTypeFilter)
      .sort((a, b) => Math.abs(b.marketNet) - Math.abs(a.marketNet))
  }, [playerData, playerTypeFilter, market, dateRange])

  const selPlayerData = useMemo(() => {
    if (!selectedPlayer || !playerData) return null
    const p = playerData.players.find(pl => pl.name === selectedPlayer)
    if (!p) return null
    const offset = 20 - dateRange
    const dates = playerData.dates.slice(-dateRange)
    const marketStocks = p.stocks.filter(s => s.market === market)
    const stocksInRange = marketStocks
      .map(s => ({
        ...s,
        netAmount: s.dailyNet.slice(offset).reduce((a, b) => a + b, 0),
        buyAmount: s.dailyNet.slice(offset).reduce((sum, v) => sum + Math.max(v, 0), 0),
        sellAmount: s.dailyNet.slice(offset).reduce((sum, v) => sum + Math.abs(Math.min(v, 0)), 0),
      }))
      .sort((a, b) => Math.abs(b.netAmount) - Math.abs(a.netAmount))
      .filter(s => s.buyAmount + s.sellAmount > 0)
    const dailyTotals = dates.map((date, di) => ({
      date,
      net: marketStocks.reduce((sum, s) => sum + (s.dailyNet[offset + di] ?? 0), 0),
    }))
    const cumNet = dailyTotals.reduce((a, b) => a + b.net, 0)
    const maxAbs = Math.max(...stocksInRange.map(s => Math.abs(s.netAmount)), 1)
    return { p, stocksInRange, dailyTotals, cumNet, maxAbs, dates }
  }, [selectedPlayer, playerData, market, dateRange])

  // ── 렌더링 ──────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-gray-700 mb-4 flex items-center gap-1">
        ← 돌아가기
      </button>

      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">기관별 매매동향</h1>
        <p className="text-sm text-gray-500">날짜별 매수·매도 현황과 종목별 순매수 추이</p>
      </div>

      {/* ── 최상위 모드 전환 ── */}
      <div className="flex gap-2 mb-4">
        {[
          { key: 'type'   as PageMode, label: '기관유형별', desc: '연기금·외국인·금융투자 등' },
          { key: 'player' as PageMode, label: '개별기관별', desc: '골드만삭스·국민연금 등' },
        ].map(({ key, label, desc }) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            className={`flex-1 rounded-xl border-2 py-3 px-4 text-left transition-all ${
              mode === key
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <p className={`text-sm font-bold ${mode === key ? 'text-blue-700' : 'text-gray-700'}`}>{label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
          </button>
        ))}
      </div>

      {/* ── 공통 필터: 마켓 + 기간 ── */}
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

      {/* ════════════════════════════════════════════════════════════════════════
          기관유형별 모드
      ════════════════════════════════════════════════════════════════════════ */}
      {mode === 'type' && (
        <>
          {/* 기관 유형 탭 */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">기관 유형 선택</p>
            <div className="flex flex-wrap gap-2">
              {INST_TYPES.map(({ key, color, desc }) => (
                <button
                  key={key}
                  onClick={() => setInstType(key)}
                  title={desc}
                  className={`text-sm px-3 py-1.5 rounded-full border font-semibold transition-all ${
                    instType === key ? 'text-white border-transparent shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                  style={instType === key ? { backgroundColor: color, borderColor: color } : {}}
                >
                  {key}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">{instMeta.desc}</p>
          </div>

          {/* 요약 카드 */}
          {!typeLoading && (
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className={`rounded-xl border p-3 ${typeCumNet >= 0 ? 'border-blue-100 bg-blue-50' : 'border-red-100 bg-red-50'}`}>
                <p className="text-[11px] text-gray-400 mb-1">{dateRange}일 누적 순매수</p>
                <p className={`text-base font-bold ${typeCumNet >= 0 ? 'text-blue-700' : 'text-red-600'}`}>{formatFlow(typeCumNet, market)}</p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <p className="text-[11px] text-gray-400 mb-1">일평균 순매수</p>
                <p className={`text-base font-bold ${typeCumNet / dateRange >= 0 ? 'text-blue-700' : 'text-red-600'}`}>{formatFlow(Math.round(typeCumNet / dateRange), market)}</p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <p className="text-[11px] text-gray-400 mb-1">조회 종목수</p>
                <p className="text-base font-bold text-gray-800">{typeFilteredStocks.length}개</p>
              </div>
            </div>
          )}

          {/* 뷰 전환 */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-4">
            {([['stocks', '종목별 현황'], ['trend', '날짜별 추이']] as [ViewMode, string][]).map(([k, l]) => (
              <button key={k} onClick={() => setView(k)}
                className={`flex-1 text-sm font-semibold py-2 rounded-lg transition-all ${view === k ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {l}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            {typeLoading && <LoadingSpinner />}

            {/* 종목별 현황 */}
            {!typeLoading && view === 'stocks' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-bold text-gray-800">{instType} 종목별 매매 현황</p>
                    <p className="text-xs text-gray-400">{market} · {dateRange}거래일 · 순매수 기준</p>
                  </div>
                  <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                    <button onClick={() => setSortMode('buy')} className={`text-xs px-3 py-1 rounded-md font-semibold ${sortMode === 'buy' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>순매수↑</button>
                    <button onClick={() => setSortMode('sell')} className={`text-xs px-3 py-1 rounded-md font-semibold ${sortMode === 'sell' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500'}`}>순매도↑</button>
                  </div>
                </div>
                <StockFlowTable
                  stocks={typeStocksInRange}
                  maxAbs={typeMaxAbs}
                  color={instMeta.color}
                  market={market}
                  onClickStock={(sym) => navigate(`/stocks/${sym}`)}
                />
                <Disclaimer />
              </div>
            )}

            {/* 날짜별 추이 */}
            {!typeLoading && view === 'trend' && (
              <TrendView
                label={`${instType}`}
                dailyTotals={typeDailyTotals}
                lineData={typeLineData}
                topStocks={typeTopStocks}
                market={market}
                color={instMeta.color}
              />
            )}
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          개별기관별 모드
      ════════════════════════════════════════════════════════════════════════ */}
      {mode === 'player' && (
        <>
          {/* 기관유형 필터 */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {PLAYER_TYPE_FILTERS.map(t => {
              const color = t !== '전체' ? TYPE_COLOR[t] : '#6b7280'
              const active = playerTypeFilter === t
              return (
                <button
                  key={t}
                  onClick={() => { setPlayerTypeFilter(t); setSelectedPlayer(null) }}
                  className="text-xs px-3 py-1.5 rounded-full border font-semibold transition-all"
                  style={active
                    ? { backgroundColor: color, borderColor: color, color: '#fff' }
                    : { backgroundColor: '#fff', borderColor: '#e5e7eb', color: '#4b5563' }}
                >
                  {t}
                </button>
              )
            })}
          </div>

          {playerLoading && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8"><LoadingSpinner /></div>
          )}

          {!playerLoading && (
            <>
              {/* 기관 리스트 */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-4">
                <div className="grid grid-cols-[1.5rem_1fr_auto_auto] gap-x-3 px-4 py-2 border-b border-gray-50 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                  <span>#</span>
                  <span>기관명</span>
                  <span className="text-right">{dateRange}일 순매수</span>
                  <span className="text-right">방향</span>
                </div>
                <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
                  {filteredPlayers.map((p, i) => {
                    const color = TYPE_COLOR[p.type] ?? '#9ca3af'
                    const isPos = p.marketNet >= 0
                    const isSelected = selectedPlayer === p.name
                    return (
                      <button
                        key={p.name}
                        onClick={() => {
                          setSelectedPlayer(isSelected ? null : p.name)
                          setPlayerView('stocks')
                        }}
                        className={`w-full grid grid-cols-[1.5rem_1fr_auto_auto] gap-x-3 items-center px-4 py-2.5 text-left transition-colors ${
                          isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <span className="text-xs text-gray-300 font-mono">{i + 1}</span>
                        <div className="min-w-0">
                          <p className={`text-sm font-semibold truncate ${isSelected ? 'text-blue-700' : 'text-gray-800'}`}>{p.name}</p>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                            style={{ backgroundColor: color + '20', color }}>
                            {p.type}
                          </span>
                        </div>
                        <span className={`text-sm font-bold text-right whitespace-nowrap ${isPos ? 'text-blue-600' : 'text-red-500'}`}>
                          {formatFlow(p.marketNet, market)}
                        </span>
                        <span className={`text-lg ${isSelected ? 'text-blue-500' : 'text-gray-300'}`}>
                          {isSelected ? '▲' : '▷'}
                        </span>
                      </button>
                    )
                  })}
                  {filteredPlayers.length === 0 && (
                    <p className="text-center py-8 text-sm text-gray-400">해당 조건의 기관이 없습니다</p>
                  )}
                </div>
              </div>

              {/* 선택된 기관 상세 */}
              {selPlayerData && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-semibold"
                      style={{ backgroundColor: (TYPE_COLOR[selPlayerData.p.type] ?? '#9ca3af') + '20', color: TYPE_COLOR[selPlayerData.p.type] ?? '#9ca3af' }}
                    >
                      {selPlayerData.p.type}
                    </span>
                    <h2 className="text-lg font-bold text-gray-900">{selPlayerData.p.name}</h2>
                  </div>

                  {/* 요약 */}
                  <div className="grid grid-cols-3 gap-2 mb-4 mt-3">
                    <div className={`rounded-lg border p-2.5 ${selPlayerData.cumNet >= 0 ? 'border-blue-100 bg-blue-50' : 'border-red-100 bg-red-50'}`}>
                      <p className="text-[10px] text-gray-400 mb-0.5">{dateRange}일 누적</p>
                      <p className={`text-sm font-bold ${selPlayerData.cumNet >= 0 ? 'text-blue-700' : 'text-red-600'}`}>{formatFlow(selPlayerData.cumNet, market)}</p>
                    </div>
                    <div className="rounded-lg border border-gray-100 bg-gray-50 p-2.5">
                      <p className="text-[10px] text-gray-400 mb-0.5">일평균</p>
                      <p className={`text-sm font-bold ${selPlayerData.cumNet / dateRange >= 0 ? 'text-blue-700' : 'text-red-600'}`}>{formatFlow(Math.round(selPlayerData.cumNet / dateRange), market)}</p>
                    </div>
                    <div className="rounded-lg border border-gray-100 bg-gray-50 p-2.5">
                      <p className="text-[10px] text-gray-400 mb-0.5">거래 종목</p>
                      <p className="text-sm font-bold text-gray-800">{selPlayerData.stocksInRange.length}개</p>
                    </div>
                  </div>

                  {/* 뷰 전환 */}
                  <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-4">
                    {([['stocks', '종목별 현황'], ['trend', '날짜별 추이']] as [ViewMode, string][]).map(([k, l]) => (
                      <button key={k} onClick={() => setPlayerView(k)}
                        className={`flex-1 text-sm font-semibold py-2 rounded-lg transition-all ${playerView === k ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                        {l}
                      </button>
                    ))}
                  </div>

                  {playerView === 'stocks' && (
                    <div>
                      <StockFlowTable
                        stocks={selPlayerData.stocksInRange.slice(0, 15)}
                        maxAbs={selPlayerData.maxAbs}
                        color={TYPE_COLOR[selPlayerData.p.type] ?? '#6b7280'}
                        market={market}
                        onClickStock={(sym) => navigate(`/stocks/${sym}`)}
                      />
                      <Disclaimer />
                    </div>
                  )}

                  {playerView === 'trend' && (
                    <TrendView
                      label={selPlayerData.p.name}
                      dailyTotals={selPlayerData.dailyTotals}
                      lineData={[]}
                      topStocks={[]}
                      market={market}
                      color={TYPE_COLOR[selPlayerData.p.type] ?? '#6b7280'}
                      compact
                    />
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

// ── 공통 서브 컴포넌트 ─────────────────────────────────────────────────────────

function LoadingSpinner() {
  return (
    <div className="text-center py-10 text-gray-400">
      <div className="text-2xl mb-2 animate-spin">⟳</div>
      <p className="text-sm">데이터 생성 중...</p>
    </div>
  )
}

function Disclaimer() {
  return (
    <p className="text-[10px] text-gray-400 text-right mt-3">
      * 거래량·가격 기반 추정치. 실제 기관 신고 데이터와 다를 수 있음.
    </p>
  )
}

interface StockFlowTableProps {
  stocks: Array<{ symbol: string; name: string; market: string; buyAmount: number; sellAmount: number; netAmount: number }>
  maxAbs: number
  color: string
  market: string
  onClickStock: (sym: string) => void
}

function StockFlowTable({ stocks, maxAbs, color, market, onClickStock }: StockFlowTableProps) {
  return (
    <div>
      <div className="grid grid-cols-[1.5rem_1fr_auto_auto_auto] gap-x-2 px-2 pb-1.5 border-b border-gray-100 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
        <span>#</span><span>종목</span>
        <span className="text-right">매수</span>
        <span className="text-right">매도</span>
        <span className="text-right">순매수</span>
      </div>
      <div className="divide-y divide-gray-50">
        {stocks.map((s, i) => {
          const isPos = s.netAmount >= 0
          const barPct = (Math.abs(s.netAmount) / maxAbs) * 100
          return (
            <div
              key={s.symbol}
              className="grid grid-cols-[1.5rem_1fr_auto_auto_auto] gap-x-2 items-center px-2 py-2.5 hover:bg-gray-50 rounded-lg cursor-pointer"
              onClick={() => onClickStock(s.symbol)}
            >
              <span className="text-xs text-gray-300 font-mono">{i + 1}</span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <p className="text-sm font-semibold text-gray-800 truncate">{s.name}</p>
                  <span className="text-[9px] px-1 py-0.5 rounded bg-gray-100 text-gray-400 shrink-0">{s.market}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden w-full max-w-[120px]">
                  <div className="h-full rounded-full" style={{ width: `${barPct}%`, backgroundColor: isPos ? color : '#ef4444', opacity: 0.7 }} />
                </div>
              </div>
              <span className="text-xs text-blue-500 font-medium text-right whitespace-nowrap">{formatFlow(s.buyAmount, market)}</span>
              <span className="text-xs text-red-400 font-medium text-right whitespace-nowrap">{formatFlow(-s.sellAmount, market)}</span>
              <span className={`text-xs font-bold text-right whitespace-nowrap ${isPos ? 'text-blue-700' : 'text-red-600'}`}>{formatFlow(s.netAmount, market)}</span>
            </div>
          )
        })}
        {stocks.length === 0 && (
          <p className="text-center py-8 text-sm text-gray-400">해당 마켓 거래 데이터가 없습니다</p>
        )}
      </div>
    </div>
  )
}

interface TrendViewProps {
  label: string
  dailyTotals: Array<{ date: string; net: number }>
  lineData: Array<Record<string, number | string>>
  topStocks: Array<{ name: string; data: number[] }>
  market: string
  color: string
  compact?: boolean
}

function TrendView({ label, dailyTotals, lineData, topStocks, market, color, compact }: TrendViewProps) {
  return (
    <div className="space-y-6">
      {/* 일별 순매수 바차트 */}
      <div>
        <p className="text-sm font-bold text-gray-800 mb-1">{label} 일별 순매수</p>
        <p className="text-xs text-gray-400 mb-4">파란색=순매수, 빨간색=순매도</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={dailyTotals} margin={{ top: 5, right: 10, left: 5, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} tickFormatter={(v) => formatFlow(v, market)} width={72} />
            <Tooltip formatter={(v: number) => [formatFlow(v, market), '순매수']} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
            <ReferenceLine y={0} stroke="#e5e7eb" strokeWidth={1.5} />
            <Bar dataKey="net" radius={[3, 3, 0, 0]}>
              {dailyTotals.map((e, i) => (
                <Cell key={i} fill={e.net >= 0 ? color : '#ef4444'} opacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 상위 5종목 라인차트 (compact 모드에서는 생략) */}
      {!compact && topStocks.length > 0 && (
        <div>
          <p className="text-sm font-bold text-gray-800 mb-1">상위 5종목 순매수 추이</p>
          <p className="text-xs text-gray-400 mb-4">순매수 상위 5개 종목 개별 동향</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={lineData} margin={{ top: 5, right: 10, left: 5, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} tickFormatter={(v) => formatFlow(v, market)} width={72} />
              <Tooltip formatter={(v: number, name: string) => [formatFlow(v, market), name]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine y={0} stroke="#e5e7eb" strokeWidth={1.5} />
              {topStocks.map((s, i) => (
                <Line key={s.name} type="monotone" dataKey={s.name} stroke={lineColors[i % lineColors.length]} strokeWidth={1.8} dot={false} activeDot={{ r: 3 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

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
                    <td className={`py-1.5 text-right font-semibold ${row.net >= 0 ? 'text-blue-600' : 'text-red-500'}`}>{formatFlow(row.net, market)}</td>
                    <td className={`py-1.5 pl-3 text-right font-medium ${cum >= 0 ? 'text-blue-500' : 'text-red-400'}`}>{formatFlow(cum, market)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Disclaimer />
    </div>
  )
}
