import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { CustomersService } from './customers.service';

@UseGuards(JwtAuthGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly svc: CustomersService) {}

  @UseGuards(PermissionsGuard)
  @Get()
  @Permissions('view_all_customer', 'view_pos_sell', 'add_pos_sell', 'edit_pos_sell', 'delete_pos_sell')
  listAll(@Query('branchId') branchId?: string) {
    return this.svc.listAll(branchId);
  }

  @UseGuards(PermissionsGuard)
  @Get('mine')
  @Permissions('view_own_customer')
  listMine(@Query('branchId') branchId?: string) {
    return this.svc.listAll(branchId);
  }

  @UseGuards(PermissionsGuard)
  @Post()
  @Permissions('add_customer')
  create(@Body() dto: any) {
    return this.svc.create(dto);
  }

  @UseGuards(PermissionsGuard)
  @Put(':id')
  @Permissions('edit_customer')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.svc.update(id, dto);
  }

  @UseGuards(PermissionsGuard)
  @Delete(':id')
  @Permissions('delete_customer')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }

  @UseGuards(PermissionsGuard)
  @Get('no-sell/1-month')
  @Permissions('view_no_sell_1_month')
  noSell1m() { return this.svc.notImplemented(); }

  @UseGuards(PermissionsGuard)
  @Get('no-sell/3-months')
  @Permissions('view_no_sell_3_months')
  noSell3m() { return this.svc.notImplemented(); }

  @UseGuards(PermissionsGuard)
  @Get('no-sell/6-months')
  @Permissions('view_no_sell_6_months')
  noSell6m() { return this.svc.notImplemented(); }

  @UseGuards(PermissionsGuard)
  @Get('no-sell/1-year')
  @Permissions('view_no_sell_1_year')
  noSell1y() { return this.svc.notImplemented(); }

  @UseGuards(PermissionsGuard)
  @Get('no-sell/any')
  @Permissions('view_no_sell_any')
  noSellAny() { return this.svc.notImplemented(); }
}
