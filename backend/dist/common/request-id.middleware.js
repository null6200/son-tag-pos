"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestIdMiddleware = requestIdMiddleware;
function randomId() {
    try {
        return (Math.random().toString(36).slice(2) +
            Date.now().toString(36) +
            Math.random().toString(36).slice(2)).slice(0, 32);
    }
    catch {
        return String(Date.now());
    }
}
function requestIdMiddleware(req, res, next) {
    try {
        const incoming = req.headers['x-request-id']?.trim();
        const id = incoming && incoming.length > 0 ? incoming : randomId();
        req.requestId = id;
        res.setHeader('X-Request-Id', id);
    }
    catch { }
    next();
}
//# sourceMappingURL=request-id.middleware.js.map