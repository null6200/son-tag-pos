import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { HrmLeavesService } from './leaves.service';

@UseGuards(JwtAuthGuard)
@Controller('hrm/leaves')
export class LeavesController {
  constructor(private readonly leaves: HrmLeavesService) {}

  // List leave requests for a branch (optionally by status/user)
  @UseGuards(PermissionsGuard)
  @Get()
  @Permissions('view_leave')
  async list(
    @Query('branchId') branchId: string,
    @Query('status') status?: string,
    @Query('userId') userId?: string,
  ) {
    return this.leaves.list({ branchId, status, userId });
  }

  // Create a leave request (employee self-service or admin)
  @UseGuards(PermissionsGuard)
  @Post()
  @Permissions('add_leave')
  async create(
    @Body()
    body: { userId: string; branchId: string; type: string; startDate: string; endDate: string; reason?: string },
  ) {
    return this.leaves.create({
      userId: body.userId,
      branchId: body.branchId,
      type: body.type,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      reason: body.reason,
    });
  }

  // Approve a leave request (requires permission)
  @UseGuards(PermissionsGuard)
  @Post(':id/approve')
  @Permissions('edit_leave')
  async approve(@Param('id') id: string, @Body() body: { approverUserId: string }) {
    return this.leaves.approve(id, body.approverUserId);
  }

  // Reject a leave request (requires permission)
  @UseGuards(PermissionsGuard)
  @Post(':id/reject')
  @Permissions('edit_leave')
  async reject(@Param('id') id: string, @Body() body: { approverUserId: string; reason?: string }) {
    return this.leaves.reject(id, body.approverUserId, body.reason);
  }

  // Cancel a leave request (by requester)
  @UseGuards(PermissionsGuard)
  @Post(':id/cancel')
  @Permissions('delete_leave')
  async cancel(@Param('id') id: string, @Body() body: { byUserId: string }) {
    return this.leaves.cancel(id, body.byUserId);
  }
}
