import type { Response } from 'express'

interface SseClient {
  id: string
  res: Response
  symbols: Set<string>
}

const clients = new Map<string, SseClient>()

export function addClient(id: string, res: Response): SseClient {
  const client: SseClient = { id, res, symbols: new Set() }
  clients.set(id, client)
  console.log(`[SSE] +client ${id}, total=${clients.size}`)
  return client
}

export function removeClient(id: string): void {
  clients.delete(id)
  console.log(`[SSE] -client ${id}, total=${clients.size}`)
}

export function broadcastPrice(symbol: string, data: Record<string, unknown>): void {
  const msg = `data: ${JSON.stringify({ symbol, ...data })}\n\n`
  for (const client of clients.values()) {
    if (client.symbols.size === 0 || client.symbols.has(symbol)) {
      try { client.res.write(msg) } catch { /* client disconnected */ }
    }
  }
}

export function broadcastAll(data: Record<string, unknown>): void {
  const msg = `data: ${JSON.stringify(data)}\n\n`
  for (const client of clients.values()) {
    try { client.res.write(msg) } catch { /* ignore */ }
  }
}

export function clientCount(): number {
  return clients.size
}
