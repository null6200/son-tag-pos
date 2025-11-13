import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { ServiceTypesService } from './service-types.service';

@UseGuards(JwtAuthGuard)
@Controller('service-types')
export class ServiceTypesController {
  constructor(private readonly svc: ServiceTypesService) {}

  @UseGuards(PermissionsGuard)
  @Get()
  @Permissions('view_settings', 'view_pos_sell', 'add_pos_sell', 'edit_pos_sell', 'delete_pos_sell')
  async list(@Query('branchId') branchId: string, @Req() req: any) {
    const effectiveBranchId = branchId ?? req?.user?.branchId;
    if (!effectiveBranchId) throw new BadRequestException('branchId is required');
    return this.svc.list(String(effectiveBranchId));
  }

  @UseGuards(PermissionsGuard)
  @Post()
  @Permissions('manage_settings')
  async create(@Body() dto: { branchId?: string; name: string; description?: string }, @Req() req: any) {
    const branchId = dto.branchId ?? req?.user?.branchId;
    if (!branchId) throw new BadRequestException('branchId is required');
    return this.svc.create({ branchId, name: dto.name, description: dto.description }, req.user?.role);
  }

  @UseGuards(PermissionsGuard)
  @Put(':id')
  @Permissions('manage_settings')
  async update(@Param('id') id: string, @Body() dto: { name?: string; description?: string; archived?: boolean }, @Req() req: any) {
    return this.svc.update(String(id), dto, req.user?.role);
  }

  @UseGuards(PermissionsGuard)
  @Delete(':id')
  @Permissions('manage_settings')
  async remove(@Param('id') id: string, @Req() req: any) {
    return this.svc.remove(String(id), req.user?.role);
  }
}
