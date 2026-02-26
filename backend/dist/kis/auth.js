"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isKisConfigured = isKisConfigured;
exports.getToken = getToken;
const axios_1 = __importDefault(require("axios"));
const client_1 = require("./client");
let cache = null;
function isKisConfigured() {
    return !!(process.env.KIS_APP_KEY && process.env.KIS_APP_SECRET);
}
async function getToken() {
    if (cache && Date.now() < cache.expiresAt)
        return cache.token;
    const res = await axios_1.default.post(`${client_1.KIS_BASE}/oauth2/tokenP`, {
        grant_type: 'client_credentials',
        appkey: process.env.KIS_APP_KEY,
        appsecret: process.env.KIS_APP_SECRET,
    });
    const { access_token, expires_in } = res.data;
    cache = {
        token: access_token,
        expiresAt: Date.now() + (expires_in - 300) * 1000, // 5분 앞서 갱신
    };
    console.log('[KIS] Token issued, expires in', expires_in, 's');
    return cache.token;
}
