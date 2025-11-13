import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DefaultRolesSeeder implements OnModuleInit {
  private readonly logger = new Logger(DefaultRolesSeeder.name);
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    try {
      const branches = await this.prisma.branch.findMany({ select: { id: true, name: true } });
      for (const b of branches) {
        const exists = await this.prisma.appRole.findFirst({ where: { branchId: b.id, name: 'Admin' } });
        if (!exists) {
          await this.prisma.appRole.create({
            data: {
              branchId: b.id,
              name: 'Admin',
              permissions: ['all'],
            },
          });
          this.logger.log(`Created default Admin role for branch ${b.name}`);
        }
      }
    } catch (e) {
      this.logger.warn(`DefaultRolesSeeder skipped: ${e?.message || e}`);
    }
  }
}
