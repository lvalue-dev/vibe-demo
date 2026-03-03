/**
 * 실시간 가격 폴링 루프.
 *
 * KIS REST 유량 제한:
 *   - 모의투자(paper): 초당 1건 → 종목당 1000ms 간격
 *   - 실전투자(real):  초당 20건 → 배치 10개씩 500ms 간격
 *
 * 165개 종목 기준 한 사이클 소요 시간:
 *   - paper: 165 × 1000ms ≈ 165초 → 다음 사이클은 30초 후 시작
 *   - real:  ceil(165/10) × 500ms = 8.5초 → 다음 사이클은 5초 후 시작
 *
 * 폴러가 캐시(GET /api/stocks)도 겸함 → KIS 중복 호출 없음
 */
import { isKisConfigured } from './kis/auth'
import { getDomesticPrice } from './kis/domestic'
import { getOverseasPrice } from './kis/overseas'
import { parseYfSymbol, isMarketOpen } from './kis/symbols'
import { yfQuote } from './yahoo/proxy'
import { broadcastPrice, clientCount } from './sse'
import { updateCacheEntry } from './stockCache'
import { STOCK_INFO } from './stockInfo'

const SYMBOLS = Object.keys(STOCK_INFO)
let pollerTimer: ReturnType<typeof setTimeout> | null = null

// 모의투자: 초당 2건 (500ms/건), 실전: 초당 20건 → 배치 10개/500ms
const isPaper = () => (process.env.KIS_MODE ?? 'paper') !== 'real'

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

async function pollOne(sym: string): Promise<void> {
  const kisInfo = parseYfSymbol(sym)
  try {
    let price: number, prevClose: number, changeRate: number, volume: number

    if (isKisConfigured()) {
      const q = kisInfo.type === 'domestic'
        ? await getDomesticPrice(kisInfo.code)
        : await getOverseasPrice(kisInfo.exchange!, kisInfo.code)
      if (!q) return
      price = q.price; prevClose = q.prevClose; changeRate = q.changeRate; volume = q.volume
    } else {
      const q = await yfQuote(sym)
      if (!q) return
      price = q.price; prevClose = q.prevClose; changeRate = q.changeRate; volume = q.volume
    }

    // SSE 브로드캐스트 + 캐시 동시 업데이트 (중복 KIS 호출 없음)
    broadcastPrice(sym, { price, changeRate, volume, ts: Date.now() })
    updateCacheEntry(sym, price, prevClose, changeRate, volume)
  } catch { /* ignore individual failure */ }
}

async function pollAll(): Promise<void> {
  // 캐시 갱신은 클라이언트 유무와 무관하게 항상 실행
  if (isPaper()) {
    // 모의투자: 1건씩 순차 처리, 건당 1000ms 대기 (초당 1건 이하 → rate limit 준수)
    for (let i = 0; i < SYMBOLS.length; i++) {
      await pollOne(SYMBOLS[i])
      if (i < SYMBOLS.length - 1) await sleep(1000)
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
  // 장 중이면 30초 후 재시도, 장 외면 300초 (paper 사이클이 ~165초라 겹침 방지)
  const anyOpen = SYMBOLS.some(sym => isMarketOpen(parseYfSymbol(sym).market))
  const gap = isPaper()
    ? (anyOpen ? 30000 : 300000)   // paper: 사이클 ~165초 + 장중 30초 대기
    : (anyOpen ? 5000  : 60000)    // real:  사이클 ~9초 + 장중 5초 대기

  pollerTimer = setTimeout(async () => {
    await pollAll()
    scheduleNext()
  }, gap)
}

export function startPoller(): void {
  console.log(`[Poller] Started (${isPaper() ? 'paper: 2req/s' : 'real: 20req/s'})`)
  // 서버 시작 직후 바로 한 사이클 실행 (캐시 초기 채우기)
  pollAll().then(() => scheduleNext())
}

export function stopPoller(): void {
  if (pollerTimer) { clearTimeout(pollerTimer); pollerTimer = null }
}
