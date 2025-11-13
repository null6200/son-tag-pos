import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { RolesService } from './roles.service';

@Controller('roles')
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async list(@Query('branchId') branchId: string, @Query('includeArchived') includeArchived?: string) {
    return this.roles.list(branchId, includeArchived === 'true' || includeArchived === '1');
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post()
  @Permissions('settings')
  async create(@Body() dto: any, @Req() req: any) {
    return this.roles.create(dto, req.user?.role);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Put(':id')
  @Permissions('settings')
  async update(@Param('id') id: string, @Body() dto: any, @Req() req: any) {
    return this.roles.update(id, dto, req.user?.role);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Delete(':id')
  @Permissions('settings')
  async remove(@Param('id') id: string, @Req() req: any) {
    return this.roles.remove(id, req.user?.role);
  }
}
