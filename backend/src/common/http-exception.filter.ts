import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import * as Sentry from '@sentry/node';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const requestId = (req as any)?.requestId || '';
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: any = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const r = exception.getResponse();
      message = (typeof r === 'string') ? r : (r as any)?.message || message;
    } else if (exception && typeof (exception as any).status === 'number') {
      status = (exception as any).status;
      message = (exception as any).message || message;
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
    } catch {}

    // Capture to Sentry with rich context (if initialized)
    try {
      if (process.env.SENTRY_DSN) {
        const user: any = (req as any)?.user || {};
        const userId = user?.userId || user?.sub || user?.id || undefined;
        const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '';
        const ua = (req.headers['user-agent'] as string) || '';
        Sentry.withScope(scope => {
          scope.setTag('requestId', requestId || '');
          scope.setTag('path', req.originalUrl || '');
          scope.setTag('method', req.method || '');
          scope.setTag('status', String(status));
          if (userId) scope.setUser({ id: String(userId) });
          scope.setContext('request', {
            requestId,
            method: req.method,
            path: req.originalUrl,
            status,
            ip,
            userAgent: ua,
          } as any);
          Sentry.captureException(exception as any);
        });
      }
    } catch {}
    res.status(status).json(payload);
  }
}
