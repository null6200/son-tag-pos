import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsNumberString, IsOptional, IsString, ValidateNested } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { OrdersService } from './orders.service';

class CreateOrderItemDto {
  @IsString()
  productId!: string;

  @IsNumberString()
  qty!: string;

  @IsNumberString()
  price!: string;
}
class PaymentDto {
  @IsString()
  method!: string;

  @IsNumberString()
  amount!: string;

  @IsOptional()
  @IsString()
  reference?: string;
}
interface RefundItemDto { productId: string; qty: number; }
type OrderStatus = 'DRAFT' | 'ACTIVE' | 'PENDING_PAYMENT' | 'SUSPENDED' | 'PAID' | 'CANCELLED' | 'VOIDED' | 'REFUNDED';

class CreateOrderDto {
  @IsString()
  branchId!: string;

  @IsOptional()
  @IsString()
  sectionId?: string;

  @IsOptional()
  @IsString()
  sectionName?: string;

  @IsOptional()
  @IsString()
  tableId?: string | null;

  // When finalising a draft-backed order, the POS can send the backing
  // orderId so the service can explicitly reuse that order instead of
  // allocating a new one.
  @IsOptional()
  @IsString()
  orderId?: string;

  @IsOptional()
  @IsIn(['DRAFT','ACTIVE','PENDING_PAYMENT','SUSPENDED','PAID','CANCELLED','VOIDED','REFUNDED'])
  status?: OrderStatus;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => PaymentDto)
  payment?: PaymentDto;

  @IsOptional()
  @IsBoolean()
  allowOverselling?: boolean;

  // Optional client-computed financials (persisted)
  @IsOptional()
  @IsNumberString()
  subtotal?: string;

  @IsOptional()
  @IsNumberString()
  discount?: string;

  @IsOptional()
  @IsNumberString()
  tax?: string;

  @IsOptional()
  @IsNumberString()
  total?: string;

  @IsOptional()
  @IsNumberString()
  taxRate?: string;

  @IsOptional()
  @IsString()
  overrideOwnerId?: string;

  @IsOptional()
  @IsBoolean()
  replaceItems?: boolean;

  @IsOptional()
  @IsBoolean()
  reuseExisting?: boolean;

  // Meta
  @IsOptional()
  @IsString()
  serviceType?: string;

  @IsOptional()
  @IsString()
  waiterId?: string;

  @IsOptional()
  @IsString()
  reservationKey?: string;
}

class UpdateOrderStatusDto {
  @IsString()
  @IsIn(['DRAFT','ACTIVE','PENDING_PAYMENT','SUSPENDED','PAID','CANCELLED','VOIDED','REFUNDED'])
  status!: OrderStatus;

  @IsOptional()
  @IsString()
  overrideOwnerId?: string;
}

@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @UseGuards(PermissionsGuard)
  @Get()
  @Permissions('view_pos_sell')
  async list(
    @Query('branchId') branchId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
    @Query('userId') filterUserId?: string,
    @Req() req?: any,
  ) {
    const userId = req?.user?.userId as string | undefined;
    const role = req?.user?.role as string | undefined;
    const perms: string[] = Array.isArray(req?.user?.permissions) ? req.user.permissions : [];
    const canSeeAll = role === 'ADMIN'
      || (perms || []).includes('all')
      || (perms || []).includes('view_sales_all');
    const effectiveUserId = canSeeAll ? undefined : userId;
    const p = page ? Number(page) : undefined;
    const ps = pageSize ? Number(pageSize) : undefined;
    return this.orders.list(branchId, from, to, effectiveUserId, perms, p, ps, status, filterUserId);
  }

  @UseGuards(PermissionsGuard)
  @Get(':id')
  @Permissions('view_pos_sell')
  async get(@Param('id') id: string) {
    return this.orders.getOne(id);
  }

  @UseGuards(PermissionsGuard)
  @Post()
  @Permissions('add_pos_sell')
  async create(@Body() dto: CreateOrderDto, @Req() req: any) {
    const userId = req.user?.userId as string | undefined;
    const overrideOwnerId = (dto as any)?.overrideOwnerId as string | undefined;
    return this.orders.create(dto, userId, overrideOwnerId);
  }

  @UseGuards(PermissionsGuard)
  @Patch(':id')
  @Permissions('add_payment')
  async updateOrder(@Param('id') id: string, @Body() body: { subtotal?: string; discount?: string; tax?: string; total?: string; taxRate?: string }, @Req() req: any) {
    const userId = req?.user?.userId as string | undefined;
    return this.orders.updateTotals(id, body, userId);
  }

  @UseGuards(PermissionsGuard)
  @Patch(':id/status')
  @Permissions('add_payment')
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto, @Req() req: any) {
    console.log('[updateStatus] Received body:', JSON.stringify(dto));
    console.log('[updateStatus] Order ID:', id);
    console.log('[updateStatus] DTO status:', dto?.status, 'type:', typeof dto?.status);
    const userId = req?.user?.userId as string | undefined;
    const overrideOwnerId = dto.overrideOwnerId as string | undefined;
    const updated = await this.orders.updateStatus(id, dto.status, false, userId);
    if (overrideOwnerId && String(dto.status).toUpperCase() === 'SUSPENDED') {
      await this.orders.logOverrideSuspend(id, userId, overrideOwnerId);
    }
    return updated;
  }

  @UseGuards(PermissionsGuard)
  @Post(':id/refund')
  @Permissions('access_all_sale_returns')
  async refund(@Param('id') id: string, @Body() body: { overrideOwnerId?: string; idempotencyKey?: string }, @Req() req: any) {
    const userId = req?.user?.userId as string | undefined;
    const overrideOwnerId = body?.overrideOwnerId as string | undefined;
    const idempotencyKey = body?.idempotencyKey as string | undefined;
    return this.orders.refund(id, userId, overrideOwnerId, idempotencyKey);
  }

  @UseGuards(PermissionsGuard)
  @Post(':id/refund-items')
  @Permissions('access_all_sale_returns')
  async refundItems(@Param('id') id: string, @Body() body: { items: RefundItemDto[]; overrideOwnerId?: string }, @Req() req: any) {
    const userId = req?.user?.userId as string | undefined;
    const overrideOwnerId = body?.overrideOwnerId as string | undefined;
    return this.orders.refundItems(id, Array.isArray(body?.items) ? body.items : [], userId, overrideOwnerId);
  }

  @UseGuards(PermissionsGuard)
  @Post(':id/payments')
  @Permissions('add_payment')
  async addPayment(@Param('id') id: string, @Body() body: PaymentDto, @Req() req: any) {
    const userId = req?.user?.userId as string | undefined;
    return this.orders.addPayment(id, body, userId);
  }

  @UseGuards(PermissionsGuard)
  @Post(':id/events')
  @Permissions('add_pos_sell')
  async logEvent(
    @Param('id') id: string,
    @Body() body: { action: string; meta?: any },
    @Req() req: any,
  ) {
    const userId = req?.user?.userId as string | undefined;
    return this.orders.logSaleEvent(id, { userId, action: body.action, meta: body.meta });
  }
}
