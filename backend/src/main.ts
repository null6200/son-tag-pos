import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './common/http-exception.filter';
import { requestIdMiddleware } from './common/request-id.middleware';
import { requestLoggerMiddleware } from './common/request-logger.middleware';
import * as Sentry from '@sentry/node';
import helmet from 'helmet';
import compression from 'compression';

async function bootstrap() {
  // Initialize Sentry (no-op if no DSN)
  if (process.env.SENTRY_DSN) {
    Sentry.init({ dsn: process.env.SENTRY_DSN, environment: process.env.NODE_ENV || 'development', tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0) });
    process.on('uncaughtException', (e) => { try { Sentry.captureException(e); } catch {} });
    process.on('unhandledRejection', (e: any) => { try { Sentry.captureException(e); } catch {} });
  }

  const app = await NestFactory.create(AppModule);

  // Trust proxy (X-Forwarded-*) when behind a reverse proxy
  try { (app as any).getHttpAdapter().getInstance().set('trust proxy', 1); } catch {}

  // Global API prefix
  app.setGlobalPrefix('api');

  // CORS allowlist from env ALLOWED_ORIGINS (comma-separated). Fall back to current dev host.
  const raw = process.env.ALLOWED_ORIGINS || '';
  const allowed = raw.split(',').map(s => s.trim()).filter(Boolean);
  app.enableCors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
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

  // Global validation
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false, transform: true }));

  // Security headers & compression
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } } as any));
  app.use(compression());

  // Global error filter with correlation IDs
  app.useGlobalFilters(new AllExceptionsFilter());

  // Allow overriding port via environment variable for isolated instances
  const port = Number(process.env.PORT) || 4000;
  // Bind to all interfaces so tunnels/remote devices can reach it
  await app.listen(port, '0.0.0.0');
  // Explicit startup log as requested
  console.log(`Nest application successfully started on http://localhost:${port}`);
}
bootstrap();
