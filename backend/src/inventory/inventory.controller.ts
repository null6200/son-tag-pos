import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { InventoryService } from './inventory.service';
import { PrismaService } from '../prisma/prisma.service';

class AdjustStockDto {
  delta!: number;
  reason?: string;
}

@UseGuards(JwtAuthGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventory: InventoryService, private readonly prisma: PrismaService) {}

  @Get()
  @UseGuards(PermissionsGuard)
  @Permissions('view_branch_section')
  async list(@Query('branchId') branchId: string) {
    return this.inventory.listByBranch(branchId);
  }

  // Release all outstanding reservations for current user across a branch
  @Get('release-reservations-all')
  async releaseReservationsAll(
    @Query('branchId') branchId: string | undefined,
    @Req() req: any,
  ) {
    const u = req?.user || {};
    const uid = u.id || u.userId || u.sub;
    const displayName = (u.firstName && u.surname) ? `${u.firstName} ${u.surname}` : (u.fullName || u.name || u.username || uid);
    return this.inventory.releaseReservationsAll(branchId, { id: uid, name: displayName });
  }

  @Get('sections')
  @UseGuards(PermissionsGuard)
  @Permissions('view_branch_section')
  async listBySection(@Query('sectionId') sectionId: string, @Query('sectionName') sectionName?: string, @Query('branchId') branchId?: string) {
    let sid = sectionId;
    if (!sid && sectionName) {
      const sec = await this.prisma.section.findFirst({ where: { name: sectionName, ...(branchId ? { branchId } : {}) } });
      sid = sec?.id as string;
    }
    return this.inventory.listBySection(sid);
  }

  @Get('aggregate')
  @UseGuards(PermissionsGuard)
  @Permissions('view_branch_section')
  async aggregateByBranch(@Query('branchId') branchId: string) {
    return this.inventory.aggregateByBranch(branchId);
  }

  // Inventory settings: allowOverselling per branch
  @Get('settings')
  async getSettings(@Query('branchId') branchId?: string) {
    if (branchId) {
      const row = await this.prisma.setting.findFirst({ where: { branchId }, select: { allowOverselling: true, branchId: true } });
      return { branchId, allowOverselling: !!row?.allowOverselling };
    }
    const any = await this.prisma.setting.findFirst({ select: { allowOverselling: true, branchId: true } });
    return { branchId: any?.branchId, allowOverselling: !!any?.allowOverselling };
  }

  @UseGuards(PermissionsGuard)
  @Put('settings/overselling')
  @Permissions('edit_settings', 'stock_adjustment', 'stock_transfer')
  async setAllowOverselling(@Body() body: { branchId?: string; allowOverselling?: boolean }) {
    const branchId = body?.branchId || null;
    const value = !!body?.allowOverselling;
    if (branchId) {
      const exists = await this.prisma.setting.findFirst({ where: { branchId }, select: { id: true } });
      if (exists) {
        await this.prisma.setting.update({ where: { id: exists.id }, data: { allowOverselling: value } });
      } else {
        await this.prisma.setting.create({ data: { branchId, allowOverselling: value } as any });
      }
      return { ok: true, branchId, allowOverselling: value };
    }
    const any = await this.prisma.setting.findFirst({ select: { id: true } });
    if (any) {
      await this.prisma.setting.update({ where: { id: any.id }, data: { allowOverselling: value } });
    } else {
      await this.prisma.setting.create({ data: { allowOverselling: value } as any });
    }
    return { ok: true, allowOverselling: value };
  }

  @Get('movements')
  @UseGuards(PermissionsGuard)
  @Permissions('view_branch_section')
  async movements(@Query('branchId') branchId: string, @Query('limit') limit?: string) {
    return this.inventory.listMovements(branchId, Number(limit) || 100);
  }

  @Get('transfers')
  @UseGuards(PermissionsGuard)
  @Permissions('view_branch_section')
  async transfers(@Query('branchId') branchId: string, @Query('limit') limit?: string) {
    return this.inventory.listTransfers(branchId, Number(limit) || 100);
  }

  @Get('adjustments')
  @UseGuards(PermissionsGuard)
  @Permissions('view_branch_section')
  async adjustments(@Query('branchId') branchId: string, @Query('limit') limit?: string) {
    return this.inventory.listAdjustments(branchId, Number(limit) || 100);
  }

  @UseGuards(PermissionsGuard)
  @Put(':productId/adjust')
  @Permissions('stock_adjustment')
  async adjust(
    @Param('productId') productId: string,
    @Query('branchId') branchId: string,
    @Body() dto: AdjustStockDto,
    @Req() req: any,
  ) {
    const u = req?.user || {};
    const uid = u.id || u.userId || u.sub;
    const displayName = (u.firstName && u.surname) ? `${u.firstName} ${u.surname}` : (u.fullName || u.name || u.username || uid);
    const dtoWithName: any = { ...dto, __userName: displayName };
    return this.inventory.adjust(productId, branchId, dtoWithName, u?.role, uid);
  }

  @UseGuards(PermissionsGuard)
  @Put('sections/:productId/adjust')
  @Permissions('stock_adjustment', 'add_pos_sell')
  async adjustInSection(
    @Param('productId') productId: string,
    @Query('sectionId') sectionId: string,
    @Query('sectionName') sectionName: string | undefined,
    @Query('branchId') branchId: string | undefined,
    @Body() dto: AdjustStockDto,
    @Req() req: any,
  ) {
    const u = req?.user || {};
    const uid = u.id || u.userId || u.sub;
    const displayName = (u.firstName && u.surname) ? `${u.firstName} ${u.surname}` : (u.fullName || u.name || u.username || uid);
    const dtoWithName: any = { ...dto, __userName: displayName };
    let sid = sectionId;
    if (!sid && sectionName) {
      const sec = await this.prisma.section.findFirst({ where: { name: sectionName, ...(branchId ? { branchId } : {}) } });
      sid = sec?.id as string;
    }
    return this.inventory.adjustInSection(productId, sid, dtoWithName, u?.role, uid);
  }

  @Post('sections/:sectionId/release-reservations')
  async releaseReservations(
    @Param('sectionId') sectionId: string,
    @Body() body: { reservationKey?: string; sectionName?: string; branchId?: string },
    @Req() req: any,
  ) {
    const u = req?.user || {};
    const uid = u.id || u.userId || u.sub;
    const displayName = (u.firstName && u.surname) ? `${u.firstName} ${u.surname}` : (u.fullName || u.name || u.username || uid);
    let sid = sectionId;
    if ((!sid || sid === 'null' || sid === 'undefined') && body?.sectionName) {
      const sec = await this.prisma.section.findFirst({ where: { name: body.sectionName, ...(body?.branchId ? { branchId: body.branchId } : {}) } });
      sid = (sec?.id as string) || sid;
    }
    return this.inventory.releaseReservations(sid, body?.reservationKey, { id: uid, name: displayName });
  }

  // Simple GET variant to support keepalive unload without CORS preflight
  @Get('sections/:sectionId/release-reservations')
  async releaseReservationsGet(
    @Param('sectionId') sectionId: string,
    @Query('reservationKey') reservationKey: string | undefined,
    @Query('sectionName') sectionName: string | undefined,
    @Query('branchId') branchId: string | undefined,
    @Req() req: any,
  ) {
    const u = req?.user || {};
    const uid = u.id || u.userId || u.sub;
    const displayName = (u.firstName && u.surname) ? `${u.firstName} ${u.surname}` : (u.fullName || u.name || u.username || uid);
    let sid = sectionId;
    if ((!sid || sid === 'null' || sid === 'undefined') && sectionName) {
      const sec = await this.prisma.section.findFirst({ where: { name: sectionName, ...(branchId ? { branchId } : {}) } });
      sid = (sec?.id as string) || sid;
    }
    return this.inventory.releaseReservations(sid, reservationKey || undefined, { id: uid, name: displayName });
  }

  @UseGuards(PermissionsGuard)
  @Post('transfer')
  @Permissions('stock_transfer')
  async transfer(
    @Body()
    body: {
      fromSectionId?: string;
      toSectionId?: string;
      fromSectionName?: string;
      toSectionName?: string;
      branchId?: string;
      items: { productId: string; qty: number }[];
    },
    @Req() req: any,
  ) {
    const u = req?.user || {};
    const uid = u.id || u.userId || u.sub;
    const displayName = (u.firstName && u.surname) ? `${u.firstName} ${u.surname}` : (u.fullName || u.name || u.username || uid);
    let fromId = body.fromSectionId;
    let toId = body.toSectionId;
    if ((!fromId || fromId === '') && body.fromSectionName) {
      const s = await this.prisma.section.findFirst({ where: { name: body.fromSectionName, ...(body.branchId ? { branchId: body.branchId } : {}) } });
      fromId = s?.id as string;
    }
    if ((!toId || toId === '') && body.toSectionName) {
      const s = await this.prisma.section.findFirst({ where: { name: body.toSectionName, ...(body.branchId ? { branchId: body.branchId } : {}) } });
      toId = s?.id as string;
    }
    return this.inventory.transfer(fromId as string, toId as string, body.items, u?.role, { id: uid, name: displayName });
  }
}
