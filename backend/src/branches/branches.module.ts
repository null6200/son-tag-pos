import { Module } from '@nestjs/common';
import { BranchesService } from './branches.service';
import { BranchesController, PublicBranchesController } from './branches.controller';
import { BranchBootstrapService } from './branches.bootstrap';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BranchesController, PublicBranchesController],
  providers: [BranchesService, BranchBootstrapService],
  exports: [BranchesService],
})
export class BranchesModule {}
