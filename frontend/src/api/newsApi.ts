/**
 * 뉴스 스크랩 + Gemini 섹터 영향 분석
 *
 * - 글로벌: Yahoo Finance v1/finance/search (영문 뉴스)
 * - 국내:   연합뉴스 RSS / 한국경제 RSS (한국어 뉴스)
 * - 분석:   Gemini 2.5 Flash → 섹터 영향 + 관련 종목 추출
 *
 * 개발계/운영계 모두 동일 소스 사용 (뉴스는 KIS API 미제공)
 */
import type { NewsArticle, SectorImpact } from '../types'

const YF    = 'https://query1.finance.yahoo.com'
const PROXY = 'https://corsproxy.io/?url='

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY || ''
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`

// ── 뉴스 캐시 (1시간 TTL) ────────────────────────────────────────────────────
const NEWS_TTL = 60 * 60 * 1000  // 1시간
interface CacheEntry { data: NewsArticle[]; fetchedAt: number }
const cache = new Map<string, CacheEntry>()

// ── CORS 우회 fetch ───────────────────────────────────────────────────────────
async function proxiedFetch(url: string, isXml = false): Promise<string | null> {
  // 직접 시도
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (r.ok) return isXml ? r.text() : r.text()
  } catch { /* CORS 차단 → 프록시로 재시도 */ }

  try {
    const r = await fetch(`${PROXY}${encodeURIComponent(url)}`, {
      signal: AbortSignal.timeout(12000),
    })
    if (r.ok) return r.text()
  } catch { /* 실패 시 null 반환 */ }

  return null
}

// ── 글로벌 뉴스: Yahoo Finance search API ────────────────────────────────────
const GLOBAL_QUERIES = [
  'interest rate federal reserve',
  'technology semiconductor AI',
  'oil energy market',
  'global economy inflation',
  'Korea stock market',
]

async function fetchGlobalNews(): Promise<NewsArticle[]> {
  const articles: NewsArticle[] = []

  await Promise.allSettled(
    GLOBAL_QUERIES.map(async (q) => {
      const url = `${YF}/v1/finance/search?q=${encodeURIComponent(q)}&newsCount=3&lang=en-US&region=US`
      const raw = await proxiedFetch(url)
      if (!raw) return

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parsed: any = JSON.parse(raw)
      const news = parsed?.news ?? []

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      news.forEach((n: any) => {
        if (!n.title || !n.link) return
        articles.push({
          id:          n.uuid ?? `yf-${Date.now()}-${Math.random()}`,
          title:       n.title,
          summary:     n.summary ?? n.title,
          source:      n.publisher ?? 'Yahoo Finance',
          url:         n.link,
          publishedAt: n.providerPublishTime
            ? new Date(n.providerPublishTime * 1000).toISOString()
            : new Date().toISOString(),
          category:     'global',
          thumbnailUrl: n.thumbnail?.resolutions?.[0]?.url,
        })
      })
    })
  )

  // 중복 제거 (uuid 기준)
  const seen = new Set<string>()
  return articles.filter(a => {
    if (seen.has(a.id)) return false
    seen.add(a.id)
    return true
  }).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
}

// ── 국내 뉴스: RSS XML 파싱 ───────────────────────────────────────────────────
const KOREAN_RSS_FEEDS = [
  { url: 'https://www.yonhapnewstv.co.kr/category/news/economy/feed/', source: '연합뉴스TV' },
  { url: 'https://www.hankyung.com/feed/economy',                       source: '한국경제' },
  { url: 'https://rss.mk.co.kr/rss/30200030/',                          source: '매일경제' },
]

function parseRssXml(xml: string, source: string): NewsArticle[] {
  const parser = new DOMParser()
  const doc    = parser.parseFromString(xml, 'application/xml')
  const items  = Array.from(doc.querySelectorAll('item'))

  return items.slice(0, 5).map((item): NewsArticle => {
    const title   = item.querySelector('title')?.textContent?.trim() ?? '제목 없음'
    const link    = item.querySelector('link')?.textContent?.trim()
              ?? item.querySelector('guid')?.textContent?.trim() ?? '#'
    const desc    = item.querySelector('description')?.textContent?.replace(/<[^>]*>/g, '').trim() ?? ''
    const pubDate = item.querySelector('pubDate')?.textContent?.trim() ?? ''

    return {
      id:          `rss-${source}-${link}`,
      title,
      summary:     desc.slice(0, 200),
      source,
      url:         link,
      publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      category:    'korean',
    }
  })
}

async function fetchKoreanNews(): Promise<NewsArticle[]> {
  const results = await Promise.allSettled(
    KOREAN_RSS_FEEDS.map(async ({ url, source }) => {
      const xml = await proxiedFetch(url, true)
      if (!xml) return []
      return parseRssXml(xml, source)
    })
  )

  return results
    .flatMap(r => r.status === 'fulfilled' ? r.value : [])
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
}

// ── Gemini 섹터 영향 분석 ─────────────────────────────────────────────────────
// 우리 앱에 있는 대표 섹터
const APP_SECTORS = [
  '반도체', 'IT/소프트웨어', '자동차/모빌리티', '바이오/헬스케어',
  '에너지/화학', '금융/은행', '엔터테인먼트', '이커머스/플랫폼',
  '방산/항공', '철강/소재', '소비재', '미국 빅테크',
]

async function analyzeWithGemini(articles: NewsArticle[]): Promise<NewsArticle[]> {
  if (!GEMINI_KEY || articles.length === 0) return articles

  // 배치 처리: 4개씩 묶어 분석 (토큰 절약)
  const batches: NewsArticle[][] = []
  for (let i = 0; i < articles.length; i += 4) {
    batches.push(articles.slice(i, i + 4))
  }

  const analyzed = [...articles]

  await Promise.allSettled(
    batches.map(async (batch) => {
      const articleList = batch.map((a, i) =>
        `[${i + 1}] 제목: ${a.title}\n요약: ${a.summary.slice(0, 150)}`
      ).join('\n\n')

      const prompt = `다음 뉴스 기사들이 한국 및 미국 주식 시장에 미칠 영향을 분석하세요.

