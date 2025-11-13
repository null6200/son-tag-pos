import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { DraftsService } from './drafts.service';

@UseGuards(JwtAuthGuard)
@Controller('drafts')
export class DraftsController {
  constructor(private readonly drafts: DraftsService) {}

  @UseGuards(PermissionsGuard)
  @Get()
  @Permissions('view_pos_sell')
  async list(
    @Query('branchId') branchId: string,
    @Query('sectionId') sectionId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Req() req?: any,
  ) {
    const p = page ? parseInt(page, 10) : 1;
    const ps = pageSize ? parseInt(pageSize, 10) : 20;
    const role: string | undefined = req?.user?.role;
    let userId = req?.user?.userId as string | undefined;
    let perms: string[] = Array.isArray(req?.user?.permissions) ? req.user.permissions : [];
    if (role === 'ADMIN') {
      // Treat admin as having full access
      userId = undefined;
      perms = [...new Set([...(perms || []), 'all'])];
    }
    return this.drafts.list(branchId, sectionId, p, ps, userId, perms);
  }

  @UseGuards(PermissionsGuard)
  @Get(':id')
  @Permissions('view_pos_sell')
  async get(@Param('id') id: string) {
    return this.drafts.get(id);
  }

  @UseGuards(PermissionsGuard)
  @Post()
  @Permissions('view_pos_sell', 'edit_pos_sell', 'add_pos_sell', 'view_drafts_all')
  async create(@Body() body: any, @Req() _req: any) {
    return this.drafts.create(body);
  }

  @UseGuards(PermissionsGuard)
  @Put(':id')
  @Permissions('view_pos_sell', 'edit_pos_sell', 'add_pos_sell', 'view_drafts_all')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.drafts.update(id, body);
  }

  @UseGuards(PermissionsGuard)
  @Delete(':id')
  @Permissions('delete_pos_sell', 'view_drafts_all', 'view_pos_sell', 'add_pos_sell', 'edit_pos_sell')
  async remove(@Param('id') id: string) {
    return this.drafts.remove(id);
  }
}
