/**
 * 실시간 가격 폴링 루프.
 * 장 중: 5초마다 KIS(or Yahoo) 조회 → SSE로 브로드캐스트
 * 장 외: 30초마다 (슬로우 폴링)
 */
import { isKisConfigured } from './kis/auth'
import { getDomesticPrice } from './kis/domestic'
import { getOverseasPrice } from './kis/overseas'
import { parseYfSymbol, isMarketOpen } from './kis/symbols'
import { yfQuote } from './yahoo/proxy'
import { broadcastPrice, clientCount } from './sse'
import { STOCK_INFO } from './stockInfo'

const SYMBOLS = Object.keys(STOCK_INFO)
let pollerTimer: ReturnType<typeof setTimeout> | null = null

async function pollOne(sym: string): Promise<void> {
  const kisInfo = parseYfSymbol(sym)

  try {
    let price: number, changeRate: number, volume: number

    if (isKisConfigured()) {
      const q = kisInfo.type === 'domestic'
        ? await getDomesticPrice(kisInfo.code)
        : await getOverseasPrice(kisInfo.exchange!, kisInfo.code)
      if (!q) return
      price = q.price; changeRate = q.changeRate; volume = q.volume
    } else {
      const q = await yfQuote(sym)
      if (!q) return
      price = q.price; changeRate = q.changeRate; volume = q.volume
    }

    broadcastPrice(sym, { price, changeRate, volume, ts: Date.now() })
  } catch { /* ignore */ }
}

async function pollAll(): Promise<void> {
  if (clientCount() === 0) return  // 클라이언트 없으면 스킵

  // 병렬로 조회하되 KIS 속도 제한 감안해 배치(10개씩)
  for (let i = 0; i < SYMBOLS.length; i += 10) {
    const batch = SYMBOLS.slice(i, i + 10)
    await Promise.all(batch.map(pollOne))
    if (i + 10 < SYMBOLS.length) await sleep(500)
  }
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

function scheduleNext(): void {
  // 장 중이면 5초, 장 외면 30초
  const anyOpen = SYMBOLS.some(sym => isMarketOpen(parseYfSymbol(sym).market))
  const interval = anyOpen ? 5000 : 30000
  pollerTimer = setTimeout(async () => {
    await pollAll()
    scheduleNext()
  }, interval)
}

export function startPoller(): void {
  console.log('[Poller] Started')
  scheduleNext()
}

export function stopPoller(): void {
  if (pollerTimer) { clearTimeout(pollerTimer); pollerTimer = null }
}
