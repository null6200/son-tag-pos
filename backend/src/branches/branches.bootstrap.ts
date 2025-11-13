import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BranchBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(BranchBootstrapService.name);
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    const enabled = (process.env.BRANCH_BOOTSTRAP_ENABLED ?? 'true').toLowerCase() !== 'false';
    if (!enabled) return;
    try {
      const count = await (this.prisma as any).branch.count();
      if (count === 0) {
        const name = process.env.BRANCH_BOOTSTRAP_NAME || 'Main Branch';
        const location = process.env.BRANCH_BOOTSTRAP_LOCATION || 'Default';
        await (this.prisma as any).branch.create({ data: { name, location } });
        this.logger.log(`Bootstrapped default branch: ${name}`);
      }
    } catch (e) {
      this.logger.warn(`Branch bootstrap skipped: ${e?.message || e}`);
    }
  }
}
