import { Module } from '@nestjs/common';
import { PricingController, PriceListsController } from './pricing.controller';
import { PricingService } from './pricing.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PricingController, PriceListsController],
  providers: [PricingService],
  exports: [PricingService],
})
export class PricingModule {}
