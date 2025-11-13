import { Request, Response, NextFunction } from 'express';

export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction) {
  const started = Date.now();
  const rid = (req as any).requestId || '';
  const user = (req as any).user || {};
  const userId = user?.userId || user?.sub || user?.id || null;

  const method = req.method;
  const path = req.originalUrl;
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '';
  const ua = (req.headers['user-agent'] as string) || '';

  try { console.log('[req]', { requestId: rid, method, path, ip, ua, userId }); } catch {}

  res.on('finish', () => {
    const durationMs = Date.now() - started;
    const status = res.statusCode;
    try { console.log('[res]', { requestId: rid, method, path, status, durationMs, userId }); } catch {}
  });

  next();
}
