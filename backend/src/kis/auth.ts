import axios from 'axios'
import { KIS_BASE } from './client'

interface TokenCache {
  token: string
  expiresAt: number
}

let cache: TokenCache | null = null

export function isKisConfigured(): boolean {
  return !!(process.env.KIS_APP_KEY && process.env.KIS_APP_SECRET)
}

export async function getToken(): Promise<string> {
  if (cache && Date.now() < cache.expiresAt) return cache.token

  const res = await axios.post(`${KIS_BASE}/oauth2/tokenP`, {
    grant_type: 'client_credentials',
    appkey: process.env.KIS_APP_KEY,
    appsecret: process.env.KIS_APP_SECRET,
  })

  const { access_token, expires_in } = res.data
  cache = {
    token: access_token,
    expiresAt: Date.now() + (expires_in - 300) * 1000, // 5분 앞서 갱신
  }
  console.log('[KIS] Token issued, expires in', expires_in, 's')
  return cache.token
}
