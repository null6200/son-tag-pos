import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  constructor(private readonly prisma: PrismaService) {}

  async log({ action, userId, branchId, meta }: { action: string; userId?: string; branchId?: string; meta?: any }) {
    // Best effort: write to prisma if model exists; otherwise log to console
    try {
      const anyPrisma = this.prisma as any;
      if (anyPrisma.auditLog?.create) {
        await anyPrisma.auditLog.create({
          data: {
            action,
            userId: userId || null,
            branchId: branchId || null,
            meta: meta ? JSON.stringify(meta) : null,
          },
        });
        return { ok: true };
      }
    } catch (e) {
      this.logger.warn(`Audit DB write failed: ${e?.message || e}`);
    }
    this.logger.log(`[AUDIT] action=${action} user=${userId} branch=${branchId} meta=${JSON.stringify(meta || {})}`);
    return { ok: true, logged: 'console' };
  }
}
