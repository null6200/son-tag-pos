"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllExceptionsFilter = void 0;
const common_1 = require("@nestjs/common");
const Sentry = __importStar(require("@sentry/node"));
let AllExceptionsFilter = class AllExceptionsFilter {
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const req = ctx.getRequest();
        const res = ctx.getResponse();
        const requestId = req?.requestId || '';
        let status = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Internal server error';
        if (exception instanceof common_1.HttpException) {
            status = exception.getStatus();
            const r = exception.getResponse();
            message = (typeof r === 'string') ? r : r?.message || message;
        }
        else if (exception && typeof exception.status === 'number') {
            status = exception.status;
            message = exception.message || message;
        }
        const payload = {
            ok: false,
            status,
            message,
            path: req.originalUrl,
            method: req.method,
            requestId,
            timestamp: new Date().toISOString(),
        };
        try {
            console.error('[error]', { requestId, status, err: exception });
        }
        catch { }
        try {
            if (process.env.SENTRY_DSN) {
                const user = req?.user || {};
                const userId = user?.userId || user?.sub || user?.id || undefined;
                const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || '';
                const ua = req.headers['user-agent'] || '';
                Sentry.withScope(scope => {
                    scope.setTag('requestId', requestId || '');
                    scope.setTag('path', req.originalUrl || '');
                    scope.setTag('method', req.method || '');
                    scope.setTag('status', String(status));
                    if (userId)
                        scope.setUser({ id: String(userId) });
                    scope.setContext('request', {
                        requestId,
                        method: req.method,
                        path: req.originalUrl,
                        status,
                        ip,
                        userAgent: ua,
                    });
                    Sentry.captureException(exception);
                });
            }
        }
        catch { }
        res.status(status).json(payload);
    }
};
exports.AllExceptionsFilter = AllExceptionsFilter;
exports.AllExceptionsFilter = AllExceptionsFilter = __decorate([
    (0, common_1.Catch)()
], AllExceptionsFilter);
//# sourceMappingURL=http-exception.filter.js.map