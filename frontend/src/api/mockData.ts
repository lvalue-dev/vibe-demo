import type { WatchlistItem, PortfolioItem, AuthResponse } from '../types'
import { fetchStocksFromBackend } from './backendApi'

// In-memory state (초기 빈 상태 — 더미 데이터 없음)
const watchlistSymbols: string[] = []
const portfolioItems: Array<{ symbol: string; avgPrice: number; quantity: number }> = []

// Spring 백엔드에서 현재가 조회
async function getStockData() {
  return fetchStocksFromBackend()
}

export const mockApi = {
  // ── Auth ──────────────────────────────────────────────────────────────────
  signUp: (email: string, _password: string, nickname: string): Promise<AuthResponse> => {
    localStorage.setItem('token', `mock.token.${Date.now()}`)
    return Promise.resolve({ token: `mock.token.${Date.now()}`, email, nickname })
  },
  signIn: (email: string, _password: string): Promise<AuthResponse> => {
    const nickname = email.split('@')[0]
    localStorage.setItem('token', `mock.token.${Date.now()}`)
    return Promise.resolve({ token: `mock.token.${Date.now()}`, email, nickname })
  },

  // ── Watchlist (실시간 가격 사용) ──────────────────────────────────────────
  getWatchlist: async (): Promise<WatchlistItem[]> => {
    if (watchlistSymbols.length === 0) return []
    const stocks = await getStockData()
    return watchlistSymbols
      .map((sym, i) => {
        const s = stocks.find((x) => x.symbol === sym)
        if (!s) return null
        return {
          id: i + 1,
          symbol: s.symbol,
          name: s.name,
          market: s.market,
          currentPrice: s.currentPrice,
          priceChangeRate: s.priceChangeRate,
          recommendation: s.recommendation,
          recommendationLabel: s.recommendationLabel,
          score: s.score,
          risk: s.risk,
          riskLabel: s.riskLabel,
          addedAt: new Date().toISOString(),
        } satisfies WatchlistItem
      })
      .filter((x): x is WatchlistItem => x !== null)
  },
  addWatchlist: async (symbol: string): Promise<WatchlistItem> => {
    if (watchlistSymbols.includes(symbol)) throw new Error('이미 추가된 종목입니다')
    const stocks = await getStockData()
    const s = stocks.find((x) => x.symbol === symbol)
    if (!s) throw new Error('지원하지 않는 종목입니다')
    watchlistSymbols.push(symbol)
    return {
      id: watchlistSymbols.length,
      symbol: s.symbol,
      name: s.name,
      market: s.market,
      currentPrice: s.currentPrice,
      priceChangeRate: s.priceChangeRate,
      recommendation: s.recommendation,
      recommendationLabel: s.recommendationLabel,
      score: s.score,
      risk: s.risk,
      riskLabel: s.riskLabel,
      addedAt: new Date().toISOString(),
    }
  },
  removeWatchlist: (symbol: string): Promise<void> => {
    const idx = watchlistSymbols.indexOf(symbol)
    if (idx >= 0) watchlistSymbols.splice(idx, 1)
    return Promise.resolve()
  },

  // ── Portfolio (실시간 가격으로 손익 계산) ─────────────────────────────────
  getPortfolio: async (): Promise<PortfolioItem[]> => {
    if (portfolioItems.length === 0) return []
    const stocks = await getStockData()
    return portfolioItems
      .map((p, i): PortfolioItem | null => {
        const s = stocks.find((x) => x.symbol === p.symbol)
        if (!s) return null
        const totalInvested = p.avgPrice * p.quantity
        const currentValue = s.currentPrice * p.quantity
        const profitLoss = currentValue - totalInvested
        return {
          id: i + 1,
          symbol: s.symbol,
          name: s.name,
          market: s.market,
          currentPrice: s.currentPrice,
          recommendation: s.recommendation,
          recommendationLabel: s.recommendationLabel,
          score: s.score,
          risk: s.risk,
          riskLabel: s.riskLabel,
          avgPrice: p.avgPrice,
          quantity: p.quantity,
          totalInvested,
          currentValue,
          profitLoss,
          returnRate: totalInvested > 0 ? profitLoss / totalInvested : 0,
        }
      })
      .filter((x): x is PortfolioItem => x !== null)
  },
  addPortfolio: async (symbol: string, avgPrice: number, quantity: number): Promise<PortfolioItem> => {
    const stocks = await getStockData()
    const s = stocks.find((x) => x.symbol === symbol)
    if (!s) throw new Error('지원하지 않는 종목입니다. 목록에 있는 종목 심볼을 입력해주세요.')
    const idx = portfolioItems.findIndex((p) => p.symbol === symbol)
    if (idx >= 0) portfolioItems[idx] = { symbol, avgPrice, quantity }
    else portfolioItems.push({ symbol, avgPrice, quantity })
    const totalInvested = avgPrice * quantity
    const currentValue = s.currentPrice * quantity
    const profitLoss = currentValue - totalInvested
    return {
      id: portfolioItems.length,
      symbol: s.symbol,
      name: s.name,
      market: s.market,
      currentPrice: s.currentPrice,
      recommendation: s.recommendation,
      recommendationLabel: s.recommendationLabel,
      score: s.score,
      risk: s.risk,
      riskLabel: s.riskLabel,
      avgPrice,
      quantity,
      totalInvested,
      currentValue,
      profitLoss,
      returnRate: totalInvested > 0 ? profitLoss / totalInvested : 0,
    }
  },
  removePortfolio: (symbol: string): Promise<void> => {
    const idx = portfolioItems.findIndex((p) => p.symbol === symbol)
    if (idx >= 0) portfolioItems.splice(idx, 1)
    return Promise.resolve()
  },
}
