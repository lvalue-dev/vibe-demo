"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startPoller = startPoller;
exports.stopPoller = stopPoller;
/**
 * 실시간 가격 폴링 루프.
 * 장 중: 5초마다 KIS(or Yahoo) 조회 → SSE로 브로드캐스트
 * 장 외: 30초마다 (슬로우 폴링)
 */
const auth_1 = require("./kis/auth");
const domestic_1 = require("./kis/domestic");
const overseas_1 = require("./kis/overseas");
const symbols_1 = require("./kis/symbols");
const proxy_1 = require("./yahoo/proxy");
const sse_1 = require("./sse");
const stockInfo_1 = require("./stockInfo");
const SYMBOLS = Object.keys(stockInfo_1.STOCK_INFO);
let pollerTimer = null;
async function pollOne(sym) {
    const kisInfo = (0, symbols_1.parseYfSymbol)(sym);
    try {
        let price, changeRate, volume;
        if ((0, auth_1.isKisConfigured)()) {
            const q = kisInfo.type === 'domestic'
                ? await (0, domestic_1.getDomesticPrice)(kisInfo.code)
                : await (0, overseas_1.getOverseasPrice)(kisInfo.exchange, kisInfo.code);
            if (!q)
                return;
            price = q.price;
            changeRate = q.changeRate;
            volume = q.volume;
        }
        else {
            const q = await (0, proxy_1.yfQuote)(sym);
            if (!q)
                return;
            price = q.price;
            changeRate = q.changeRate;
            volume = q.volume;
        }
        (0, sse_1.broadcastPrice)(sym, { price, changeRate, volume, ts: Date.now() });
    }
    catch { /* ignore */ }
}
async function pollAll() {
    if ((0, sse_1.clientCount)() === 0)
        return; // 클라이언트 없으면 스킵
    // 병렬로 조회하되 KIS 속도 제한 감안해 배치(10개씩)
    for (let i = 0; i < SYMBOLS.length; i += 10) {
        const batch = SYMBOLS.slice(i, i + 10);
        await Promise.all(batch.map(pollOne));
        if (i + 10 < SYMBOLS.length)
            await sleep(500);
    }
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function scheduleNext() {
    // 장 중이면 5초, 장 외면 30초
    const anyOpen = SYMBOLS.some(sym => (0, symbols_1.isMarketOpen)((0, symbols_1.parseYfSymbol)(sym).market));
    const interval = anyOpen ? 5000 : 30000;
    pollerTimer = setTimeout(async () => {
        await pollAll();
        scheduleNext();
    }, interval);
}
function startPoller() {
    console.log('[Poller] Started');
    scheduleNext();
}
function stopPoller() {
    if (pollerTimer) {
        clearTimeout(pollerTimer);
        pollerTimer = null;
    }
}
