import axios, { AxiosResponse } from 'axios'
import { getToken } from './auth'

// 모의투자(paper) vs 실전투자 선택
export const KIS_BASE =
  process.env.KIS_MODE === 'real'
    ? 'https://openapi.koreainvestment.com:9443'
    : 'https://openapivts.koreainvestment.com:9443'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function kisGet(path: string, trId: string, params: Record<string, string>): Promise<any> {
  const token = await getToken()
  const res: AxiosResponse = await axios.get(`${KIS_BASE}${path}`, {
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

  if (res.data.rt_cd && res.data.rt_cd !== '0') {
    throw new Error(`KIS API [${trId}]: ${res.data.msg1 ?? 'unknown error'}`)
  }
  return res.data
}
