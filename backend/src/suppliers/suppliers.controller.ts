import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { SuppliersService } from './suppliers.service';

@UseGuards(JwtAuthGuard)
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly svc: SuppliersService) {}

  @UseGuards(PermissionsGuard)
  @Get()
  @Permissions('view_all_supplier')
  listAll(@Query('branchId') branchId?: string) { return this.svc.listAll(branchId); }

  @UseGuards(PermissionsGuard)
  @Get('mine')
  @Permissions('view_own_supplier')
  listMine(@Query('branchId') branchId?: string) { return this.svc.listAll(branchId); }

  @UseGuards(PermissionsGuard)
  @Post()
  @Permissions('add_supplier')
  create(@Body() dto: any) { return this.svc.create(dto); }

  @UseGuards(PermissionsGuard)
  @Put(':id')
  @Permissions('edit_supplier')
  update(@Param('id') id: string, @Body() dto: any) { return this.svc.update(id, dto); }

  @UseGuards(PermissionsGuard)
  @Delete(':id')
  @Permissions('delete_supplier')
  remove(@Param('id') id: string) { return this.svc.remove(id); }
}
