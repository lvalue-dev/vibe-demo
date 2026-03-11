/**
 * 마켓 인사이트 페이지
 * 글로벌 + 국내 뉴스 스크랩 → Gemini AI 섹터·종목별 영향 분석
 */
import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchMarketNews, clearNewsCache, type NewsFilter } from '../api/newsApi'
import { STOCK_INFO } from '../api/finnhubApi'
import type { NewsArticle, SectorImpact } from '../types'

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY || ''

// ── 필터 탭 ───────────────────────────────────────────────────────────────────
const FILTERS: { key: NewsFilter; label: string }[] = [
  { key: 'all',    label: '전체' },
  { key: 'global', label: '글로벌' },
  { key: 'korean', label: '국내' },
]

// ── 경과 시간 ─────────────────────────────────────────────────────────────────
function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (diff < 1)    return '방금'
  if (diff < 60)   return `${diff}분 전`
  if (diff < 1440) return `${Math.floor(diff / 60)}시간 전`
  return `${Math.floor(diff / 1440)}일 전`
}

// ── 임팩트 색상 설정 ──────────────────────────────────────────────────────────
const IMPACT_CFG = {
  positive: { dot: 'bg-green-400', text: 'text-green-600', badge: 'bg-green-50 text-green-700 border-green-200', label: '▲ 긍정' },
  negative: { dot: 'bg-red-400',   text: 'text-red-500',   badge: 'bg-red-50 text-red-600 border-red-200',       label: '▼ 부정' },
  neutral:  { dot: 'bg-gray-300',  text: 'text-gray-400',  badge: 'bg-gray-50 text-gray-500 border-gray-200',    label: '→ 중립' },
} as const

// ── 섹터 영향 요약 패널 ───────────────────────────────────────────────────────
function SectorSummaryPanel({ articles }: { articles: NewsArticle[] }) {
  const sectorMap = new Map<string, { positive: number; negative: number; neutral: number }>()
  articles.forEach(a =>
    a.sectorAnalysis?.sectors.forEach(s => {
      const cur = sectorMap.get(s.name) ?? { positive: 0, negative: 0, neutral: 0 }
      sectorMap.set(s.name, { ...cur, [s.impact]: cur[s.impact as keyof typeof cur] + 1 })
    })
  )
  if (sectorMap.size === 0) return null

  const sorted = [...sectorMap.entries()]
    .map(([name, c]) => ({ name, ...c, score: c.positive - c.negative, total: c.positive + c.negative + c.neutral }))
    .sort((a, b) => Math.abs(b.score) - Math.abs(a.score))
    .slice(0, 8)

  return (
    <div className="space-y-2.5">
      {sorted.map(s => {
        const pct = s.total > 0 ? (s.positive / s.total) * 100 : 0
        const nct = s.total > 0 ? (s.negative / s.total) * 100 : 0
        const color = s.score > 0 ? 'text-green-600' : s.score < 0 ? 'text-red-500' : 'text-gray-400'
        return (
          <div key={s.name} className="flex items-center gap-2">
            <span className="text-xs text-gray-700 w-24 shrink-0 font-medium truncate">{s.name}</span>
            <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden flex">
              <div className="h-full bg-green-400 transition-all" style={{ width: `${pct}%` }} />
              <div className="h-full bg-gray-200"                  style={{ width: `${s.total > 0 ? (s.neutral / s.total) * 100 : 0}%` }} />
              <div className="h-full bg-red-400"                   style={{ width: `${nct}%` }} />
            </div>
            <span className={`text-xs font-bold w-8 text-right tabular-nums ${color}`}>
              {s.score > 0 ? `+${s.score}` : s.score}
            </span>
          </div>
        )
      })}
      <div className="flex gap-4 pt-1 text-[10px] text-gray-400">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block"/>긍정</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-200 inline-block"/>중립</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block"/>부정</span>
      </div>
    </div>
  )
}

