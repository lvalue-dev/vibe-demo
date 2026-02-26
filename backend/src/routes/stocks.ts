import { Router, Request, Response } from 'express'
import { isKisConfigured } from '../kis/auth'
import { getDomesticPrice, getDomesticCandles } from '../kis/domestic'
import { getOverseasPrice, getOverseasCandles } from '../kis/overseas'
import { parseYfSymbol } from '../kis/symbols'
import { yfQuote, yfCandles } from '../yahoo/proxy'
import { analyze } from '../analysis'
import { STOCK_INFO } from '../stockInfo'
import { addClient, removeClient } from '../sse'
import { randomUUID } from 'crypto'

export const stocksRouter = Router()

// ── 종목 목록 ──────────────────────────────────────────────────────────────────
stocksRouter.get('/', async (_req: Request, res: Response) => {
  const symbols = Object.keys(STOCK_INFO)

  // 배치로 현재가 조회 (KIS or Yahoo)
  const results = await Promise.all(
    symbols.map(async (sym) => {
      try {
        const info = STOCK_INFO[sym]
        const kisInfo = parseYfSymbol(sym)
        let price: number, prevClose: number, changeRate: number, volume: number

        if (isKisConfigured()) {
          const q = kisInfo.type === 'domestic'
            ? await getDomesticPrice(kisInfo.code)
            : await getOverseasPrice(kisInfo.exchange!, kisInfo.code)
          if (!q) return null
          price = q.price; prevClose = q.prevClose; changeRate = q.changeRate; volume = q.volume
        } else {
          const q = await yfQuote(sym)
          if (!q) return null
          price = q.price; prevClose = q.prevClose; changeRate = q.changeRate; volume = q.volume
        }

        return {
          symbol: sym, name: info.name, market: info.market,
          currentPrice: price, prevClose, priceChangeRate: changeRate, volume,
          recommendation: null, recommendationLabel: '-', score: null, risk: null, riskLabel: '-', analyzedAt: null,
        }
      } catch { return null }
    })
  )

  res.json(results.filter(Boolean))
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

    if (isKisConfigured()) {
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
