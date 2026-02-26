"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const stocks_1 = require("./routes/stocks");
const poller_1 = require("./poller");
const auth_1 = require("./kis/auth");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = Number(process.env.PORT ?? 3001);
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL
        ? process.env.FRONTEND_URL.split(',').map(s => s.trim())
        : '*',
    credentials: true,
}));
app.use(express_1.default.json());
// ── 헬스체크 ──────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        kisConfigured: (0, auth_1.isKisConfigured)(),
        kisMode: process.env.KIS_MODE ?? 'paper',
        ts: Date.now(),
    });
});
// ── 라우터 ────────────────────────────────────────────────────────────────────
app.use('/api/stocks', stocks_1.stocksRouter);
// ── 시작 ──────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`[Server] listening on port ${PORT}`);
    console.log(`[Server] KIS: ${(0, auth_1.isKisConfigured)() ? '✓ configured' : '✗ not configured (Yahoo fallback)'}`);
    console.log(`[Server] mode: ${process.env.KIS_MODE ?? 'paper (모의투자)'}`);
    (0, poller_1.startPoller)();
});
