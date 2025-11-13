import { Body, Controller, Get, Post, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { OverridePinService } from './override-pin.service';

@UseGuards(JwtAuthGuard)
@Controller('hrm/override-pin')
export class OverridePinController {
  constructor(private readonly svc: OverridePinService) {}

  @UseGuards(PermissionsGuard)
  @Get()
  @Permissions('update_override_pin')
  async get(@Query('branchId') branchId: string) {
    return this.svc.get(branchId);
  }

  @UseGuards(PermissionsGuard)
  @Post('set')
  @Permissions('add_override_pin', 'update_override_pin')
  async set(@Body() body: { branchId: string; pin?: string; graceSeconds?: number }) {
    return this.svc.set(body.branchId, body.pin || '', body.graceSeconds);
  }

  // POS verification endpoint (no special permission, just login required)
  @Post('verify')
  async verify(@Body() body: { branchId?: string; pin: string }, @Req() req: any) {
    const fallbackBranchId = req?.user?.branchId ? String(req.user.branchId) : undefined;
    return this.svc.verify(body.branchId || fallbackBranchId, body.pin);
  }
}
