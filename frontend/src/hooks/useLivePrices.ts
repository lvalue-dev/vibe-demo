import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { StockListItem } from '../types'

interface PriceUpdate {
  symbol: string
  price: number
  changeRate: number
  volume: number
}

/**
 * KIS 실시간 체결 SSE 구독 훅.
 * 백엔드 GET /api/stocks/stream/sse 를 연결.
 * broadcastPrice()가 event name 없이 data: 만 전송하므로 onmessage로 수신.
 */
export function useLivePrices(_symbols: string[] = []) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const apiOrigin = import.meta.env.VITE_API_URL ?? ''
    const es = new EventSource(`${apiOrigin}/api/stocks/stream/sse`)

    es.onmessage = (e: MessageEvent) => {
      const update: PriceUpdate = JSON.parse(e.data)
      if (!update.symbol) return
      queryClient.setQueryData<StockListItem[]>(['stocks'], (prev) => {
        if (!prev) return prev
        return prev.map((stock) =>
          stock.symbol === update.symbol
            ? {
                ...stock,
                currentPrice: update.price,
                priceChangeRate: update.changeRate,
                volume: update.volume,
              }
            : stock
        )
      })
    }

    es.onerror = () => {
      // 브라우저가 자동 재연결 (EventSource 기본 동작)
    }

    return () => es.close()
  }, [queryClient])
}
