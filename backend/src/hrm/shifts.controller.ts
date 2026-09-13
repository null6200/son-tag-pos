import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { HrmShiftsService } from './shifts.service';

@UseGuards(JwtAuthGuard)
@Controller('hrm/shifts')
export class ShiftsController {
  constructor(private readonly shifts: HrmShiftsService) {}

  @UseGuards(PermissionsGuard)
  @Get()
  @Permissions('assign_shift')
  async list(
    @Query('branchId') branchId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('userId') userId?: string,
  ) {
    return this.shifts.list({ branchId, from: from ? new Date(from) : undefined, to: to ? new Date(to) : undefined, userId });
  }

  @UseGuards(PermissionsGuard)
  @Post()
  @Permissions('assign_shift')
  async assign(@Body() body: { userId: string; branchId: string; start: string; end?: string; note?: string }) {
    return this.shifts.assign({
      userId: body.userId,
      branchId: body.branchId,
      start: new Date(body.start),
      end: body.end ? new Date(body.end) : null,
      note: body.note ?? null,
    });
  }

  @UseGuards(PermissionsGuard)
  @Put(':id')
  @Permissions('assign_shift')
  async update(@Param('id') id: string, @Body() body: { start?: string; end?: string | null; status?: string; note?: string | null }) {
    return this.shifts.update(id, {
      start: body.start ? new Date(body.start) : undefined,
      end: body.end === undefined ? undefined : (body.end ? new Date(body.end) : null),
      status: body.status,
      note: body.note === undefined ? undefined : body.note,
    });
  }

  @UseGuards(PermissionsGuard)
  @Delete(':id')
  @Permissions('assign_shift')
  async remove(@Param('id') id: string) {
    return this.shifts.remove(id);
  }
}
