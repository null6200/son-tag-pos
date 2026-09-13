import { Body, Controller, Delete, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { PurchasesService } from './purchases.service';

@UseGuards(JwtAuthGuard)
@Controller('purchases')
export class PurchasesController {
  constructor(private readonly svc: PurchasesService) {}

  @UseGuards(PermissionsGuard)
  @Get()
  @Permissions('view_all_purchase')
  listAll() { return this.svc.notImplemented(); }

  @UseGuards(PermissionsGuard)
  @Get('mine')
  @Permissions('view_own_purchase')
  listMine() { return this.svc.notImplemented(); }

  @UseGuards(PermissionsGuard)
  @Post()
  @Permissions('add_purchase')
  create(@Body() _dto: any, @Req() _req: any) { return this.svc.notImplemented(); }

  @UseGuards(PermissionsGuard)
  @Put(':id')
  @Permissions('edit_purchase')
  update(@Param('id') _id: string, @Body() _dto: any) { return this.svc.notImplemented(); }

  @UseGuards(PermissionsGuard)
  @Delete(':id')
  @Permissions('delete_purchase')
  remove(@Param('id') _id: string) { return this.svc.notImplemented(); }

  @UseGuards(PermissionsGuard)
  @Post(':id/payments')
  @Permissions('add_purchase_payment')
  addPayment(@Param('id') _id: string, @Body() _dto: any) { return this.svc.notImplemented(); }

  @UseGuards(PermissionsGuard)
  @Put(':id/payments/:paymentId')
  @Permissions('edit_purchase_payment')
  editPayment(@Param('id') _id: string, @Param('paymentId') _pid: string, @Body() _dto: any) { return this.svc.notImplemented(); }

  @UseGuards(PermissionsGuard)
  @Delete(':id/payments/:paymentId')
  @Permissions('delete_purchase_payment')
  deletePayment(@Param('id') _id: string, @Param('paymentId') _pid: string) { return this.svc.notImplemented(); }

  @UseGuards(PermissionsGuard)
  @Put(':id/status')
  @Permissions('update_purchase_status')
  updateStatus(@Param('id') _id: string, @Body() _dto: any) { return this.svc.notImplemented(); }

  @UseGuards(PermissionsGuard)
  @Post(':id/receive')
  @Permissions('purchase_manage_inventory')
  receive(@Param('id') _id: string, @Body() _dto: any) { return this.svc.notImplemented(); }
}
