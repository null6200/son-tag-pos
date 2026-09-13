import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ServiceTypesService } from './service-types.service';
import { ServiceTypesController } from './service-types.controller';

@Module({
  controllers: [ServiceTypesController],
  providers: [ServiceTypesService, PrismaService],
})
export class ServiceTypesModule {}
