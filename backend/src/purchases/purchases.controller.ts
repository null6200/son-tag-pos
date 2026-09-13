import { Body, Controller, Delete, ForbiddenException, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { PurchasesService } from './purchases.service';

@UseGuards(JwtAuthGuard)
@Controller('purchase-orders')
export class PurchasesController {
  constructor(private readonly svc: PurchasesService) {}

  @UseGuards(PermissionsGuard)
  @Get()
  @Permissions('view_all_purchase')
  listAll(
    @Query('branchId') branchId?: string,
    @Query('supplierId') supplierId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.svc.listAll({
      branchId,
      supplierId,
      status,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @UseGuards(PermissionsGuard)
  @Get('mine')
  @Permissions('view_own_purchase')
  listMine(
    @Req() req: any,
    @Query('branchId') branchId?: string,
    @Query('supplierId') supplierId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const userId = req.user?.userId as string;
    return this.svc.listMine(
      { branchId, supplierId, status, page: page ? Number(page) : undefined, pageSize: pageSize ? Number(pageSize) : undefined },
      userId,
    );
  }

  @UseGuards(PermissionsGuard)
  @Get(':id')
  @Permissions('view_all_purchase', 'view_own_purchase')
  get(@Param('id') id: string) {
    return this.svc.get(id);
  }

  @UseGuards(PermissionsGuard)
  @Post()
  @Permissions('add_purchase')
  create(@Body() dto: { branchId: string; supplierId?: string | null; items?: { productId: string; quantity: number; price: string | number }[] }, @Req() req: any) {
    const userId = req.user?.userId as string | undefined;
    return this.svc.create(dto, userId);
  }

  @UseGuards(PermissionsGuard)
  @Put(':id')
  @Permissions('edit_purchase')
  update(@Param('id') id: string, @Body() dto: { status?: string; supplierId?: string | null }, @Req() req: any) {
    const userId = req.user?.userId as string | undefined;
    // Marking a PO RECEIVED is what credits inventory — require the more specific
    // inventory permission for that transition, not just generic edit_purchase,
    // even though both come through this same endpoint from the frontend.
    if (String(dto?.status || '').toUpperCase() === 'RECEIVED') {
      const role = req.user?.role;
      const perms: string[] = Array.isArray(req.user?.permissions) ? req.user.permissions : [];
      const canReceive = role === 'ADMIN' || perms.includes('all') || perms.includes('purchase_manage_inventory');
      if (!canReceive) throw new ForbiddenException('Insufficient permissions to receive stock for this purchase order');
    }
    return this.svc.update(id, dto, userId);
  }

  @UseGuards(PermissionsGuard)
  @Delete(':id')
  @Permissions('delete_purchase')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }

  @UseGuards(PermissionsGuard)
  @Post(':id/payments')
  @Permissions('add_purchase_payment')
  addPayment(@Param('id') id: string, @Body() dto: { method: string; amount: string | number; reference?: string }) {
    return this.svc.addPayment(id, dto);
  }

  @UseGuards(PermissionsGuard)
  @Put(':id/payments/:paymentId')
  @Permissions('edit_purchase_payment')
  editPayment(@Param('id') id: string, @Param('paymentId') paymentId: string, @Body() dto: { method?: string; amount?: string | number; reference?: string }) {
    return this.svc.editPayment(id, paymentId, dto);
  }

  @UseGuards(PermissionsGuard)
  @Delete(':id/payments/:paymentId')
  @Permissions('delete_purchase_payment')
  deletePayment(@Param('id') id: string, @Param('paymentId') paymentId: string) {
    return this.svc.deletePayment(id, paymentId);
  }

  // Kept as an explicit alias alongside the generic status PUT above — both end up
  // calling the same receive logic, so a PO can never be "received" (and stock
  // credited) more than once regardless of which endpoint the client used.
  @UseGuards(PermissionsGuard)
  @Post(':id/receive')
  @Permissions('purchase_manage_inventory')
  receive(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.userId as string | undefined;
    return this.svc.receive(id, userId);
  }
}
