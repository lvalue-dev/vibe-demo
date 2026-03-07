import axios, { AxiosResponse } from 'axios'
import { getToken, clearToken } from './auth'

// 모의투자(paper) vs 실전투자 선택
export const KIS_BASE =
  process.env.KIS_MODE === 'real'
    ? 'https://openapi.koreainvestment.com:9443'
    : 'https://openapivts.koreainvestment.com:9443'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function kisGet(path: string, trId: string, params: Record<string, string>): Promise<any> {
  const token = await getToken()
  let res: AxiosResponse
  try {
    res = await axios.get(`${KIS_BASE}${path}`, {
      params,
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
        appkey: process.env.KIS_APP_KEY!,
        appsecret: process.env.KIS_APP_SECRET!,
        tr_id: trId,
        custtype: 'P',
      },
      timeout: 10000,
    })
  } catch (e: any) {
    // 네트워크 에러는 그대로 throw
    throw e
  }

  // 토큰 만료 에러 코드 감지 → 캐시 삭제 후 1회 재시도
  if (res.data.rt_cd && res.data.rt_cd !== '0') {
    const msg: string = res.data.msg1 ?? ''
    if (msg.includes('기간이 만료') || msg.includes('token') || res.data.rt_cd === 'EGW00123') {
      console.warn('[KIS] Token expired mid-session, clearing and retrying...')
      clearToken()
      const newToken = await getToken()
      res = await axios.get(`${KIS_BASE}${path}`, {
        params,
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${newToken}`,
          appkey: process.env.KIS_APP_KEY!,
          appsecret: process.env.KIS_APP_SECRET!,
          tr_id: trId,
          custtype: 'P',
        },
        timeout: 10000,
      })
      if (res.data.rt_cd && res.data.rt_cd !== '0') {
        throw new Error(`KIS API [${trId}]: ${res.data.msg1 ?? 'unknown error'}`)
      }
      return res.data
    }
    throw new Error(`KIS API [${trId}]: ${msg || 'unknown error'}`)
  }
  return res.data
}
