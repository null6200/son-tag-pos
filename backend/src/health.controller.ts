import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

// Track startup time and request counts
const startedAt = Date.now();
let requestCount = 0;
let errorCount = 0;

// Increment counters (called from middleware or interceptor)
export function incrementRequestCount() { requestCount++; }
export function incrementErrorCount() { errorCount++; }

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  // Backward-compatible simple health
  @Get()
  getHealth() {
    return {
      status: 'ok',
      service: 'sontag-pos-api',
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

  // Detailed metrics endpoint for monitoring
  @Get('metrics')
  async getMetrics() {
    const memUsage = process.memoryUsage();
    const uptime = Date.now() - startedAt;
    
    // DB stats
    let dbOk = false;
    let dbLatencyMs = 0;
    let activeConnections = 0;
    const dbStart = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbOk = true;
      dbLatencyMs = Date.now() - dbStart;
      // Try to get connection count (PostgreSQL specific)
      try {
        const result = await this.prisma.$queryRaw`SELECT count(*) as count FROM pg_stat_activity WHERE datname = current_database()` as any[];
        activeConnections = Number(result[0]?.count || 0);
      } catch {}
    } catch {
      dbOk = false;
      dbLatencyMs = Date.now() - dbStart;
    }

    return {
      status: dbOk ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: {
        ms: uptime,
        human: formatUptime(uptime),
      },
      process: {
        pid: process.pid,
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      },
      memory: {
        heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
        rssMB: Math.round(memUsage.rss / 1024 / 1024),
        externalMB: Math.round(memUsage.external / 1024 / 1024),
      },
      database: {
        status: dbOk ? 'connected' : 'disconnected',
        latencyMs: dbLatencyMs,
        activeConnections,
      },
      requests: {
        total: requestCount,
        errors: errorCount,
        errorRate: requestCount > 0 ? (errorCount / requestCount * 100).toFixed(2) + '%' : '0%',
      },
      environment: process.env.NODE_ENV || 'development',
      version: process.env.APP_VERSION || 'unknown',
    };
  }
}

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
  if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}
