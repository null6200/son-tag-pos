import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { SectionsService } from './sections.service';
import { PrismaService } from '../prisma/prisma.service';

@UseGuards(JwtAuthGuard)
@Controller('sections')
export class SectionsController {
  constructor(private readonly sections: SectionsService, private readonly prisma: PrismaService) {}

  @UseGuards(PermissionsGuard)
  @Get()
  @Permissions('view_branch_section', 'stock_transfer', 'stock_adjustment')
  async list(@Query('branchId') branchId: string, @Req() req: any) {
    const effectiveBranchId = branchId ?? req?.user?.branchId;
    if (!effectiveBranchId) throw new BadRequestException('branchId is required');
    return this.sections.listByBranch(String(effectiveBranchId));
  }

  @UseGuards(PermissionsGuard)
  @Get('allowed')
  @Permissions('view_branch_section', 'stock_transfer', 'stock_adjustment')
  async listAllowed(
    @Query('branchId') branchId: string,
    @Query('productTypeId') productTypeId?: string,
    @Query('productTypeName') productTypeName?: string,
    @Req() req?: any,
  ) {
    const effectiveBranchId = branchId ?? req?.user?.branchId;
    if (!effectiveBranchId) throw new BadRequestException('branchId is required');
    let ptId = productTypeId || undefined;
    if (!ptId && productTypeName) {
      const pt = await this.prisma.productType.findFirst({ where: { branchId: String(effectiveBranchId), name: productTypeName } });
      ptId = pt?.id;
    }
    return this.sections.allowedForProductType(String(effectiveBranchId), ptId);
  }

  @UseGuards(PermissionsGuard)
  @Post()
  @Permissions('add_branch_section')
  async create(
    @Body() dto: { branchId: string; name: string; description?: string; function?: string; sectionFunctionId?: string },
    @Req() req: any,
  ) {
    return this.sections.create(dto, req.user?.role);
  }

  @UseGuards(PermissionsGuard)
  @Put(':id')
  @Permissions('edit_branch_section')
  async update(
    @Param('id') id: string,
    @Body() dto: { name?: string; description?: string; function?: string; sectionFunctionId?: string },
    @Req() req: any,
  ) {
    return this.sections.update(id, dto, req.user?.role);
  }

  @UseGuards(PermissionsGuard)
  @Delete(':id')
  @Permissions('delete_branch_section')
  async remove(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.sections.remove(id, req.user?.role);
  }
}
