import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { stocksRouter } from './routes/stocks'
import { startPoller } from './poller'
import { isKisConfigured } from './kis/auth'

dotenv.config()

const app = express()
const PORT = Number(process.env.PORT ?? 3001)

app.use(cors({
  origin: process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map(s => s.trim())
    : '*',
  credentials: true,
}))
app.use(express.json())

// ── 헬스체크 ──────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    kisConfigured: isKisConfigured(),
    kisMode: process.env.KIS_MODE ?? 'paper',
    ts: Date.now(),
  })
})

// ── 라우터 ────────────────────────────────────────────────────────────────────
app.use('/api/stocks', stocksRouter)

// ── 시작 ──────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[Server] listening on port ${PORT}`)
  console.log(`[Server] KIS: ${isKisConfigured() ? '✓ configured' : '✗ not configured (Yahoo fallback)'}`)
  console.log(`[Server] mode: ${process.env.KIS_MODE ?? 'paper (모의투자)'}`)
  startPoller()
})
