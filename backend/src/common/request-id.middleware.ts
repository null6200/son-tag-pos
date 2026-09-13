import { Request, Response, NextFunction } from 'express';

function randomId() {
  try {
    return (
      Math.random().toString(36).slice(2) +
      Date.now().toString(36) +
      Math.random().toString(36).slice(2)
    ).slice(0, 32);
  } catch {
    return String(Date.now());
  }
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const incoming = (req.headers['x-request-id'] as string | undefined)?.trim();
    const id = incoming && incoming.length > 0 ? incoming : randomId();
    (req as any).requestId = id;
    res.setHeader('X-Request-Id', id);
  } catch {}
  next();
}
