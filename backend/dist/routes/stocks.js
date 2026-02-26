"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stocksRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../kis/auth");
const domestic_1 = require("../kis/domestic");
const overseas_1 = require("../kis/overseas");
const symbols_1 = require("../kis/symbols");
const proxy_1 = require("../yahoo/proxy");
const analysis_1 = require("../analysis");
const stockInfo_1 = require("../stockInfo");
const sse_1 = require("../sse");
const crypto_1 = require("crypto");
exports.stocksRouter = (0, express_1.Router)();
// ── 종목 목록 ──────────────────────────────────────────────────────────────────
exports.stocksRouter.get('/', async (_req, res) => {
    const symbols = Object.keys(stockInfo_1.STOCK_INFO);
    // 배치로 현재가 조회 (KIS or Yahoo)
    const results = await Promise.all(symbols.map(async (sym) => {
        try {
            const info = stockInfo_1.STOCK_INFO[sym];
            const kisInfo = (0, symbols_1.parseYfSymbol)(sym);
            let price, prevClose, changeRate, volume;
            if ((0, auth_1.isKisConfigured)()) {
                const q = kisInfo.type === 'domestic'
                    ? await (0, domestic_1.getDomesticPrice)(kisInfo.code)
                    : await (0, overseas_1.getOverseasPrice)(kisInfo.exchange, kisInfo.code);
                if (!q)
                    return null;
                price = q.price;
                prevClose = q.prevClose;
                changeRate = q.changeRate;
                volume = q.volume;
            }
            else {
                const q = await (0, proxy_1.yfQuote)(sym);
                if (!q)
                    return null;
                price = q.price;
                prevClose = q.prevClose;
                changeRate = q.changeRate;
                volume = q.volume;
            }
            return {
                symbol: sym, name: info.name, market: info.market,
                currentPrice: price, prevClose, priceChangeRate: changeRate, volume,
                recommendation: null, recommendationLabel: '-', score: null, risk: null, riskLabel: '-', analyzedAt: null,
            };
        }
        catch {
            return null;
        }
    }));
    res.json(results.filter(Boolean));
});
// ── 종목 상세 ─────────────────────────────────────────────────────────────────
exports.stocksRouter.get('/:symbol', async (req, res) => {
    const sym = decodeURIComponent(req.params.symbol);
    const info = stockInfo_1.STOCK_INFO[sym];
    if (!info) {
        res.status(404).json({ error: 'Not found' });
        return;
    }
    const kisInfo = (0, symbols_1.parseYfSymbol)(sym);
    try {
        let price, prevClose, changeRate, volume;
        let candles;
        if ((0, auth_1.isKisConfigured)()) {
            const [q, c] = await Promise.all([
                kisInfo.type === 'domestic'
                    ? (0, domestic_1.getDomesticPrice)(kisInfo.code)
                    : (0, overseas_1.getOverseasPrice)(kisInfo.exchange, kisInfo.code),
                kisInfo.type === 'domestic'
                    ? (0, domestic_1.getDomesticCandles)(kisInfo.code, 30)
                    : (0, overseas_1.getOverseasCandles)(kisInfo.exchange, kisInfo.code, 30),
            ]);
            if (!q) {
                res.status(503).json({ error: 'KIS fetch failed' });
                return;
            }
            price = q.price;
            prevClose = q.prevClose;
            changeRate = q.changeRate;
            volume = q.volume;
            candles = c;
        }
        else {
            const [q, c] = await Promise.all([(0, proxy_1.yfQuote)(sym), (0, proxy_1.yfCandles)(sym, 30)]);
            if (!q) {
                res.status(503).json({ error: 'Yahoo fetch failed' });
                return;
            }
            price = q.price;
            prevClose = q.prevClose;
            changeRate = q.changeRate;
            volume = q.volume;
            candles = c;
        }
        const closes = candles.map(c => c.close);
        const volumes = candles.map(c => c.volume);
        const result = (0, analysis_1.analyze)(closes, volumes, price, changeRate);
        res.json({
            symbol: sym, name: info.name, market: info.market, sector: info.sector,
            currentPrice: price, prevClose, priceChangeRate: changeRate, volume,
            ...result,
            chartData: candles.map(c => ({ time: c.date.slice(4, 6) + '/' + c.date.slice(6), price: c.close, volume: c.volume })),
            volumeHistory: candles.map((c, i) => ({
                date: c.date.slice(4, 6) + '/' + c.date.slice(6),
                volume: c.volume,
                isUp: c.close >= c.open,
            })),
            // 투자자 데이터는 프론트에서 시드 기반으로 생성 (실제 공시 데이터 필요)
            institutionalFlow: [],
            institutionSummary: [],
            institutionDaily: [],
            institutionPlayers: [],
            analyzedAt: new Date().toISOString(),
        });
    }
    catch (err) {
        console.error('[/stocks/:symbol]', sym, err);
        res.status(500).json({ error: 'Internal error' });
    }
});
// ── SSE 스트림 ────────────────────────────────────────────────────────────────
exports.stocksRouter.get('/stream/sse', (req, res) => {
    const id = (0, crypto_1.randomUUID)();
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // nginx 버퍼링 비활성화
    res.flushHeaders();
    const client = (0, sse_1.addClient)(id, res);
    // 구독 심볼 필터 (쿼리파라미터 ?symbols=005930.KS,AAPL)
    const symParam = req.query.symbols;
    if (symParam)
        symParam.split(',').forEach(s => client.symbols.add(s.trim()));
    // keepalive ping
    const ping = setInterval(() => {
        try {
            res.write(': ping\n\n');
        }
        catch {
            clearInterval(ping);
        }
    }, 20000);
    req.on('close', () => {
        clearInterval(ping);
        (0, sse_1.removeClient)(id);
    });
});
