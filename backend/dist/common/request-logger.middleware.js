"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLoggerMiddleware = requestLoggerMiddleware;
function requestLoggerMiddleware(req, res, next) {
    const started = Date.now();
    const rid = req.requestId || '';
    const user = req.user || {};
    const userId = user?.userId || user?.sub || user?.id || null;
    const method = req.method;
    const path = req.originalUrl;
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || '';
    const ua = req.headers['user-agent'] || '';
    try {
        console.log('[req]', { requestId: rid, method, path, ip, ua, userId });
    }
    catch { }
    res.on('finish', () => {
        const durationMs = Date.now() - started;
        const status = res.statusCode;
        try {
            console.log('[res]', { requestId: rid, method, path, status, durationMs, userId });
        }
        catch { }
    });
    next();
}
//# sourceMappingURL=request-logger.middleware.js.map