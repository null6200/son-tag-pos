import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './common/http-exception.filter';
import { requestIdMiddleware } from './common/request-id.middleware';
import { requestLoggerMiddleware } from './common/request-logger.middleware';
import { LoggerService } from './common/logger.service';
import * as Sentry from '@sentry/node';
import helmet from 'helmet';
import compression from 'compression';

async function bootstrap() {
  // Initialize structured logger
  const logger = new LoggerService();

  // Initialize Sentry (no-op if no DSN)
  if (process.env.SENTRY_DSN) {
    Sentry.init({ dsn: process.env.SENTRY_DSN, environment: process.env.NODE_ENV || 'development', tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0) });
    process.on('uncaughtException', (e) => { try { Sentry.captureException(e); logger.error('Uncaught Exception', e.stack, 'Process'); } catch {} });
    process.on('unhandledRejection', (e: any) => { try { Sentry.captureException(e); logger.error('Unhandled Rejection', e?.stack, 'Process'); } catch {} });
  }

  const app = await NestFactory.create(AppModule, {
    logger, // Use Winston logger for NestJS
  });

  // Trust proxy (X-Forwarded-*) when behind a reverse proxy
  try { (app as any).getHttpAdapter().getInstance().set('trust proxy', 1); } catch {}

  // Global API prefix
  app.setGlobalPrefix('api');

  // CORS allowlist from env ALLOWED_ORIGINS (comma-separated). Always allow localhost for dev.
  const raw = process.env.ALLOWED_ORIGINS || '';
  const allowed = raw.split(',').map(s => s.trim()).filter(Boolean);
  app.enableCors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      // Always allow localhost origins for development
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) return cb(null, true);
      if (allowed.length === 0) return cb(null, true);
      if (allowed.includes(origin)) return cb(null, true);
      return cb(new Error('CORS not allowed'), false);
    },
    credentials: true,
  });

  // Request ID middleware
  app.use(requestIdMiddleware);

  // Structured request/response logger
  app.use(requestLoggerMiddleware);

  // Debug: Log raw body for /status endpoints
  app.use((req, res, next) => {
    if (req.url?.includes('/status') && req.method === 'PATCH') {
      console.log('[DEBUG /status] URL:', req.url);
      console.log('[DEBUG /status] Method:', req.method);
      console.log('[DEBUG /status] Body:', JSON.stringify(req.body));
      console.log('[DEBUG /status] Headers Content-Type:', req.headers['content-type']);
    }
    next();
  });

  // Global validation - whitelist strips unknown properties, transform converts types
  app.useGlobalPipes(new ValidationPipe({ 
    whitelist: true, 
    // forbidNonWhitelisted disabled - was causing issues with properly decorated DTOs
    transform: true,
  }));

  // Security headers & compression
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } } as any));
  app.use(compression());

  // Global error filter with correlation IDs
  app.useGlobalFilters(new AllExceptionsFilter());

  // Allow overriding port via environment variable for isolated instances
  const port = Number(process.env.PORT) || 4000;
  // Bind to all interfaces so tunnels/remote devices can reach it
  await app.listen(port, '0.0.0.0');
  // Explicit startup log
  logger.log(`Application started on port ${port}`, 'Bootstrap');
  logger.log(`Environment: ${process.env.NODE_ENV || 'development'}`, 'Bootstrap');
}
bootstrap();
