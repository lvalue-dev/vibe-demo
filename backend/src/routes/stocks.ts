import { Router, Request, Response } from 'express'
import { isKisConfigured } from '../kis/auth'
import { getDomesticPrice, getDomesticCandles } from '../kis/domestic'
import { getOverseasPrice, getOverseasCandles } from '../kis/overseas'
import { parseYfSymbol } from '../kis/symbols'
import { yfQuote, yfCandles } from '../yahoo/proxy'
import { analyze } from '../analysis'
import { STOCK_INFO } from '../stockInfo'
import { addClient, removeClient } from '../sse'
import { getCache, getCacheAge } from '../stockCache'
import { randomUUID } from 'crypto'

export const stocksRouter = Router()

// ── 종목 목록 (캐시에서 즉시 반환) ────────────────────────────────────────────
stocksRouter.get('/', (_req: Request, res: Response) => {
  const cached = getCache()
  const age = getCacheAge()

  if (cached.length > 0) {
    res.setHeader('X-Cache-Age', age >= 0 ? String(Math.floor(age / 1000)) + 's' : 'fresh')
    res.json(cached)
  } else {
    // 캐시 아직 준비 안 됨 (서버 시작 직후 3초 이내)
    res.status(503).json({ error: 'Cache warming up, retry in a few seconds', retryAfter: 5 })
  }
})

// ── 종목 상세 ─────────────────────────────────────────────────────────────────
stocksRouter.get('/:symbol', async (req: Request, res: Response) => {
  const sym = decodeURIComponent(req.params.symbol)
  const info = STOCK_INFO[sym]
  if (!info) { res.status(404).json({ error: 'Not found' }); return }

  const kisInfo = parseYfSymbol(sym)

  try {
    let price: number, prevClose: number, changeRate: number, volume: number
    let candles: { date: string; open: number; close: number; volume: number }[]

    // STOCK_SOURCE=yahoo 이면 KIS 설정 여부와 무관하게 Yahoo 사용 (개발계)
    if (process.env.STOCK_SOURCE !== 'yahoo' && isKisConfigured()) {
      const [q, c] = await Promise.all([
        kisInfo.type === 'domestic'
          ? getDomesticPrice(kisInfo.code)
          : getOverseasPrice(kisInfo.exchange!, kisInfo.code),
        kisInfo.type === 'domestic'
          ? getDomesticCandles(kisInfo.code, 30)
          : getOverseasCandles(kisInfo.exchange!, kisInfo.code, 30),
      ])
      if (!q) { res.status(503).json({ error: 'KIS fetch failed' }); return }
      price = q.price; prevClose = q.prevClose; changeRate = q.changeRate; volume = q.volume
      candles = c
    } else {
      const [q, c] = await Promise.all([yfQuote(sym), yfCandles(sym, 30)])
      if (!q) { res.status(503).json({ error: 'Yahoo fetch failed' }); return }
      price = q.price; prevClose = q.prevClose; changeRate = q.changeRate; volume = q.volume
      candles = c
    }

    const closes  = candles.map(c => c.close)
    const volumes = candles.map(c => c.volume)
    const result  = analyze(closes, volumes, price, changeRate)

    res.json({
      symbol: sym, name: info.name, market: info.market, sector: info.sector,
      currentPrice: price, prevClose, priceChangeRate: changeRate, volume,
      ...result,
      chartData: candles.map(c => ({ time: c.date.slice(4,6)+'/'+c.date.slice(6), price: c.close, volume: c.volume })),
      volumeHistory: candles.map((c, i) => ({
        date: c.date.slice(4,6)+'/'+c.date.slice(6),
        volume: c.volume,
        isUp: c.close >= c.open,
      })),
      // 투자자 데이터는 프론트에서 시드 기반으로 생성 (실제 공시 데이터 필요)
      institutionalFlow: [],
      institutionSummary: [],
      institutionDaily: [],
      institutionPlayers: [],
      analyzedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[/stocks/:symbol]', sym, err)
    res.status(500).json({ error: 'Internal error' })
  }
})

// ── SSE 스트림 ────────────────────────────────────────────────────────────────
stocksRouter.get('/stream/sse', (req: Request, res: Response) => {
  const id = randomUUID()

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')  // nginx 버퍼링 비활성화
  res.flushHeaders()

  const client = addClient(id, res)

  // 구독 심볼 필터 (쿼리파라미터 ?symbols=005930.KS,AAPL)
  const symParam = req.query.symbols as string | undefined
  if (symParam) symParam.split(',').forEach(s => client.symbols.add(s.trim()))

  // keepalive ping
  const ping = setInterval(() => {
    try { res.write(': ping\n\n') } catch { clearInterval(ping) }
  }, 20000)

  req.on('close', () => {
    clearInterval(ping)
    removeClient(id)
  })
})
