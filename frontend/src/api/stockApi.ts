import client from './client'
import { mockApi } from './mockData'
import { fetchRealStocks, fetchRealStockDetail } from './finnhubApi'
import type { Analysis, AuthResponse, PortfolioItem, StockDetail, StockListItem, WatchlistItem } from '../types'

// 개발 중 백엔드가 있을 때만 백엔드 사용, 그 외에는 Finnhub 실데이터
const USE_BACKEND = !import.meta.env.PROD && import.meta.env.VITE_USE_MOCK !== 'true'

// ─── Stocks (Finnhub 실데이터) ──────────────────────────────────────────────
export const stockApi = {
  getAll: (): Promise<StockListItem[]> =>
    USE_BACKEND
      ? client.get<StockListItem[]>('/api/stocks').then((r) => r.data)
      : fetchRealStocks(),
  getDetail: (symbol: string): Promise<StockDetail> =>
    USE_BACKEND
      ? client.get<StockDetail>(`/api/stocks/${symbol}`).then((r) => r.data)
      : fetchRealStockDetail(symbol),
  getAnalysis: (symbol: string): Promise<Analysis> =>
    USE_BACKEND
      ? client.get<Analysis>(`/api/stocks/${symbol}/analysis`).then((r) => r.data)
      : fetchRealStockDetail(symbol).then((d) => ({
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
        })),
}

// ─── Auth (Mock 유지 - 백엔드 없음) ────────────────────────────────────────
export const authApi = {
  signUp: (data: { email: string; password: string; nickname: string }): Promise<AuthResponse> =>
    USE_BACKEND
      ? client.post<AuthResponse>('/api/auth/signup', data).then((r) => r.data)
      : mockApi.signUp(data.email, data.password, data.nickname),
  signIn: (data: { email: string; password: string }): Promise<AuthResponse> =>
    USE_BACKEND
      ? client.post<AuthResponse>('/api/auth/signin', data).then((r) => r.data)
      : mockApi.signIn(data.email, data.password),
}

// ─── Watchlist (Mock 유지) ──────────────────────────────────────────────────
export const watchlistApi = {
  getAll: (): Promise<WatchlistItem[]> =>
    USE_BACKEND
      ? client.get<WatchlistItem[]>('/api/watchlist').then((r) => r.data)
      : mockApi.getWatchlist(),
  add: (symbol: string): Promise<WatchlistItem> =>
    USE_BACKEND
      ? client.post<WatchlistItem>('/api/watchlist', { symbol }).then((r) => r.data)
      : mockApi.addWatchlist(symbol),
  remove: (symbol: string): Promise<unknown> =>
    USE_BACKEND
      ? client.delete(`/api/watchlist/${symbol}`)
      : mockApi.removeWatchlist(symbol),
}

// ─── Portfolio (Mock 유지) ──────────────────────────────────────────────────
export const portfolioApi = {
  getAll: (): Promise<PortfolioItem[]> =>
    USE_BACKEND
      ? client.get<PortfolioItem[]>('/api/portfolio').then((r) => r.data)
      : mockApi.getPortfolio(),
  addOrUpdate: (data: { symbol: string; avgPrice: number; quantity: number }): Promise<PortfolioItem> =>
    USE_BACKEND
      ? client.post<PortfolioItem>('/api/portfolio', data).then((r) => r.data)
      : mockApi.addPortfolio(data.symbol, data.avgPrice, data.quantity),
  remove: (symbol: string): Promise<unknown> =>
    USE_BACKEND
      ? client.delete(`/api/portfolio/${symbol}`)
      : mockApi.removePortfolio(symbol),
}
