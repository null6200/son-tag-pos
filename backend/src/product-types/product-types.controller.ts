import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { ProductTypesService } from './product-types.service';

@UseGuards(JwtAuthGuard)
@Controller('product-types')
export class ProductTypesController {
  constructor(private readonly svc: ProductTypesService) {}

  @UseGuards(PermissionsGuard)
  @Get()
  @Permissions('view_product_type')
  async list(
    @Query('branchId') branchId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Req() req?: any,
  ) {
    const effectiveBranchId = branchId ?? req?.user?.branchId ?? undefined;
    const p = Math.max(1, parseInt(String(page || '1'), 10) || 1);
    const ps = Math.min(100, Math.max(1, parseInt(String(pageSize || '20'), 10) || 20));
    return this.svc.list(effectiveBranchId ? String(effectiveBranchId) : undefined, p, ps);
  }

  @UseGuards(PermissionsGuard)
  @Post()
  @Permissions('add_product_type')
  async create(
    @Body() dto: { branchId?: string; name: string; description?: string; allowedFunctionIds?: string[] },
    @Req() req: any,
  ) {
    const branchId = dto.branchId ?? req?.user?.branchId;
    if (!branchId) {
      // Let service validate/fallback if absolutely needed
      const first = await this.svc['prisma'].branch.findFirst({ select: { id: true } } as any).catch(() => null);
      if (!first?.id) throw new BadRequestException('branchId is required');
      return this.svc.create({ branchId: first.id, name: dto.name, description: dto.description, allowedFunctionIds: dto.allowedFunctionIds || [] }, req.user?.role);
    }
    return this.svc.create({ branchId, name: dto.name, description: dto.description, allowedFunctionIds: dto.allowedFunctionIds || [] }, req.user?.role);
  }

  @UseGuards(PermissionsGuard)
  @Put(':id')
  @Permissions('edit_product_type')
  async update(
    @Param('id') id: string,
    @Body() dto: { name?: string; description?: string; allowedFunctionIds?: string[] },
    @Req() req: any,
  ) {
    return this.svc.update(String(id), dto, req.user?.role);
  }

  @UseGuards(PermissionsGuard)
  @Delete(':id')
  @Permissions('delete_product_type')
  async remove(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.svc.remove(String(id), req.user?.role);
  }
}
