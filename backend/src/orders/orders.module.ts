import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { AuditService } from '../audit/audit.service';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService, AuditService],
  exports: [OrdersService],
})
export class OrdersModule {}
