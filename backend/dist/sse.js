"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addClient = addClient;
exports.removeClient = removeClient;
exports.broadcastPrice = broadcastPrice;
exports.broadcastAll = broadcastAll;
exports.clientCount = clientCount;
const clients = new Map();
function addClient(id, res) {
    const client = { id, res, symbols: new Set() };
    clients.set(id, client);
    console.log(`[SSE] +client ${id}, total=${clients.size}`);
    return client;
}
function removeClient(id) {
    clients.delete(id);
    console.log(`[SSE] -client ${id}, total=${clients.size}`);
}
function broadcastPrice(symbol, data) {
    const msg = `data: ${JSON.stringify({ symbol, ...data })}\n\n`;
    for (const client of clients.values()) {
        if (client.symbols.size === 0 || client.symbols.has(symbol)) {
            try {
                client.res.write(msg);
            }
            catch { /* client disconnected */ }
        }
    }
}
function broadcastAll(data) {
    const msg = `data: ${JSON.stringify(data)}\n\n`;
    for (const client of clients.values()) {
        try {
            client.res.write(msg);
        }
        catch { /* ignore */ }
    }
}
function clientCount() {
    return clients.size;
}
