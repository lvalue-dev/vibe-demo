import { mockApi } from './mockData'
import { fetchRealStocks, fetchRealStockDetail } from './finnhubApi'
import { fetchStocksFromBackend, fetchDetailFromBackend, isBackendEnabled } from './backendApi'
import type { Analysis, AuthResponse, PortfolioItem, StockDetail, StockListItem, WatchlistItem } from '../types'

// 백엔드가 설정돼 있으면 백엔드 우선, 없으면 Yahoo Finance 직접
const USE_MOCK_BACKEND = !import.meta.env.PROD && import.meta.env.VITE_USE_MOCK === 'true'

async function getStocks(): Promise<StockListItem[]> {
  if (USE_MOCK_BACKEND) return []
  if (isBackendEnabled) {
    try { return await fetchStocksFromBackend() } catch (e) {
      console.warn('[stockApi] backend failed, falling back to Yahoo', e)
    }
  }
  return fetchRealStocks()
}

async function getDetail(symbol: string): Promise<StockDetail> {
  if (USE_MOCK_BACKEND) return fetchRealStockDetail(symbol)
  if (isBackendEnabled) {
    try {
      const data = await fetchDetailFromBackend(symbol)
      // 백엔드가 투자자 데이터를 못 채운 경우 YF 데이터로 보완
      if (!data.institutionalFlow?.length || !data.chartData?.length) {
        const yf = await fetchRealStockDetail(symbol).catch(() => null)
        if (yf) {
          data.chartData        = data.chartData?.length        ? data.chartData        : yf.chartData
          data.institutionalFlow = data.institutionalFlow?.length ? data.institutionalFlow : yf.institutionalFlow
          data.institutionSummary = yf.institutionSummary
          data.institutionDaily   = yf.institutionDaily
          data.institutionPlayers = yf.institutionPlayers
        }
      }
      return data
    } catch (e) {
      console.warn('[stockApi] backend detail failed, falling back to Yahoo', e)
    }
  }
  return fetchRealStockDetail(symbol)
}

// ─── Stocks ────────────────────────────────────────────────────────────────────
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
