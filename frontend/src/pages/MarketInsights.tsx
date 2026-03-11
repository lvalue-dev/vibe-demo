/**
 * 마켓 인사이트 페이지
 * 글로벌 + 국내 뉴스 스크랩 → Gemini AI 섹터 영향 분석
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchMarketNews, clearNewsCache, type NewsFilter } from '../api/newsApi'
import type { NewsArticle, SectorImpact } from '../types'

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY || ''

// ── 필터 탭 ───────────────────────────────────────────────────────────────────
const FILTERS: { key: NewsFilter; label: string }[] = [
  { key: 'all',    label: '전체' },
  { key: 'global', label: '글로벌' },
  { key: 'korean', label: '국내' },
]

// ── 섹터 임팩트 배지 ──────────────────────────────────────────────────────────
function ImpactBadge({ impact }: { impact: SectorImpact['impact'] }) {
  const cfg = {
    positive: { label: '▲ 긍정', className: 'bg-green-100 text-green-700' },
    negative: { label: '▼ 부정', className: 'bg-red-100 text-red-600' },
    neutral:  { label: '→ 중립', className: 'bg-gray-100 text-gray-500' },
  }[impact]
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${cfg.className}`}>
      {cfg.label}
    </span>
  )
}

// ── 경과 시간 표시 ────────────────────────────────────────────────────────────
function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (diff < 1)   return '방금'
  if (diff < 60)  return `${diff}분 전`
  if (diff < 1440) return `${Math.floor(diff / 60)}시간 전`
  return `${Math.floor(diff / 1440)}일 전`
}

// ── 뉴스 카드 ─────────────────────────────────────────────────────────────────
function NewsCard({ article }: { article: NewsArticle }) {
  const [expanded, setExpanded] = useState(false)
  const sa = article.sectorAnalysis

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* 썸네일 + 헤더 */}
      <div className="p-4">
        <div className="flex gap-3">
          {article.thumbnailUrl && (
            <img
              src={article.thumbnailUrl}
              alt=""
              className="w-16 h-16 object-cover rounded-lg shrink-0"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                article.category === 'global'
                  ? 'bg-blue-100 text-blue-600'
                  : 'bg-orange-100 text-orange-600'
              }`}>
                {article.category === 'global' ? '글로벌' : '국내'}
              </span>
              <span className="text-[10px] text-gray-400">{article.source}</span>
              <span className="text-[10px] text-gray-300">·</span>
              <span className="text-[10px] text-gray-400">{timeAgo(article.publishedAt)}</span>
            </div>
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-gray-800 hover:text-blue-600 leading-snug line-clamp-2"
            >
              {article.title}
            </a>
          </div>
        </div>

        {/* AI 요약 한 줄 */}
        {sa?.aiSummary && (
          <p className="text-xs text-blue-600 mt-2 pl-1 border-l-2 border-blue-300">
            {sa.aiSummary}
          </p>
        )}
      </div>

      {/* 섹터 분석 */}
      {sa && sa.sectors.length > 0 && (
        <div className="border-t border-gray-50 px-4 py-3 bg-gray-50/50">
          <button
            onClick={() => setExpanded(v => !v)}
            className="flex items-center justify-between w-full text-xs text-gray-500 font-medium"
          >
            <span>영향 섹터 분석 ({sa.sectors.length}개)</span>
            <span>{expanded ? '▲' : '▼'}</span>
          </button>

          {/* 섹터 태그 요약 (항상 표시) */}
          <div className="flex flex-wrap gap-1 mt-2">
            {sa.sectors.map((s, i) => (
              <div key={i} className="flex items-center gap-1">
                <span className="text-[11px] text-gray-700 font-medium">{s.name}</span>
                <ImpactBadge impact={s.impact} />
              </div>
            ))}
          </div>

          {/* 상세 이유 (expanded) */}
          {expanded && (
            <div className="mt-3 space-y-2">
              {sa.sectors.map((s, i) => (
                <div key={i} className="text-xs text-gray-600">
                  <span className="font-semibold text-gray-700">{s.name}</span>
                  {s.reason && <span className="text-gray-500"> — {s.reason}</span>}
                </div>
              ))}
              {sa.relatedSymbols.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-2 border-t border-gray-200">
                  <span className="text-[10px] text-gray-400">관련 종목:</span>
                  {sa.relatedSymbols.map(sym => (
                    <a
                      key={sym}
                      href={`/stocks/${encodeURIComponent(sym)}`}
                      className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded hover:bg-blue-100 transition-colors"
                    >
                      {sym}
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── 섹터 영향 요약 패널 ───────────────────────────────────────────────────────
function SectorSummaryPanel({ articles }: { articles: NewsArticle[] }) {
  const sectorMap = new Map<string, { positive: number; negative: number; neutral: number }>()

  articles.forEach(a => {
    a.sectorAnalysis?.sectors.forEach(s => {
      const cur = sectorMap.get(s.name) ?? { positive: 0, negative: 0, neutral: 0 }
      sectorMap.set(s.name, { ...cur, [s.impact]: cur[s.impact as keyof typeof cur] + 1 })
    })
  })

  if (sectorMap.size === 0) return null

  const sorted = [...sectorMap.entries()]
    .map(([name, counts]) => ({
      name, ...counts,
      score: counts.positive - counts.negative,
      total: counts.positive + counts.negative + counts.neutral,
    }))
    .sort((a, b) => Math.abs(b.score) - Math.abs(a.score))
    .slice(0, 8)

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4">
      <p className="text-sm font-bold text-gray-800 mb-3">섹터 영향 요약</p>
      <div className="space-y-2">
        {sorted.map(s => (
          <div key={s.name} className="flex items-center gap-2">
            <span className="text-xs text-gray-700 w-28 shrink-0 font-medium">{s.name}</span>
            <div className="flex-1 flex gap-0.5 h-4">
              {/* 긍정 바 */}
              <div
                className="bg-green-400 rounded-l"
                style={{ width: `${s.total > 0 ? (s.positive / s.total) * 100 : 0}%`, minWidth: s.positive > 0 ? 4 : 0 }}
              />
              {/* 중립 바 */}
              <div
                className="bg-gray-200"
                style={{ width: `${s.total > 0 ? (s.neutral / s.total) * 100 : 0}%` }}
              />
              {/* 부정 바 */}
              <div
                className="bg-red-400 rounded-r"
                style={{ width: `${s.total > 0 ? (s.negative / s.total) * 100 : 0}%`, minWidth: s.negative > 0 ? 4 : 0 }}
              />
            </div>
            <span className={`text-[11px] font-bold w-12 text-right ${
              s.score > 0 ? 'text-green-600' : s.score < 0 ? 'text-red-500' : 'text-gray-400'
            }`}>
              {s.score > 0 ? `+${s.score}` : s.score}
            </span>
          </div>
        ))}
      </div>
      <div className="flex gap-3 mt-3 pt-2 border-t border-gray-100 text-[10px] text-gray-400">
        <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-400 rounded" />긍정</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 bg-gray-200 rounded" />중립</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-400 rounded" />부정</span>
      </div>
    </div>
  )
}

// ── 로딩 스켈레톤 ─────────────────────────────────────────────────────────────
function NewsSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse">
          <div className="flex gap-3">
            <div className="w-16 h-16 bg-gray-100 rounded-lg shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-gray-100 rounded w-24" />
              <div className="h-4 bg-gray-100 rounded w-full" />
              <div className="h-4 bg-gray-100 rounded w-3/4" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── 메인 페이지 ───────────────────────────────────────────────────────────────
export default function MarketInsights() {
  const [filter, setFilter] = useState<NewsFilter>('all')

  const { data: articles = [], isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['market-news', filter],
    queryFn:  () => fetchMarketNews(filter),
    staleTime: 30 * 60 * 1000,  // 30분
    retry: 1,
  })

  const handleRefresh = () => {
    clearNewsCache()
    refetch()
  }

  const analyzedCount = articles.filter(a => a.sectorAnalysis).length

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">마켓 인사이트</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            글로벌·국내 경제 뉴스 스크랩 + AI 섹터 영향 분석
            {analyzedCount > 0 && ` · ${analyzedCount}건 AI 분석 완료`}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isFetching}
          className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          {isFetching ? '로딩 중...' : '새로고침'}
        </button>
      </div>

      {/* 필터 탭 */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-4">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`flex-1 text-sm font-semibold py-2 rounded-lg transition-all ${
              filter === key
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* AI 섹터 요약 */}
      {!isLoading && analyzedCount > 0 && (
        <SectorSummaryPanel articles={articles} />
      )}

      {/* 뉴스 목록 */}
      {isLoading ? (
        <NewsSkeleton />
      ) : isError ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-3xl mb-2">⚠️</div>
          <p className="text-sm">뉴스를 불러오지 못했습니다.</p>
          <button
            onClick={() => refetch()}
            className="mt-3 text-sm text-blue-600 hover:underline"
          >
            다시 시도
          </button>
        </div>
      ) : articles.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-3xl mb-2">📰</div>
          <p className="text-sm">뉴스를 가져오지 못했습니다.</p>
          <p className="text-xs mt-1">네트워크 상태 또는 CORS 프록시를 확인하세요.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {articles.map(article => (
            <NewsCard key={article.id} article={article} />
          ))}
          {/* GEMINI 키 없음 안내 */}
          {!GEMINI_KEY && (
            <div className="text-center py-4 text-xs text-gray-400 bg-yellow-50 rounded-xl border border-yellow-100">
              💡 VITE_GEMINI_API_KEY를 설정하면 AI 섹터 영향 분석이 활성화됩니다.
            </div>
          )}
        </div>
      )}
    </div>
  )
}


