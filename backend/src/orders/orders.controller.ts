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
  status!: OrderStatus;
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
    @Req() req?: any,
  ) {
    const userId = req?.user?.userId as string | undefined;
    const perms: string[] = Array.isArray(req?.user?.permissions) ? req.user.permissions : [];
    return this.orders.list(branchId, from, to, userId, perms);
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
    return this.orders.create(dto, userId);
  }

  @UseGuards(PermissionsGuard)
  @Patch(':id/status')
  @Permissions('add_pos_sell', 'add_payment')
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.orders.updateStatus(id, dto.status);
  }

  @UseGuards(PermissionsGuard)
  @Post(':id/refund')
  @Permissions('access_all_sale_returns')
  async refund(@Param('id') id: string) {
    return this.orders.refund(id);
  }

  @UseGuards(PermissionsGuard)
  @Post(':id/refund-items')
  @Permissions('access_all_sale_returns')
  async refundItems(@Param('id') id: string, @Body() body: { items: RefundItemDto[] }) {
    return this.orders.refundItems(id, Array.isArray(body?.items) ? body.items : []);
  }

  @UseGuards(PermissionsGuard)
  @Post(':id/payments')
  @Permissions('add_pos_sell', 'add_payment')
  async addPayment(@Param('id') id: string, @Body() body: PaymentDto) {
    return this.orders.addPayment(id, body);
  }
}
