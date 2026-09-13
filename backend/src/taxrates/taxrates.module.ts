import { Module } from '@nestjs/common';
import { TaxRatesController } from './taxrates.controller';
import { TaxRatesService } from './taxrates.service';

@Module({
  controllers: [TaxRatesController],
  providers: [TaxRatesService],
})
export class TaxRatesModule {}
