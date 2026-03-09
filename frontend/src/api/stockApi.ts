import { fetchStocksFromBackend, fetchDetailFromBackend } from './backendApi'
import client from './client'
import type { Analysis, AuthResponse, PortfolioItem, StockDetail, StockListItem, WatchlistItem } from '../types'

// ─── Stocks ────────────────────────────────────────────────────────────────────
async function getStocks(): Promise<StockListItem[]> {
  return fetchStocksFromBackend()
}

async function getDetail(symbol: string, period = 'daily'): Promise<StockDetail> {
  return fetchDetailFromBackend(symbol, period)
}

export const stockApi = {
  getAll: getStocks,
  getDetail,
  getAnalysis: (symbol: string): Promise<Analysis> =>
    getDetail(symbol).then(d => ({
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

// ─── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  signUp: (data: { email: string; password: string; nickname: string }): Promise<AuthResponse> =>
    client.post<AuthResponse>('/api/auth/signup', data).then(r => r.data),
  signIn: (data: { email: string; password: string }): Promise<AuthResponse> =>
    client.post<AuthResponse>('/api/auth/signin', data).then(r => r.data),
}

// ─── Watchlist ─────────────────────────────────────────────────────────────────
export const watchlistApi = {
  getAll: (): Promise<WatchlistItem[]> =>
    client.get<WatchlistItem[]>('/api/watchlist').then(r => r.data),
  add: (symbol: string): Promise<WatchlistItem> =>
    client.post<WatchlistItem>('/api/watchlist', { symbol }).then(r => r.data),
  remove: (symbol: string): Promise<unknown> =>
    client.delete(`/api/watchlist/${encodeURIComponent(symbol)}`).then(r => r.data),
}

// ─── Portfolio ─────────────────────────────────────────────────────────────────
export const portfolioApi = {
  getAll: (): Promise<PortfolioItem[]> =>
    client.get<PortfolioItem[]>('/api/portfolio').then(r => r.data),
  addOrUpdate: (data: { symbol: string; avgPrice: number; quantity: number }): Promise<PortfolioItem> =>
    client.post<PortfolioItem>('/api/portfolio', data).then(r => r.data),
  remove: (symbol: string): Promise<unknown> =>
    client.delete(`/api/portfolio/${encodeURIComponent(symbol)}`).then(r => r.data),
}
