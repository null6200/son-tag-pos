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
  @Permissions('draft_view_all', 'draft_view_own', 'view_drafts_all')
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
  @Permissions('draft_view_all', 'draft_view_own', 'view_drafts_all')
  async get(@Param('id') id: string, @Req() req: any) {
    const role: string | undefined = req?.user?.role;
    let userId = req?.user?.userId as string | undefined;
    let perms: string[] = Array.isArray(req?.user?.permissions) ? req.user.permissions : [];
    if (role === 'ADMIN') {
      userId = undefined;
      perms = [...new Set([...(perms || []), 'all'])];
    }
    return this.drafts.get(id, userId, perms);
  }

  @UseGuards(PermissionsGuard)
  @Post()
  @Permissions('edit_draft', 'edit_pos_sell', 'add_pos_sell', 'view_drafts_all', 'view_pos_sell')
  async create(@Body() body: any, @Req() req: any) {
    const userId = req?.user?.userId as string | undefined;
    return this.drafts.create(body, userId);
  }

  @UseGuards(PermissionsGuard)
  @Put(':id')
  @Permissions('edit_draft', 'edit_pos_sell', 'add_pos_sell', 'view_drafts_all', 'view_pos_sell')
  async update(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    const role: string | undefined = req?.user?.role;
    let userId = req?.user?.userId as string | undefined;
    let perms: string[] = Array.isArray(req?.user?.permissions) ? req.user.permissions : [];
    if (role === 'ADMIN') {
      userId = undefined;
      perms = [...new Set([...(perms || []), 'all'])];
    }
    return this.drafts.update(id, body, userId, perms);
  }

  @UseGuards(PermissionsGuard)
  @Delete(':id')
  @Permissions('delete_draft', 'delete_pos_sell', 'view_drafts_all', 'view_pos_sell', 'add_pos_sell', 'edit_pos_sell')
  async remove(
    @Param('id') id: string,
    @Query('overrideOwnerId') overrideOwnerId: string | undefined,
    @Query('overridePin') overridePin: string | undefined,
    @Req() req: any,
  ) {
    const role: string | undefined = req?.user?.role;
    let userId = req?.user?.userId as string | undefined;
    let perms: string[] = Array.isArray(req?.user?.permissions) ? req.user.permissions : [];
    if (role === 'ADMIN') {
      userId = undefined;
      perms = [...new Set([...(perms || []), 'all'])];
    }
    return this.drafts.remove(id, userId, perms, overrideOwnerId, overridePin);
  }
}
