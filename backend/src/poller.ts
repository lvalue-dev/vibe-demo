/**
 * 실시간 가격 폴링 루프.
 *
 * KIS REST 유량 제한:
 *   - 모의투자(paper): 초당 2건 → 종목당 500ms 간격
 *   - 실전투자(real):  초당 20건 → 배치 10개씩 500ms 간격
 *
 * 55개 종목 기준 한 사이클 소요 시간:
 *   - paper: 55 × 500ms ≈ 28초 → 다음 사이클은 5초 후 시작 (사실상 33초 간격)
 *   - real:  ceil(55/10) × 500ms = 3초 → 다음 사이클은 5초 후 시작
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

// 모의투자: 초당 2건 (500ms/건), 실전: 초당 20건 → 배치 10개/500ms
const isPaper = () => (process.env.KIS_MODE ?? 'paper') !== 'real'

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

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
  } catch { /* ignore individual failure */ }
}

async function pollAll(): Promise<void> {
  if (clientCount() === 0) return  // 클라이언트 없으면 API 호출 안 함

  if (isPaper()) {
    // 모의투자: 1건씩 순차 처리, 건당 500ms 대기 (초당 2건 이하)
    for (let i = 0; i < SYMBOLS.length; i++) {
      await pollOne(SYMBOLS[i])
      if (i < SYMBOLS.length - 1) await sleep(500)
    }
  } else {
    // 실전투자: 10개씩 병렬 처리, 배치당 500ms 대기 (초당 ≤20건)
    for (let i = 0; i < SYMBOLS.length; i += 10) {
      const batch = SYMBOLS.slice(i, i + 10)
      await Promise.all(batch.map(pollOne))
      if (i + 10 < SYMBOLS.length) await sleep(500)
    }
  }
}

function scheduleNext(): void {
  // 장 중이면 5초 후 재시도, 장 외면 60초 (paper 사이클이 ~30초라 겹침 방지)
  const anyOpen = SYMBOLS.some(sym => isMarketOpen(parseYfSymbol(sym).market))
  const gap = anyOpen ? 5000 : 60000

  pollerTimer = setTimeout(async () => {
    await pollAll()
    scheduleNext()
  }, gap)
}

export function startPoller(): void {
  console.log(`[Poller] Started (${isPaper() ? 'paper: 2req/s' : 'real: 20req/s'})`)
  scheduleNext()
}

export function stopPoller(): void {
  if (pollerTimer) { clearTimeout(pollerTimer); pollerTimer = null }
}
