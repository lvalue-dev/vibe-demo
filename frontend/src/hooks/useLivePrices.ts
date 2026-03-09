import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { StockListItem } from '../types'

interface PriceUpdate {
  symbol: string
  price: number
  priceChangeRate: number
  volume: number
}

/**
 * KIS 실시간 체결 SSE 구독 훅.
 * 백엔드 GET /api/stocks/stream (KIS H0STCNT0 WebSocket → SSE 브로드캐스트) 를 연결.
 * 체결가 수신 시 React Query 캐시('stocks')를 인플레이스 업데이트.
 */
export function useLivePrices(_symbols: string[] = []) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const es = new EventSource('/api/stocks/stream')

    es.addEventListener('price', (e: MessageEvent) => {
      const update: PriceUpdate = JSON.parse(e.data)
      queryClient.setQueryData<StockListItem[]>(['stocks'], (prev) => {
        if (!prev) return prev
        return prev.map((stock) =>
          stock.symbol === update.symbol
            ? {
                ...stock,
                currentPrice: update.price,
                priceChangeRate: update.priceChangeRate,
              }
            : stock
        )
      })
    })

    es.onerror = () => {
      // 브라우저가 자동 재연결 시도 (EventSource 기본 동작)
    }

    return () => es.close()
  }, [queryClient])
}
