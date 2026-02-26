"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KIS_BASE = void 0;
exports.kisGet = kisGet;
const axios_1 = __importDefault(require("axios"));
const auth_1 = require("./auth");
// 모의투자(paper) vs 실전투자 선택
exports.KIS_BASE = process.env.KIS_MODE === 'real'
    ? 'https://openapi.koreainvestment.com:9443'
    : 'https://openapivts.koreainvestment.com:9443';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function kisGet(path, trId, params) {
    const token = await (0, auth_1.getToken)();
    const res = await axios_1.default.get(`${exports.KIS_BASE}${path}`, {
        params,
        headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${token}`,
            appkey: process.env.KIS_APP_KEY,
            appsecret: process.env.KIS_APP_SECRET,
            tr_id: trId,
            custtype: 'P',
        },
        timeout: 10000,
    });
    if (res.data.rt_cd && res.data.rt_cd !== '0') {
        throw new Error(`KIS API [${trId}]: ${res.data.msg1 ?? 'unknown error'}`);
    }
    return res.data;
}
