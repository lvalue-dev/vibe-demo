/**
 * StockGuide AI 채팅 패널
 *
 * - 우측 하단 플로팅 버튼으로 토글
 * - POST /api/chat → SSE 스트리밍 응답
 * - 캐시 히트 시 즉시 표시 (X-Cache: HIT 헤더)
 * - 추천 질문 버튼 제공
 */

import { useState, useRef, useEffect, useCallback } from 'react'

interface Message {
  role: 'user' | 'assistant'
  text: string
  cached?: boolean
}

const SUGGESTED = [
  '오늘 가장 좋은 주식 추천해줘',
  '강한 매수 신호인 종목은?',
  '위험도 낮은 종목 알려줘',
  '삼성전자 지금 사도 될까?',
]

const API_BASE = import.meta.env.VITE_API_URL || ''

export default function StockChat() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const ask = useCallback(async (question: string) => {
    if (!question.trim() || loading) return

    setMessages(prev => [...prev, { role: 'user', text: question }])
    setInput('')
    setLoading(true)

    let answer = ''
    let cached = false

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      })

      cached = res.headers.get('X-Cache') === 'HIT'

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: '서버 오류' }))
        setMessages(prev => [...prev, {
          role: 'assistant',
          text: err.error ?? '오류가 발생했습니다.',
        }])
        return
      }

      // 스트리밍 읽기
      const reader = res.body?.getReader()
      const decoder = new TextDecoder()

      // 응답 메시지 자리 확보
      setMessages(prev => [...prev, { role: 'assistant', text: '', cached }])

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const lines = decoder.decode(value, { stream: true }).split('\n')
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const payload = line.slice(6).trim()
            if (payload === '[DONE]') break

            try {
              const parsed = JSON.parse(payload)
              if (parsed.error) {
                setMessages(prev => {
                  const updated = [...prev]
                  updated[updated.length - 1] = {
                    role: 'assistant',
                    text: `오류: ${parsed.error}`,
                  }
                  return updated
                })
                return
              }
              if (parsed.text) {
                answer += parsed.text
                setMessages(prev => {
                  const updated = [...prev]
                  updated[updated.length - 1] = {
                    role: 'assistant',
                    text: answer,
                    cached,
                  }
                  return updated
                })
              }
            } catch {
              // JSON 파싱 실패 무시
            }
          }
        }
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: '연결 오류. 잠시 후 다시 시도하세요.',
      }])
    } finally {
      setLoading(false)
    }
  }, [loading])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    ask(input)
  }

  return (
    <>
      {/* 플로팅 버튼 */}
      <button
        onClick={() => setOpen(v => !v)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg flex items-center justify-center transition-all"
        title="AI 주식 상담"
        aria-label="AI 채팅 열기"
      >
        {open ? (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </button>

      {/* 채팅 패널 */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden"
          style={{ maxHeight: '70vh' }}>

          {/* 헤더 */}
          <div className="bg-blue-600 text-white px-4 py-3 flex items-center gap-2">
            <span className="text-lg">🤖</span>
            <div>
              <p className="font-semibold text-sm">StockGuide AI</p>
              <p className="text-xs text-blue-100">실시간 시장 데이터 기반 분석</p>
            </div>
          </div>

          {/* 메시지 영역 */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
            {messages.length === 0 && (
              <div className="text-center py-4">
                <p className="text-gray-500 text-sm mb-3">어떤 종목이 궁금하신가요?</p>
                <div className="space-y-1.5">
                  {SUGGESTED.map(q => (
                    <button
                      key={q}
                      onClick={() => ask(q)}
                      className="block w-full text-left text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-lg transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-bl-sm'
                }`}>
                  {msg.text}
                  {msg.cached && (
                    <span className="block text-right text-xs opacity-50 mt-0.5">캐시</span>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-2xl rounded-bl-sm">
                  <span className="flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* 입력 영역 */}
          <form onSubmit={handleSubmit} className="p-3 border-t border-gray-200 dark:border-gray-700 flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="종목 질문을 입력하세요..."
              maxLength={300}
              disabled={loading}
              className="flex-1 text-sm border border-gray-300 dark:border-gray-600 rounded-full px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="w-9 h-9 flex items-center justify-center bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-full transition-colors"
            >
              <svg className="w-4 h-4 rotate-90" fill="currentColor" viewBox="0 0 24 24">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 pb-2">
            투자 판단은 본인 책임 · AI 참고용
          </p>
        </div>
      )}
    </>
  )
}
