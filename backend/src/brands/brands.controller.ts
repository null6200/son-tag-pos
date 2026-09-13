import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { BrandsService } from './brands.service';

@UseGuards(JwtAuthGuard)
@Controller('brands')
export class BrandsController {
  constructor(private readonly svc: BrandsService) {}

  @UseGuards(PermissionsGuard)
  @Get()
  @Permissions('view_brand')
  list(@Query('branchId') branchId?: string) { return this.svc.list(branchId); }

  @UseGuards(PermissionsGuard)
  @Post()
  @Permissions('add_brand')
  create(@Body() dto: any) { return this.svc.create(dto); }

  @UseGuards(PermissionsGuard)
  @Put(':id')
  @Permissions('edit_brand')
  update(@Param('id') id: string, @Body() dto: any) { return this.svc.update(id, dto); }

  @UseGuards(PermissionsGuard)
  @Delete(':id')
  @Permissions('delete_brand')
  remove(@Param('id') id: string) { return this.svc.remove(id); }
}
