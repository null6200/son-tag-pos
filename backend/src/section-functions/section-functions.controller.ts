import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { SectionFunctionsService } from './section-functions.service';

@UseGuards(JwtAuthGuard)
@Controller('section-functions')
export class SectionFunctionsController {
  constructor(private readonly svc: SectionFunctionsService) {}

  @UseGuards(PermissionsGuard)
  @Get()
  @Permissions('view_section_function')
  async list(
    @Query('branchId') branchId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Req() req?: any,
  ) {
    const effectiveBranchId = branchId ?? req?.user?.branchId;
    if (!effectiveBranchId) throw new BadRequestException('branchId is required');
    const p = Math.max(1, parseInt(String(page || '1'), 10) || 1);
    const ps = Math.min(100, Math.max(1, parseInt(String(pageSize || '20'), 10) || 20));
    return this.svc.list(String(effectiveBranchId), p, ps);
  }

  @UseGuards(PermissionsGuard)
  @Post()
  @Permissions('add_section_function')
  async create(
    @Body() dto: { branchId?: string; name: string; description?: string },
    @Req() req: any,
  ) {
    const branchId = dto.branchId ?? req?.user?.branchId;
    if (!branchId) throw new BadRequestException('branchId is required');
    return this.svc.create({ branchId, name: dto.name, description: dto.description }, req.user?.role);
  }

  @UseGuards(PermissionsGuard)
  @Put(':id')
  @Permissions('edit_section_function')
  async update(
    @Param('id') id: string,
    @Body() dto: { name?: string; description?: string },
    @Req() req: any,
  ) {
    return this.svc.update(String(id), dto, req.user?.role);
  }

  @UseGuards(PermissionsGuard)
  @Delete(':id')
  @Permissions('delete_section_function')
  async remove(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.svc.remove(String(id), req.user?.role);
  }
}
