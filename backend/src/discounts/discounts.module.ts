import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DiscountsController } from './discounts.controller';
import { DiscountsService } from './discounts.service';

@Module({
  controllers: [DiscountsController],
  providers: [DiscountsService, PrismaService],
})
export class DiscountsModule {}
