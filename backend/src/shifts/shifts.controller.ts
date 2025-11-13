import { Body, Controller, Get, Post, Put, Param, Query, UseGuards, Req, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ShiftsService } from './shifts.service';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';

@UseGuards(JwtAuthGuard)
@Controller('shifts')
export class ShiftsController {
  constructor(private readonly shifts: ShiftsService) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post('open')
  @Permissions('open_shift_register')
  async open(@Body() body: { branchId: string; sectionId: string; openingCash: number }, @Req() req: any) {
    const rawId = req.user?.id || req.user?.sub || req.user?.userId || req.user?.uid;
    if (!rawId) throw new UnauthorizedException();
    if (!body || !body.branchId) throw new BadRequestException('branchId is required');
    const openedById = String(rawId);
    return this.shifts.openShift({
      branchId: body.branchId,
      sectionId: body.sectionId,
      openedById,
      openingCash: Number(body.openingCash || 0),
    });
  }

  @Get('current')
  async current(@Query('branchId') branchId: string, @Query('sectionId') sectionId: string, @Req() req: any) {
    // If sectionId is provided, use precise lookup (backward compatible)
    if (branchId && sectionId) {
      return this.shifts.getCurrentShift({ branchId, sectionId });
    }
    // Otherwise, return current open shift for this authenticated user
    const rawId = req.user?.id || req.user?.sub || req.user?.userId || req.user?.uid;
    if (!rawId) throw new UnauthorizedException();
    const userId = String(rawId);
    return this.shifts.findOpenShiftForUser(userId);
  }

  // New: current shift for authenticated user (non-breaking, separate path)
  @Get('current/me')
  async currentForUser(@Req() req: any) {
    const rawId = req.user?.id || req.user?.sub || req.user?.userId || req.user?.uid;
    if (!rawId) throw new UnauthorizedException();
    const userId = String(rawId);
    return this.shifts.findOpenShiftForUser(userId);
  }

  // Guidance for accidental GET to /api/shifts/open in browser
  @Get('open')
  getOpenHelp() {
    return { message: 'Use POST /api/shifts/open with JSON body { branchId, sectionId, openingCash } and a valid Authorization token' };
  }

  // Branch-wide current open shift (first open by newest openedAt)
  @Get('current/branch')
  async currentForBranch(@Query('branchId') branchId: string) {
    return this.shifts.findOpenShiftForBranch(branchId);
  }

  @Put(':id/close')
  async close(@Param('id') id: string, @Body() body: { closingCash: number }, @Req() req: any) {
    const rawId = req.user?.id || req.user?.sub || req.user?.userId || req.user?.uid;
    if (!rawId) {
      throw new Error('Authenticated user id not found in token');
    }
    const closedById = String(rawId);
    return this.shifts.closeShift({ shiftId: id, closingCash: Number(body.closingCash || 0), closedById } as any);
  }

  @Get('list')
  async list(
    @Query('branchId') branchId: string,
    @Query('sectionId') sectionId?: string,
    @Query('status') status?: 'OPEN' | 'CLOSED' | 'ALL',
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.shifts.listShifts({
      branchId,
      sectionId: sectionId || undefined,
      status: (status as any) || 'ALL',
      limit: Math.min(Math.max(parseInt(String(limit ?? 50), 10) || 50, 1), 200),
      offset: Math.max(parseInt(String(offset ?? 0), 10) || 0, 0),
    });
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.shifts.getById(id);
  }
}
