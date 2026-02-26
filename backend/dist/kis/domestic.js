"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDomesticPrice = getDomesticPrice;
exports.getDomesticCandles = getDomesticCandles;
const client_1 = require("./client");
/** 국내주식 현재가 조회 */
async function getDomesticPrice(code) {
    try {
        const data = await (0, client_1.kisGet)('/uapi/domestic-stock/v1/quotations/inquire-price', 'FHKST01010100', { FID_COND_MRKT_DIV_CODE: 'J', FID_INPUT_ISCD: code });
        const o = data.output;
        return {
            price: Number(o.stck_prpr),
            prevClose: Number(o.stck_sdpr), // 기준가 (전일종가)
            changeRate: Number(o.prdy_ctrt) / 100,
            volume: Number(o.acml_vol),
            open: Number(o.stck_oprc),
            high: Number(o.stck_hgpr),
            low: Number(o.stck_lwpr),
        };
    }
    catch (err) {
        console.error('[KIS domestic price]', code, err.message);
        return null;
    }
}
/** 국내주식 일봉 차트 (최근 N일) */
async function getDomesticCandles(code, days = 30) {
    try {
        const toDate = new Date();
        const fromDate = new Date();
        fromDate.setDate(toDate.getDate() - days * 2); // 영업일 감안해 여유있게
        const fmt = (d) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
        const data = await (0, client_1.kisGet)('/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice', 'FHKST03010100', {
            FID_COND_MRKT_DIV_CODE: 'J',
            FID_INPUT_ISCD: code,
            FID_INPUT_DATE_1: fmt(fromDate),
            FID_INPUT_DATE_2: fmt(toDate),
            FID_PERIOD_DIV_CODE: 'D',
            FID_ORG_ADJ_PRC: '0',
        });
        const rows = (data.output2 ?? [])
            .filter((r) => r.stck_bsop_date && Number(r.stck_clpr) > 0)
            .map((r) => ({
            date: r.stck_bsop_date,
            open: Number(r.stck_oprc),
            high: Number(r.stck_hgpr),
            low: Number(r.stck_lwpr),
            close: Number(r.stck_clpr),
            volume: Number(r.acml_vol),
        }))
            .slice(-days); // 최신 N일만
        return rows.reverse(); // 오래된 것부터
    }
    catch (err) {
        console.error('[KIS domestic candles]', code, err.message);
        return [];
    }
}
