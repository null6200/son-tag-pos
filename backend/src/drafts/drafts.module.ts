import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { HrmModule } from '../hrm/hrm.module';
import { DraftsController } from './drafts.controller';
import { DraftsService } from './drafts.service';
import { AuditService } from '../audit/audit.service';

@Module({
  imports: [PrismaModule, HrmModule],
  controllers: [DraftsController],
  providers: [DraftsService, AuditService],
  exports: [DraftsService],
})
export class DraftsModule {}
