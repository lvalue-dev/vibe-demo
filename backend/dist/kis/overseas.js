"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOverseasPrice = getOverseasPrice;
exports.getOverseasCandles = getOverseasCandles;
const client_1 = require("./client");
/** 해외주식 현재가 조회 */
async function getOverseasPrice(exchange, symbol) {
    try {
        const data = await (0, client_1.kisGet)('/uapi/overseas-price/v1/quotations/price', 'HHDFS00000300', { AUTH: '', EXCD: exchange, SYMB: symbol });
        const o = data.output;
        const price = Number(o.last);
        const prevClose = Number(o.base);
        return {
            price,
            prevClose,
            changeRate: prevClose > 0 ? (price - prevClose) / prevClose : 0,
            volume: Number(o.tvol),
        };
    }
    catch (err) {
        console.error('[KIS overseas price]', exchange, symbol, err.message);
        return null;
    }
}
/** 해외주식 일봉 차트 */
async function getOverseasCandles(exchange, symbol, days = 30) {
    try {
        const data = await (0, client_1.kisGet)('/uapi/overseas-price/v1/quotations/dailychartprice', 'HHDFS76240000', {
            AUTH: '',
            EXCD: exchange,
            SYMB: symbol,
            GUBN: '0', // 0=일봉
            BYMD: '',
            MODP: '0',
        });
        const rows = (data.output2 ?? [])
            .filter((r) => r.xymd && Number(r.clos) > 0)
            .map((r) => ({
            date: r.xymd,
            open: Number(r.open),
            high: Number(r.high),
            low: Number(r.low),
            close: Number(r.clos),
            volume: Number(r.tvol),
        }))
            .slice(-days);
        return rows.reverse();
    }
    catch (err) {
        console.error('[KIS overseas candles]', exchange, symbol, err.message);
        return [];
    }
}
