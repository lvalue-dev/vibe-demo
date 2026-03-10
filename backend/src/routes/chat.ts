/**
 * AI 채팅 엔드포인트 – Google Gemini (무료 티어)
 *
 * POST /api/chat
 * Body: { question: string }
 * Response: SSE stream (text/event-stream)
 *
 * 무료 한도: gemini-2.0-flash 기준 15 RPM, 100만 토큰/일
 * API 키 발급: https://aistudio.google.com (신용카드 불필요)
 *
 * 토큰 절약:
 *  - 인메모리 캐시 5분 (동일 질문 재사용)
 *  - 컨텍스트 압축: 캔들 배열 미포함, 상위 10종목 요약만 전달
 */

import { Router, Request, Response } from 'express'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { getCache } from '../stockCache'

export const chatRouter = Router()

// ── Gemini 클라이언트 (지연 초기화) ──────────────────────────────────────────
let genAI: GoogleGenerativeAI | null = null

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '')
  return genAI
}

// ── 응답 캐시 ────────────────────────────────────────────────────────────────
interface CacheEntry { answer: string; expiresAt: number }
const responseCache = new Map<string, CacheEntry>()
const CACHE_TTL = 5 * 60 * 1000

function getCached(key: string): string | null {
  const entry = responseCache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) { responseCache.delete(key); return null }
  return entry.answer
}

function setCache(key: string, answer: string): void {
  if (responseCache.size >= 200) {
    const first = responseCache.keys().next().value
    if (first) responseCache.delete(first)
  }
  responseCache.set(key, { answer, expiresAt: Date.now() + CACHE_TTL })
}

// ── 컨텍스트 압축 ────────────────────────────────────────────────────────────
function buildMarketContext(): string {
  const stocks = getCache()
  if (stocks.length === 0) return '현재 주식 데이터 없음.'

  const analyzed = stocks.filter(s => s.score !== null)
  const counts = {
    total: stocks.length,
    strongBuy: analyzed.filter(s => s.recommendation === 'STRONG_BUY').length,
    buy: analyzed.filter(s => s.recommendation === 'BUY').length,
    hold: analyzed.filter(s => s.recommendation === 'HOLD').length,
    sell: analyzed.filter(s => s.recommendation === 'SELL').length,
  }

  const top10 = [...analyzed]
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 10)
    .map(s =>
      `${s.name}(${s.symbol}):${s.recommendationLabel} 점수${s.score} ` +
      `${(s.priceChangeRate * 100).toFixed(1)}% 위험${s.riskLabel}`
    ).join('\n')

  return `총${counts.total}종목 강매수:${counts.strongBuy} 매수:${counts.buy} ` +
    `관망:${counts.hold} 매도:${counts.sell}\n주요종목:\n${top10}`
}

// ── POST /api/chat ────────────────────────────────────────────────────────────
chatRouter.post('/', async (req: Request, res: Response) => {
  const question = (req.body?.question ?? '').trim()
  if (!question) { res.status(400).json({ error: '질문을 입력하세요.' }); return }
  if (question.length > 300) { res.status(400).json({ error: '질문은 300자 이하로 입력하세요.' }); return }

  if (!process.env.GEMINI_API_KEY) {
    res.status(503).json({ error: 'AI 기능 미설정. GEMINI_API_KEY를 backend/.env에 추가하세요.' })
    return
  }

  const cacheKey = question.toLowerCase()
  const cached = getCached(cacheKey)
  if (cached) {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('X-Cache', 'HIT')
    res.write(`data: ${JSON.stringify({ text: cached })}\n\n`)
    res.write('data: [DONE]\n\n')
    res.end()
    return
  }

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Cache', 'MISS')

  const systemInstruction =
    `당신은 StockGuide 주식 투자 AI 어시스턴트입니다. 한국 주식 초보자에게 쉽게 설명하세요.\n` +
    `규칙: 한국어로 250자 이내, 수치와 이유 포함, 투자 손실 위험 언급.\n\n` +
    `현재 시장 데이터:\n${buildMarketContext()}`

  try {
    const model = getGenAI().getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction,
    })

    const result = await model.generateContentStream(question)
    let fullAnswer = ''

    for await (const chunk of result.stream) {
      const text = chunk.text()
      if (text) {
        fullAnswer += text
        res.write(`data: ${JSON.stringify({ text })}\n\n`)
      }
    }

    if (fullAnswer) setCache(cacheKey, fullAnswer)
    res.write('data: [DONE]\n\n')
    res.end()
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '알 수 없는 오류'
    console.error('[Chat] Gemini error:', msg)
    res.write(`data: ${JSON.stringify({ error: `AI 오류: ${msg}` })}\n\n`)
    res.write('data: [DONE]\n\n')
    res.end()
  }
})