관련 섹터 목록: ${APP_SECTORS.join(', ')}

뉴스 기사:
${articleList}

각 기사에 대해 아래 JSON 형식으로만 응답하세요 (설명 없이 JSON만):
[
  {
    "index": 1,
    "sectors": [{"name": "반도체", "impact": "positive", "reason": "AI 칩 수요 증가로 반도체 수요 확대 예상"}],
    "relatedStocks": [
      {"symbol": "NVDA", "impact": "positive"},
      {"symbol": "000660.KS", "impact": "positive"},
      {"symbol": "INTC", "impact": "negative"}
    ],
    "aiSummary": "30자 이내 핵심 요약"
  }
]

relatedStocks의 symbol은 반드시 실제 주식 티커(예: AAPL, 005930.KS, NVDA)를 사용하세요.
impact는 해당 종목이 이 뉴스로 인해 긍정적("positive"), 부정적("negative"), 중립적("neutral") 영향을 받을지 판단하세요.`

      try {
        const res = await fetch(GEMINI_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }], role: 'user' }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
          }),
          signal: AbortSignal.timeout(20000),
        })
        if (!res.ok) return

        const data = await res.json()
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

        // JSON 추출 (마크다운 코드블록 제거)
        const jsonMatch = text.match(/\[[\s\S]*\]/)
        if (!jsonMatch) return

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const parsed: any[] = JSON.parse(jsonMatch[0])

        parsed.forEach((item) => {
          const article = batch[item.index - 1]
          if (!article) return
          const idx = analyzed.findIndex(a => a.id === article.id)
          if (idx < 0) return
          analyzed[idx] = {
            ...analyzed[idx],
            sectorAnalysis: {
              sectors:       (item.sectors ?? []) as SectorImpact[],
              relatedStocks: item.relatedStocks ?? [],
              aiSummary:     item.aiSummary ?? '',
            },
          }
        })
      } catch { /* Gemini 실패 시 원본 유지 */ }
    })
  )

  return analyzed
}

// ── 공개 API ──────────────────────────────────────────────────────────────────
export type NewsFilter = 'all' | 'global' | 'korean'

export async function fetchMarketNews(filter: NewsFilter = 'all'): Promise<NewsArticle[]> {
  const cacheKey = filter
  const cached   = cache.get(cacheKey)
  if (cached && Date.now() - cached.fetchedAt < NEWS_TTL) return cached.data

  let articles: NewsArticle[] = []

  if (filter === 'global' || filter === 'all') {
    const global = await fetchGlobalNews()
    articles = [...articles, ...global]
  }
  if (filter === 'korean' || filter === 'all') {
    const korean = await fetchKoreanNews()
    articles = [...articles, ...korean]
  }

  // Gemini 섹터 분석 (상위 12개만 — 토큰 절약)
  const top = articles.slice(0, 12)
  const rest = articles.slice(12)
  const analyzed = await analyzeWithGemini(top)

  const result = [...analyzed, ...rest]
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))

  cache.set(cacheKey, { data: result, fetchedAt: Date.now() })
  return result
}

/** 캐시 강제 초기화 (수동 새로고침) */
export function clearNewsCache(): void {
  cache.clear()
}
