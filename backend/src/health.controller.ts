import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  // Backward-compatible simple health
  @Get()
  getHealth() {
    return {
      status: 'ok',
      service: 'backend-api',
      time: new Date().toISOString(),
      version: process.env.APP_VERSION || undefined,
      env: process.env.NODE_ENV || 'development',
    } as any;
  }

  // Kubernetes-style liveness probe
  @Get('live')
  getLiveness() {
    return {
      status: 'ok',
      time: new Date().toISOString(),
    } as any;
  }

  // Readiness probe with DB check
  @Get('ready')
  async getReadiness() {
    let dbOk = false;
    let dbLatencyMs: number | undefined = undefined;
    const started = Date.now();
    try {
      // Minimal query to validate DB connectivity
      await this.prisma.$queryRaw`SELECT 1`;
      dbOk = true;
    } catch {
      dbOk = false;
    } finally {
      dbLatencyMs = Date.now() - started;
    }
    const ok = dbOk;
    return {
      status: ok ? 'ok' : 'degraded',
      db: dbOk ? 'ok' : 'down',
      dbLatencyMs,
      time: new Date().toISOString(),
      version: process.env.APP_VERSION || undefined,
      env: process.env.NODE_ENV || 'development',
    } as any;
  }
}
