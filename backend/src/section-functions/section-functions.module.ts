import { Module } from '@nestjs/common';
import { SectionFunctionsController } from './section-functions.controller';
import { SectionFunctionsService } from './section-functions.service';

@Module({
  controllers: [SectionFunctionsController],
  providers: [SectionFunctionsService],
  exports: [SectionFunctionsService],
})
export class SectionFunctionsModule {}
