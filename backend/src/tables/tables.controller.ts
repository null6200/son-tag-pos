import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { TablesService } from './tables.service';

@UseGuards(JwtAuthGuard)
@Controller('tables')
export class TablesController {
  constructor(private readonly tables: TablesService) {}

  @UseGuards(PermissionsGuard)
  @Get()
  @Permissions('view_tables', 'view_pos_sell', 'add_pos_sell', 'edit_pos_sell', 'delete_pos_sell')
  async list(@Query('sectionId') sectionId: string) {
    return this.tables.listBySection(sectionId);
  }

  @UseGuards(PermissionsGuard)
  @Post()
  @Permissions('add_tables')
  async create(@Body() body: { sectionId: string; name: string; capacity?: number; status?: string }, @Req() req: any) {
    return this.tables.create(body.sectionId, body.name, body.capacity, body.status, req.user?.role);
  }

  @UseGuards(PermissionsGuard)
  @Put(':id')
  @Permissions('edit_tables')
  async update(
    @Param('id') id: string,
    @Body() body: { name?: string; sectionId?: string; capacity?: number; status?: string },
    @Req() req: any,
  ) {
    return this.tables.update(id, body.name, body.sectionId, body.capacity, body.status, req.user?.role);
  }

  @UseGuards(PermissionsGuard)
  @Delete(':id')
  @Permissions('delete_tables')
  async remove(@Param('id') id: string, @Req() req: any) {
    return this.tables.remove(id, req.user?.role);
  }

  @UseGuards(PermissionsGuard)
  @Permissions('edit_tables')
  @Put(':id/lock')
  async lock(@Param('id') id: string, @Req() req: any) {
    return this.tables.lock(id, req.user?.role);
  }

  @UseGuards(PermissionsGuard)
  @Permissions('edit_tables')
  @Put(':id/unlock')
  async unlock(@Param('id') id: string, @Req() req: any) {
    return this.tables.unlock(id, req.user?.role);
  }
}
