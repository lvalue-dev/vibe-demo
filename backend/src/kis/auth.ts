import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { KIS_BASE } from './client'

interface TokenCache {
  token: string
  expiresAt: number
}

const TOKEN_FILE = path.resolve(process.env.TOKEN_FILE_PATH ?? '/tmp/kis_token.json')
let cache: TokenCache | null = null

export function isKisConfigured(): boolean {
  return !!(process.env.KIS_APP_KEY && process.env.KIS_APP_SECRET)
}

function loadTokenFromFile(): TokenCache | null {
  try {
    if (!fs.existsSync(TOKEN_FILE)) return null
    const data = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf-8')) as TokenCache
    if (Date.now() < data.expiresAt) {
      console.log('[KIS] Token loaded from file, expires in', Math.round((data.expiresAt - Date.now()) / 1000), 's')
      return data
    }
    console.log('[KIS] Cached token expired, will re-issue')
    return null
  } catch {
    return null
  }
}

function saveTokenToFile(data: TokenCache): void {
  try {
    fs.writeFileSync(TOKEN_FILE, JSON.stringify(data), 'utf-8')
  } catch (e) {
    console.warn('[KIS] Failed to save token to file:', e)
  }
}

export async function getToken(): Promise<string> {
  // 1) 메모리 캐시 확인
  if (cache && Date.now() < cache.expiresAt) return cache.token

  // 2) 파일 캐시 복원 (서버 재시작 시)
  if (!cache) {
    cache = loadTokenFromFile()
    if (cache && Date.now() < cache.expiresAt) return cache.token
  }

  // 3) 신규 발급 (하루 1회 제한이므로 최후 수단)
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
  saveTokenToFile(cache)
  console.log('[KIS] New token issued, expires in', expires_in, 's')
  return cache.token
}

/** 토큰 강제 삭제 (에러 복구용) */
export function clearToken(): void {
  cache = null
  try { fs.unlinkSync(TOKEN_FILE) } catch { /* ignore */ }
  console.log('[KIS] Token cache cleared')
}