// ── 종목별 영향 예상 패널 ─────────────────────────────────────────────────────
function StockImpactPanel({ articles }: { articles: NewsArticle[] }) {
  // 종목별 긍정/부정 카운트 집계
  const stockMap = new Map<string, { positive: number; negative: number; neutral: number; titles: string[] }>()
  articles.forEach(a => {
    a.sectorAnalysis?.relatedStocks.forEach(({ symbol, impact }) => {
      const cur = stockMap.get(symbol) ?? { positive: 0, negative: 0, neutral: 0, titles: [] }
      stockMap.set(symbol, {
        positive: impact === 'positive' ? cur.positive + 1 : cur.positive,
        negative: impact === 'negative' ? cur.negative + 1 : cur.negative,
        neutral:  impact === 'neutral'  ? cur.neutral  + 1 : cur.neutral,
        titles: [...cur.titles, a.title],
      })
    })
  })
  if (stockMap.size === 0) return null

  const sorted = [...stockMap.entries()]
    .map(([sym, c]) => ({
      sym,
      name: STOCK_INFO[sym]?.name ?? sym,
      ...c,
      score: c.positive - c.negative,
      total: c.positive + c.negative + c.neutral,
    }))
    .sort((a, b) => Math.abs(b.score) - Math.abs(a.score))
    .slice(0, 12)

  return (
    <div className="grid grid-cols-1 gap-2">
      {sorted.map(s => {
        const impact = s.score > 0 ? 'positive' : s.score < 0 ? 'negative' : 'neutral'
        const cfg = IMPACT_CFG[impact]
        return (
          <Link
            key={s.sym}
            to={`/stocks/${encodeURIComponent(s.sym)}`}
            className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            {/* 임팩트 도트 */}
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${cfg.dot}`} />
            {/* 종목명 */}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-800 truncate">{s.name}</p>
              <p className="text-[10px] text-gray-400">{s.sym}</p>
            </div>
            {/* 배지 */}
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${cfg.badge}`}>
              {cfg.label}
            </span>
            {/* 언급 횟수 */}
            <span className="text-[10px] text-gray-400 shrink-0 tabular-nums">{s.total}건</span>
          </Link>
        )
      })}
    </div>
  )
}

// ── 뉴스 카드 ─────────────────────────────────────────────────────────────────
function NewsCard({ article }: { article: NewsArticle }) {
  const [showDetail, setShowDetail] = useState(false)
  const sa = article.sectorAnalysis
  const hasAnalysis = sa && (sa.sectors.length > 0 || sa.relatedStocks.length > 0)

  return (
    <article className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-4">
        {/* 메타 */}
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            article.category === 'global'
              ? 'bg-blue-100 text-blue-600'
              : 'bg-orange-100 text-orange-600'
          }`}>
            {article.category === 'global' ? '글로벌' : '국내'}
          </span>
          <span className="text-[11px] text-gray-400 font-medium">{article.source}</span>
          <span className="text-[11px] text-gray-300">·</span>
          <span className="text-[11px] text-gray-400">{timeAgo(article.publishedAt)}</span>
        </div>

        {/* 본문 */}
        <div className="flex gap-3">
          <div className="min-w-0 flex-1">
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-gray-900 hover:text-blue-600 leading-snug line-clamp-2 block"
            >
              {article.title}
            </a>
            {/* AI 한줄 요약 */}
            {sa?.aiSummary && (
              <p className="text-xs text-blue-500 mt-1.5 font-medium">{sa.aiSummary}</p>
            )}
          </div>
          {article.thumbnailUrl && (
            <img
              src={article.thumbnailUrl}
              alt=""
              className="w-16 h-16 object-cover rounded-xl shrink-0"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          )}
        </div>

        {/* 섹터 태그 (항상 표시) */}
        {sa && sa.sectors.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {sa.sectors.map((s: SectorImpact, i: number) => {
              const cfg = IMPACT_CFG[s.impact]
              return (
                <span
                  key={i}
                  className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${cfg.badge}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                  {s.name}
                </span>
              )
            })}
          </div>
        )}

        {/* 관련 종목 (항상 표시) */}
        {sa && sa.relatedStocks.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <span className="text-[10px] text-gray-400 font-medium">주목 종목</span>
            {sa.relatedStocks.map(({ symbol, impact }) => {
              const cfg = IMPACT_CFG[impact as keyof typeof IMPACT_CFG]
              const name = STOCK_INFO[symbol]?.name ?? symbol
              return (
                <Link
                  key={symbol}
                  to={`/stocks/${encodeURIComponent(symbol)}`}
                  className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-opacity hover:opacity-80 ${cfg.badge}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                  {name}
                </Link>
              )
            })}
          </div>
        )}

        {/* 상세 이유 토글 */}
        {hasAnalysis && sa.sectors.some(s => s.reason) && (
          <button
            onClick={() => setShowDetail(v => !v)}
            className="mt-3 text-[11px] text-gray-400 hover:text-blue-500 transition-colors flex items-center gap-1"
          >
            {showDetail ? '▲ 분석 상세 접기' : '▼ AI 분석 상세 보기'}
          </button>
        )}
      </div>

      {/* 상세 이유 패널 */}
      {showDetail && hasAnalysis && (
        <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-3 space-y-2">
          {sa.sectors.filter(s => s.reason).map((s, i) => (
            <div key={i} className="flex gap-2 text-xs">
              <span className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${IMPACT_CFG[s.impact].dot}`} />
              <div>
                <span className="font-semibold text-gray-700">{s.name}</span>
                <span className="text-gray-500"> — {s.reason}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </article>
  )
}

