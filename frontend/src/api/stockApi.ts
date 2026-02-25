import client from './client'
import { mockApi } from './mockData'
import type { Analysis, AuthResponse, PortfolioItem, StockDetail, StockListItem, WatchlistItem } from '../types'

// VITE_USE_MOCK=true 이거나 API 서버가 없을 때 Mock 사용
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true' || import.meta.env.PROD

// ─── Stocks ────────────────────────────────────────────────────────────────
export const stockApi = {
  getAll: (): Promise<StockListItem[]> =>
    USE_MOCK
      ? mockApi.getStocks()
      : client.get<StockListItem[]>('/api/stocks').then((r) => r.data),
  getDetail: (symbol: string): Promise<StockDetail> =>
    USE_MOCK
      ? mockApi.getDetail(symbol)
      : client.get<StockDetail>(`/api/stocks/${symbol}`).then((r) => r.data),
  getAnalysis: (symbol: string): Promise<Analysis> =>
    USE_MOCK
      ? mockApi.getDetail(symbol).then((d) => ({
          score: d.score!,
          recommendation: d.recommendation!,
          recommendationLabel: d.recommendationLabel,
          risk: d.risk!,
          riskLabel: d.riskLabel,
          reasons: d.reasons,
          ma5: d.ma5,
          ma20: d.ma20,
          volumeRatio: d.volumeRatio,
          priceChangeRate: d.priceChangeRate,
          analyzedAt: new Date().toISOString(),
        }))
      : client.get<Analysis>(`/api/stocks/${symbol}/analysis`).then((r) => r.data),
}

// ─── Auth ──────────────────────────────────────────────────────────────────
export const authApi = {
  signUp: (data: { email: string; password: string; nickname: string }): Promise<AuthResponse> =>
    USE_MOCK
      ? mockApi.signUp(data.email, data.password, data.nickname)
      : client.post<AuthResponse>('/api/auth/signup', data).then((r) => r.data),
  signIn: (data: { email: string; password: string }): Promise<AuthResponse> =>
    USE_MOCK
      ? mockApi.signIn(data.email, data.password)
      : client.post<AuthResponse>('/api/auth/signin', data).then((r) => r.data),
}

// ─── Watchlist ─────────────────────────────────────────────────────────────
export const watchlistApi = {
  getAll: (): Promise<WatchlistItem[]> =>
    USE_MOCK
      ? mockApi.getWatchlist()
      : client.get<WatchlistItem[]>('/api/watchlist').then((r) => r.data),
  add: (symbol: string): Promise<WatchlistItem> =>
    USE_MOCK
      ? mockApi.addWatchlist(symbol)
      : client.post<WatchlistItem>('/api/watchlist', { symbol }).then((r) => r.data),
  remove: (symbol: string): Promise<unknown> =>
    USE_MOCK
      ? mockApi.removeWatchlist(symbol)
      : client.delete(`/api/watchlist/${symbol}`),
}

// ─── Portfolio ─────────────────────────────────────────────────────────────
export const portfolioApi = {
  getAll: (): Promise<PortfolioItem[]> =>
    USE_MOCK
      ? mockApi.getPortfolio()
      : client.get<PortfolioItem[]>('/api/portfolio').then((r) => r.data),
  addOrUpdate: (data: { symbol: string; avgPrice: number; quantity: number }): Promise<PortfolioItem> =>
    USE_MOCK
      ? mockApi.addPortfolio(data.symbol, data.avgPrice, data.quantity)
      : client.post<PortfolioItem>('/api/portfolio', data).then((r) => r.data),
  remove: (symbol: string): Promise<unknown> =>
    USE_MOCK
      ? mockApi.removePortfolio(symbol)
      : client.delete(`/api/portfolio/${symbol}`),
}
