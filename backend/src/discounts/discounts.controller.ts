import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { DiscountsService } from './discounts.service';

@UseGuards(JwtAuthGuard)
@Controller('discounts')
export class DiscountsController {
  constructor(private readonly svc: DiscountsService) {}

  @UseGuards(PermissionsGuard)
  @Get()
  @Permissions('view_settings', 'view_pos_sell', 'add_pos_sell', 'edit_pos_sell')
  list(@Query('branchId') branchId: string, @Req() req: any) {
    const effectiveBranchId = branchId ?? req?.user?.branchId;
    return this.svc.list({ branchId: effectiveBranchId });
  }

  @UseGuards(PermissionsGuard)
  @Post()
  @Permissions('view_settings')
  create(@Body() dto: any, @Req() req: any) {
    const effective = { ...dto };
    if (!effective.branchId && req?.user?.branchId) effective.branchId = req.user.branchId;
    return this.svc.create(effective);
  }

  @UseGuards(PermissionsGuard)
  @Put(':id')
  @Permissions('view_settings')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.svc.update(id, dto);
  }

  @UseGuards(PermissionsGuard)
  @Delete(':id')
  @Permissions('view_settings')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
