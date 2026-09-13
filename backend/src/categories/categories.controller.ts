import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { Controller as PublicController, Get as PublicGet, Query as PublicQuery } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { CategoriesService } from './categories.service';

@UseGuards(JwtAuthGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly svc: CategoriesService) {}

  @UseGuards(PermissionsGuard)
  @Get()
  @Permissions('view_category', 'view_pos_sell', 'add_pos_sell', 'edit_pos_sell', 'delete_pos_sell')
  list(@Query('branchId') branchId: string, @Req() req: any) {
    const effectiveBranchId = branchId ?? req?.user?.branchId;
    return this.svc.list({ branchId: effectiveBranchId });
  }

  // Temporary diagnostic endpoint: list across branches
  @UseGuards(PermissionsGuard)
  @Get('debug/all')
  @Permissions('view_category')
  listAll() { return this.svc.listAny(); }

  @UseGuards(PermissionsGuard)
  @Post()
  @Permissions('add_category')
  create(@Body() dto: any, @Req() req: any) {
    const effective = { ...dto };
    if (!effective.branchId && req?.user?.branchId) effective.branchId = req.user.branchId;
    return this.svc.create(effective);
  }

  @UseGuards(PermissionsGuard)
  @Put(':id')
  @Permissions('edit_category')
  update(@Param('id') id: string, @Body() dto: any) { return this.svc.update(id, dto); }

  @UseGuards(PermissionsGuard)
  @Delete(':id')
  @Permissions('delete_category')
  remove(@Param('id') id: string) { return this.svc.remove(id); }
}

// Public read-only listing for diagnostics
@PublicController('public/categories')
export class PublicCategoriesController {
  constructor(private readonly svc: CategoriesService) {}

  @PublicGet()
  async list(@PublicQuery('branchId') branchId?: string) {
    const rows = await this.svc.listAny({ branchId });
    return rows.map((c: any) => ({ id: c.id, name: c.name, code: c.code || null, branchId: c.branchId }));
  }
}
