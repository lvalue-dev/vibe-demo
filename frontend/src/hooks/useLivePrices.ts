/**
 * SSE로 실시간 가격을 수신해 React Query 캐시를 직접 갱신.
 * 백엔드 미설정 시 자동으로 비활성화.
 */
import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { subscribeSSE, isBackendEnabled } from '../api/backendApi'
import type { StockListItem } from '../types'

export function useLivePrices(symbols: string[] = []) {
  const qc = useQueryClient()
  const unsubRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!isBackendEnabled) return

    const unsub = subscribeSSE(symbols, (update) => {
      // 목록 캐시 갱신
      qc.setQueryData<StockListItem[]>(['stocks'], (old) =>
        old?.map(s =>
          s.symbol === update.symbol
            ? { ...s, currentPrice: update.price, priceChangeRate: update.changeRate, volume: update.volume }
            : s
        ) ?? old
      )

      // 상세 캐시 갱신 (해당 캐시가 존재하면)
      qc.setQueryData(['stock', update.symbol], (old: unknown) => {
        if (!old || typeof old !== 'object') return old
        return { ...old as object, currentPrice: update.price, priceChangeRate: update.changeRate, volume: update.volume }
      })
    })

    unsubRef.current = unsub
    return () => { unsub(); unsubRef.current = null }
  }, [symbols.join(','), qc])  // eslint-disable-line react-hooks/exhaustive-deps
}
