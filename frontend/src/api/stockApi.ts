import client from './client'
import type { Analysis, AuthResponse, PortfolioItem, StockDetail, StockListItem, WatchlistItem } from '../types'

// ─── Stocks ────────────────────────────────────────────────────────────────
export const stockApi = {
  getAll: () => client.get<StockListItem[]>('/api/stocks').then((r) => r.data),
  getDetail: (symbol: string) => client.get<StockDetail>(`/api/stocks/${symbol}`).then((r) => r.data),
  getAnalysis: (symbol: string) => client.get<Analysis>(`/api/stocks/${symbol}/analysis`).then((r) => r.data),
}

// ─── Auth ──────────────────────────────────────────────────────────────────
export const authApi = {
  signUp: (data: { email: string; password: string; nickname: string }) =>
    client.post<AuthResponse>('/api/auth/signup', data).then((r) => r.data),
  signIn: (data: { email: string; password: string }) =>
    client.post<AuthResponse>('/api/auth/signin', data).then((r) => r.data),
}

// ─── Watchlist ─────────────────────────────────────────────────────────────
export const watchlistApi = {
  getAll: () => client.get<WatchlistItem[]>('/api/watchlist').then((r) => r.data),
  add: (symbol: string) => client.post<WatchlistItem>('/api/watchlist', { symbol }).then((r) => r.data),
  remove: (symbol: string) => client.delete(`/api/watchlist/${symbol}`),
}

// ─── Portfolio ─────────────────────────────────────────────────────────────
export const portfolioApi = {
  getAll: () => client.get<PortfolioItem[]>('/api/portfolio').then((r) => r.data),
  addOrUpdate: (data: { symbol: string; avgPrice: number; quantity: number }) =>
    client.post<PortfolioItem>('/api/portfolio', data).then((r) => r.data),
  remove: (symbol: string) => client.delete(`/api/portfolio/${symbol}`),
}