// ── 로딩 스켈레톤 ─────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse">
          <div className="flex gap-2 mb-3">
            <div className="h-4 bg-gray-100 rounded-full w-12" />
            <div className="h-4 bg-gray-100 rounded-full w-16" />
          </div>
          <div className="flex gap-3">
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-100 rounded w-full" />
              <div className="h-4 bg-gray-100 rounded w-3/4" />
            </div>
            <div className="w-16 h-16 bg-gray-100 rounded-xl shrink-0" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── 메인 페이지 ───────────────────────────────────────────────────────────────
export default function MarketInsights() {
  const [filter, setFilter] = useState<NewsFilter>('all')

  const { data: articles = [], isLoading, isError, refetch, isFetching, dataUpdatedAt } = useQuery({
    queryKey: ['market-news', filter],
    queryFn:  () => fetchMarketNews(filter),
    staleTime: 30 * 60 * 1000,
    retry: 1,
  })

  const handleRefresh = () => { clearNewsCache(); refetch() }

  const analyzedCount = useMemo(() => articles.filter(a => a.sectorAnalysis).length, [articles])
  const hasSummary    = useMemo(() => articles.some(a => a.sectorAnalysis?.sectors.length), [articles])
  const hasStocks     = useMemo(() => articles.some(a => a.sectorAnalysis?.relatedStocks.length), [articles])

  const updatedLabel = dataUpdatedAt
    ? `업데이트 ${new Date(dataUpdatedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`
    : ''

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">

      {/* ── 헤더 ── */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">마켓 인사이트</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            글로벌·국내 뉴스 자동 스크랩 + AI 섹터·종목 영향 분석
            {analyzedCount > 0 && ` · ${analyzedCount}건 분석됨`}
            {updatedLabel && ` · ${updatedLabel}`}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isFetching}
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40"
        >
          <span className={isFetching ? 'animate-spin inline-block' : ''}>↻</span>
          {isFetching ? '분석 중...' : '새로고침'}
        </button>
      </div>

      {/* ── GEMINI KEY 없음 경고 ── */}
      {!GEMINI_KEY && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-700 flex items-start gap-2">
          <span className="shrink-0 mt-0.5">💡</span>
          <span>
            <strong>AI 분석 비활성화 상태</strong> — VITE_GEMINI_API_KEY를 설정하면 섹터·종목별 영향 분석이 활성화됩니다.
          </span>
        </div>
      )}

      {/* ── AI 분석 대시보드 (분석 완료 시) ── */}
      {!isLoading && (hasSummary || hasStocks) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          {/* 섹터 영향 */}
          {hasSummary && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-1.5">
                <span className="text-base">📊</span> 섹터 영향 요약
              </p>
              <SectorSummaryPanel articles={articles} />
            </div>
          )}
          {/* 종목별 영향 */}
          {hasStocks && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-1.5">
                <span className="text-base">🎯</span> 종목별 영향 예상
              </p>
              <StockImpactPanel articles={articles} />
            </div>
          )}
        </div>
      )}

      {/* ── 필터 탭 ── */}
      <div className="flex gap-1 bg-gray-100 rounded-2xl p-1 mb-4">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`flex-1 text-sm font-semibold py-2 rounded-xl transition-all ${
              filter === key
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── 뉴스 목록 ── */}
      {isLoading ? (
        <Skeleton />
      ) : isError ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-3xl mb-3">⚠️</p>
          <p className="text-sm font-medium">뉴스를 불러오지 못했습니다</p>
          <button onClick={() => refetch()} className="mt-3 text-sm text-blue-500 hover:underline">
            다시 시도
          </button>
        </div>
      ) : articles.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-3xl mb-3">📰</p>
          <p className="text-sm font-medium">뉴스를 가져오지 못했습니다</p>
          <p className="text-xs mt-1">네트워크 또는 CORS 프록시 상태를 확인하세요</p>
        </div>
      ) : (
        <div className="space-y-3">
          {articles.map(article => (
            <NewsCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </div>
  )
}
