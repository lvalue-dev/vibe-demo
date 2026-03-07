import { mockApi } from './mockData'
import { fetchStocksFromBackend, fetchDetailFromBackend } from './backendApi'
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
    mockApi.signUp(data.email, data.password, data.nickname),
  signIn: (data: { email: string; password: string }): Promise<AuthResponse> =>
    mockApi.signIn(data.email, data.password),
}

// ─── Watchlist ─────────────────────────────────────────────────────────────────
export const watchlistApi = {
  getAll: (): Promise<WatchlistItem[]> => mockApi.getWatchlist(),
  add:    (symbol: string): Promise<WatchlistItem> => mockApi.addWatchlist(symbol),
  remove: (symbol: string): Promise<unknown>       => mockApi.removeWatchlist(symbol),
}

// ─── Portfolio ─────────────────────────────────────────────────────────────────
export const portfolioApi = {
  getAll: (): Promise<PortfolioItem[]> => mockApi.getPortfolio(),
  addOrUpdate: (data: { symbol: string; avgPrice: number; quantity: number }): Promise<PortfolioItem> =>
    mockApi.addPortfolio(data.symbol, data.avgPrice, data.quantity),
  remove: (symbol: string): Promise<unknown> => mockApi.removePortfolio(symbol),
}
