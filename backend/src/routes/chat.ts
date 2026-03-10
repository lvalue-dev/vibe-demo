/**
 * AI 채팅 엔드포인트
 *
 * POST /api/chat
 * Body: { question: string }
 * Response: SSE stream (text/event-stream)
 *
 * 토큰 최적화 전략:
 *  1. 캐시: 동일 질문은 5분간 재사용 (API 호출 없음)
 *  2. 컨텍스트 압축: 점수/추천/이유만 전달, 캔들 배열 미포함
 *  3. 시장 요약은 상위 10종목만 전달
 *  4. max_tokens 600 으로 제한
 *  5. claude-opus-4-6 사용 (기본 권장 모델)
 */

import { Router, Request, Response } from 'express'
import Anthropic from '@anthropic-ai/sdk'
import { getCache } from '../stockCache'

export const chatRouter = Router()

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY ?? '',
})

// ── 응답 캐시 (토큰 절약) ─────────────────────────────────────────────────────
interface CacheEntry {
  answer: string
  expiresAt: number
}

const responseCache = new Map<string, CacheEntry>()
const CACHE_TTL = 5 * 60 * 1000 // 5분

function getCached(key: string): string | null {
  const entry = responseCache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    responseCache.delete(key)
    return null
  }
  return entry.answer
}

function setCache(key: string, answer: string): void {
  // 캐시 사이즈 제한: 200개 초과 시 가장 오래된 항목 제거
  if (responseCache.size >= 200) {
    const firstKey = responseCache.keys().next().value
    if (firstKey) responseCache.delete(firstKey)
  }
  responseCache.set(key, { answer, expiresAt: Date.now() + CACHE_TTL })
}

// ── 컨텍스트 압축: 캐시에서 요약 데이터만 추출 ───────────────────────────────
function buildMarketContext(): string {
  const stocks = getCache()
  if (stocks.length === 0) return '현재 주식 데이터가 없습니다. 잠시 후 다시 시도하세요.'

  // 분석 완료 종목만
  const analyzed = stocks.filter(s => s.score !== null)

  const counts = {
    total: stocks.length,
    analyzed: analyzed.length,
    strongBuy: analyzed.filter(s => s.recommendation === 'STRONG_BUY').length,
    buy: analyzed.filter(s => s.recommendation === 'BUY').length,
    hold: analyzed.filter(s => s.recommendation === 'HOLD').length,
    sell: analyzed.filter(s => s.recommendation === 'SELL').length,
  }

  // 상위 10종목 (점수 높은 순) – 캔들 없이 핵심 지표만
  const top10 = [...analyzed]
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 10)
    .map(s =>
      `${s.name}(${s.symbol}): ${s.recommendationLabel} 점수${s.score} ` +
      `${(s.priceChangeRate * 100).toFixed(1)}% 위험${s.riskLabel}`
    )
    .join('\n')

  return `[시장 현황]\n총${counts.total}종목 분석완료${counts.analyzed}\n` +
    `강한매수:${counts.strongBuy} 매수:${counts.buy} 관망:${counts.hold} 매도:${counts.sell}\n\n` +
    `[주요 종목 TOP10]\n${top10}`
}

// ── POST /api/chat ────────────────────────────────────────────────────────────
chatRouter.post('/', async (req: Request, res: Response) => {
  const question = (req.body?.question ?? '').trim()
  if (!question) {
    res.status(400).json({ error: '질문을 입력하세요.' })
    return
  }
  if (question.length > 300) {
    res.status(400).json({ error: '질문은 300자 이하로 입력하세요.' })
    return
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(503).json({ error: 'AI 기능이 설정되지 않았습니다. ANTHROPIC_API_KEY를 설정하세요.' })
    return
  }

  // 캐시 확인
  const cacheKey = question.toLowerCase()
  const cached = getCached(cacheKey)
  if (cached) {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('X-Cache', 'HIT')
    res.write(`data: ${JSON.stringify({ text: cached })}\n\n`)
    res.write('data: [DONE]\n\n')
    res.end()
    return
  }

  // SSE 스트리밍 설정
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Cache', 'MISS')

  const marketContext = buildMarketContext()

  const systemPrompt = `당신은 StockGuide의 주식 투자 AI 어시스턴트입니다.
주식 초보자에게 쉽고 명확하게 설명하는 것이 목표입니다.

규칙:
- 한국어로 간결하게 답변하세요 (300자 이내)
- 구체적인 수치와 이유를 포함하세요
- 투자 손실 위험을 항상 인지시키세요
- 제공된 데이터 외 정보는 "최신 뉴스는 직접 확인하세요"라고 안내하세요

현재 시장 데이터:
${marketContext}`

  let fullAnswer = ''

  try {
    const stream = anthropic.messages.stream({
      model: 'claude-opus-4-6',
      max_tokens: 600,
      system: systemPrompt,
      messages: [{ role: 'user', content: question }],
    })

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        const text = event.delta.text
        fullAnswer += text
        res.write(`data: ${JSON.stringify({ text })}\n\n`)
      }
    }

    // 완료 후 캐시 저장
    if (fullAnswer) setCache(cacheKey, fullAnswer)

    res.write('data: [DONE]\n\n')
    res.end()
  } catch (err: unknown) {
    const msg = err instanceof Anthropic.APIError
      ? `API 오류 (${err.status}): ${err.message}`
      : err instanceof Error ? err.message : '알 수 없는 오류'

    console.error('[Chat] Error:', msg)
    res.write(`data: ${JSON.stringify({ error: msg })}\n\n`)
    res.write('data: [DONE]\n\n')
    res.end()
  }
})
