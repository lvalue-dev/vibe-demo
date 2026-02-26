import { kisGet } from './client'
import type { KisExchange } from './symbols'
import type { DailyCandle } from './domestic'

export interface OverseasPrice {
  price: number
  prevClose: number
  changeRate: number
  volume: number
}

/** 해외주식 현재가 조회 */
export async function getOverseasPrice(exchange: KisExchange, symbol: string): Promise<OverseasPrice | null> {
  try {
    const data = await kisGet(
      '/uapi/overseas-price/v1/quotations/price',
      'HHDFS00000300',
      { AUTH: '', EXCD: exchange, SYMB: symbol }
    )
    const o = data.output
    const price = Number(o.last)
    const prevClose = Number(o.base)
    return {
      price,
      prevClose,
      changeRate: prevClose > 0 ? (price - prevClose) / prevClose : 0,
      volume: Number(o.tvol),
    }
  } catch (err) {
    console.error('[KIS overseas price]', exchange, symbol, (err as Error).message)
    return null
  }
}

/** 해외주식 일봉 차트 */
export async function getOverseasCandles(exchange: KisExchange, symbol: string, days = 30): Promise<DailyCandle[]> {
  try {
    const data = await kisGet(
      '/uapi/overseas-price/v1/quotations/dailychartprice',
      'HHDFS76240000',
      {
        AUTH: '',
        EXCD: exchange,
        SYMB: symbol,
        GUBN: '0',  // 0=일봉
        BYMD: '',
        MODP: '0',
      }
    )
    const rows: DailyCandle[] = (data.output2 ?? [])
      .filter((r: Record<string, string>) => r.xymd && Number(r.clos) > 0)
      .map((r: Record<string, string>) => ({
        date:   r.xymd,
        open:   Number(r.open),
        high:   Number(r.high),
        low:    Number(r.low),
        close:  Number(r.clos),
        volume: Number(r.tvol),
      }))
      .slice(-days)
    return rows.reverse()
  } catch (err) {
    console.error('[KIS overseas candles]', exchange, symbol, (err as Error).message)
    return []
  }
}
