import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { SubcategoriesService } from './subcategories.service';

@UseGuards(JwtAuthGuard)
@Controller('subcategories')
export class SubcategoriesController {
  constructor(private readonly svc: SubcategoriesService) {}

  @UseGuards(PermissionsGuard)
  @Get()
  @Permissions('view_subcategory')
  list(@Query('branchId') branchId?: string) { return this.svc.list(branchId); }

  @UseGuards(PermissionsGuard)
  @Post()
  @Permissions('add_subcategory')
  create(@Body() dto: any) { return this.svc.create(dto); }

  @UseGuards(PermissionsGuard)
  @Put(':id')
  @Permissions('edit_subcategory')
  update(@Param('id') id: string, @Body() dto: any) { return this.svc.update(id, dto); }

  @UseGuards(PermissionsGuard)
  @Delete(':id')
  @Permissions('delete_subcategory')
  remove(@Param('id') id: string) { return this.svc.remove(id); }
}
