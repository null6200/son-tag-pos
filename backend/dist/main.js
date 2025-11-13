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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
const http_exception_filter_1 = require("./common/http-exception.filter");
const request_id_middleware_1 = require("./common/request-id.middleware");
const request_logger_middleware_1 = require("./common/request-logger.middleware");
const Sentry = __importStar(require("@sentry/node"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
async function bootstrap() {
    if (process.env.SENTRY_DSN) {
        Sentry.init({ dsn: process.env.SENTRY_DSN, environment: process.env.NODE_ENV || 'development', tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0) });
        process.on('uncaughtException', (e) => { try {
            Sentry.captureException(e);
        }
        catch { } });
        process.on('unhandledRejection', (e) => { try {
            Sentry.captureException(e);
        }
        catch { } });
    }
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    try {
        app.getHttpAdapter().getInstance().set('trust proxy', 1);
    }
    catch { }
    app.setGlobalPrefix('api');
    const raw = process.env.ALLOWED_ORIGINS || '';
    const allowed = raw.split(',').map(s => s.trim()).filter(Boolean);
    app.enableCors({
        origin: (origin, cb) => {
            if (!origin)
                return cb(null, true);
            if (allowed.length === 0)
                return cb(null, true);
            if (allowed.includes(origin))
                return cb(null, true);
            return cb(new Error('CORS not allowed'), false);
        },
        credentials: true,
    });
    app.use(request_id_middleware_1.requestIdMiddleware);
    app.use(request_logger_middleware_1.requestLoggerMiddleware);
    app.useGlobalPipes(new common_1.ValidationPipe({ whitelist: true, forbidNonWhitelisted: false, transform: true }));
    app.use((0, helmet_1.default)({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
    app.use((0, compression_1.default)());
    app.useGlobalFilters(new http_exception_filter_1.AllExceptionsFilter());
    const port = Number(process.env.PORT) || 4000;
    await app.listen(port, '0.0.0.0');
    console.log(`Nest application successfully started on http://localhost:${port}`);
}
bootstrap();
//# sourceMappingURL=main.js.map