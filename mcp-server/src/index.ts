/**
 * StockGuide MCP Server
 *
 * Claude가 주식 데이터를 조회할 수 있도록 도구를 제공합니다.
 * 백엔드 API (localhost:3001 또는 BACKEND_URL) 를 경유하여 데이터를 가져옵니다.
 *
 * 토큰 최적화:
 *  - 캔들 배열은 전송하지 않고 요약 통계만 반환
 *  - 응답은 JSON 최소화 형태로 직렬화
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import axios from 'axios'
import dotenv from 'dotenv'

dotenv.config()

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:3001'

// ── 백엔드 API 헬퍼 ──────────────────────────────────────────────────────────

async function fetchStocks() {
  const { data } = await axios.get(`${BACKEND}/api/stocks`, { timeout: 8000 })
  return data as StockSummary[]
}

async function fetchStockDetail(symbol: string) {
  const { data } = await axios.get(
    `${BACKEND}/api/stocks/${encodeURIComponent(symbol)}`,
    { timeout: 10000 }
  )
  return data as StockDetail
}

// ── 타입 ─────────────────────────────────────────────────────────────────────

interface StockSummary {
  symbol: string
  name: string
  market: string
  currentPrice: number
  priceChangeRate: number
  score: number | null
  recommendation: string | null
  risk: string | null
}

interface StockDetail extends StockSummary {
  prevClose: number
  volume: number
  reasons: string[]
  ma5: number | null
  ma20: number | null
  volumeRatio: number | null
  sector?: string
}

// ── MCP 서버 설정 ────────────────────────────────────────────────────────────

const server = new Server(
  { name: 'stockguide-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } }
)

// ── 도구 목록 ────────────────────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'get_market_summary',
      description:
        '전체 시장 요약: 추천 종목 수, 상위 매수 후보, 시장별 현황을 반환합니다. 사용자가 "오늘 어떤 주식이 좋아?" 같은 질문을 할 때 사용하세요.',
      inputSchema: {
        type: 'object',
        properties: {
          top_n: {
            type: 'number',
            description: '상위 종목 수 (기본 5, 최대 10)',
          },
        },
      },
    },
    {
      name: 'get_stock_detail',
      description:
        '특정 종목의 상세 분석 정보(현재가, 추천, 점수, 위험도, 이유)를 반환합니다.',
      inputSchema: {
        type: 'object',
        properties: {
          symbol: {
            type: 'string',
            description: '종목 심볼 (예: 005930.KS, AAPL)',
          },
        },
        required: ['symbol'],
      },
    },
    {
      name: 'search_stocks',
      description: '종목명 또는 심볼로 검색합니다.',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: '검색어 (예: 삼성, Apple, NVDA)',
          },
        },
        required: ['query'],
      },
    },
    {
      name: 'get_recommendation_list',
      description:
        '특정 추천 등급(STRONG_BUY / BUY / HOLD / SELL) 또는 위험도(LOW / MEDIUM / HIGH)의 종목 목록을 반환합니다.',
      inputSchema: {
        type: 'object',
        properties: {
          recommendation: {
            type: 'string',
            enum: ['STRONG_BUY', 'BUY', 'HOLD', 'SELL'],
          },
          risk: {
            type: 'string',
            enum: ['LOW', 'MEDIUM', 'HIGH'],
          },
          market: {
            type: 'string',
            description: '시장 필터 (예: KOSPI, KOSDAQ, NYSE, NASDAQ)',
          },
        },
      },
    },
  ],
}))

// ── 도구 실행 ────────────────────────────────────────────────────────────────

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args = {} } = req.params

  try {
    switch (name) {
      case 'get_market_summary': {
        const stocks = await fetchStocks()
        const topN = Math.min(Number(args.top_n ?? 5), 10)

        const scored = stocks.filter((s) => s.score !== null)
        const byScore = [...scored].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))

        const counts = {
          STRONG_BUY: scored.filter((s) => s.recommendation === 'STRONG_BUY').length,
          BUY: scored.filter((s) => s.recommendation === 'BUY').length,
          HOLD: scored.filter((s) => s.recommendation === 'HOLD').length,
          SELL: scored.filter((s) => s.recommendation === 'SELL').length,
          unanalyzed: stocks.length - scored.length,
          total: stocks.length,
        }

        const top = byScore.slice(0, topN).map((s) => ({
          symbol: s.symbol,
          name: s.name,
          market: s.market,
          price: s.currentPrice,
          change: `${(s.priceChangeRate * 100).toFixed(2)}%`,
          score: s.score,
          rec: s.recommendation,
          risk: s.risk,
        }))

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ counts, top_picks: top }, null, 0),
            },
          ],
        }
      }

      case 'get_stock_detail': {
        const symbol = String(args.symbol)
        const d = await fetchStockDetail(symbol)

        // 토큰 절약: chartData 제외, 요약 통계만 전달
        const summary = {
          symbol: d.symbol,
          name: d.name,
          market: d.market,
          sector: d.sector ?? '-',
          price: d.currentPrice,
          prevClose: d.prevClose,
          change: `${(d.priceChangeRate * 100).toFixed(2)}%`,
          volume: d.volume,
          score: d.score,
          recommendation: d.recommendation,
          risk: d.risk,
          ma5: d.ma5?.toFixed(0) ?? null,
          ma20: d.ma20?.toFixed(0) ?? null,
          volumeRatio: d.volumeRatio?.toFixed(2) ?? null,
          reasons: d.reasons,
        }

        return {
          content: [{ type: 'text', text: JSON.stringify(summary, null, 0) }],
        }
      }

      case 'search_stocks': {
        const query = String(args.query).toLowerCase()
        const stocks = await fetchStocks()

        const results = stocks
          .filter(
            (s) =>
              s.name.toLowerCase().includes(query) ||
              s.symbol.toLowerCase().includes(query)
          )
          .slice(0, 8)
          .map((s) => ({
            symbol: s.symbol,
            name: s.name,
            market: s.market,
            price: s.currentPrice,
            rec: s.recommendation ?? '-',
            score: s.score ?? '-',
          }))

        return {
          content: [{ type: 'text', text: JSON.stringify(results, null, 0) }],
        }
      }

      case 'get_recommendation_list': {
        const stocks = await fetchStocks()
        let filtered = stocks.filter((s) => s.score !== null)

        if (args.recommendation) {
          filtered = filtered.filter((s) => s.recommendation === args.recommendation)
        }
        if (args.risk) {
          filtered = filtered.filter((s) => s.risk === args.risk)
        }
        if (args.market) {
          filtered = filtered.filter((s) =>
            s.market.toUpperCase().includes(String(args.market).toUpperCase())
          )
        }

        const result = filtered
          .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
          .slice(0, 15)
          .map((s) => ({
            symbol: s.symbol,
            name: s.name,
            market: s.market,
            price: s.currentPrice,
            change: `${(s.priceChangeRate * 100).toFixed(2)}%`,
            score: s.score,
            rec: s.recommendation,
            risk: s.risk,
          }))

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 0) }],
        }
      }

      default:
        throw new Error(`Unknown tool: ${name}`)
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return {
      content: [{ type: 'text', text: `Error: ${msg}` }],
      isError: true,
    }
  }
})

// ── 시작 ─────────────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('[MCP] StockGuide MCP Server running (stdio)')
}

main().catch(console.error)
