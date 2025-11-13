import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ShiftsService {
  constructor(private prisma: PrismaService) {}

  async openShift(params: { branchId?: string; sectionId: string; openedById: string; openingCash: number }) {
    let { branchId, sectionId, openedById, openingCash } = params;
    if (!sectionId) throw new BadRequestException('sectionId is required');
    // Derive branchId if missing using section, then earliest branch
    if (!branchId) {
      const sec = await this.prisma.section.findUnique({ where: { id: sectionId }, select: { branchId: true } });
      branchId = sec?.branchId || undefined;
    }
    if (!branchId) {
      const first = await this.prisma.branch.findFirst({ select: { id: true }, orderBy: { createdAt: 'asc' } });
      branchId = first?.id;
    }
    if (!branchId) throw new BadRequestException('branchId is required');

    const existing = await this.prisma.shift.findFirst({
      where: { branchId, sectionId, status: 'OPEN' },
    });
    if (existing) throw new BadRequestException('A shift is already open for this section');

    const shift = await this.prisma.shift.create({
      data: {
        branchId: branchId,
        sectionId,
        openedById,
        openingCash: openingCash as unknown as any,
        expectedCash: openingCash as unknown as any,
        status: 'OPEN',
      },
    });
    const user = await this.prisma.user.findUnique({ where: { id: openedById }, select: { username: true } });
    return { ...shift, openedByUsername: user?.username ?? null } as any;
  }

  async getById(id: string) {
    if (!id) throw new BadRequestException('id is required');
    const shift = await this.prisma.shift.findUnique({ where: { id } });
    if (!shift) return null;
    const ids = [shift.openedById, shift.closedById].filter(Boolean) as string[];
    let usersById: Record<string, string> = {};
    if (ids.length) {
      const users = await this.prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, username: true } });
      usersById = users.reduce((acc, u) => { acc[u.id] = u.username; return acc; }, {} as Record<string, string>);
    }
    return {
      ...shift,
      openedByUsername: shift.openedById ? usersById[shift.openedById] ?? null : null,
      closedByUsername: shift.closedById ? usersById[shift.closedById] ?? null : null,
    } as any;
  }

  async findOpenShiftForUser(userId: string) {
    if (!userId) throw new BadRequestException('userId is required');
    const shift = await this.prisma.shift.findFirst({ where: { openedById: userId, status: 'OPEN' } });
    if (!shift) return null;
    const ids = [shift.openedById, shift.closedById].filter(Boolean) as string[];
    let usersById: Record<string, string> = {};
    if (ids.length) {
      const users = await this.prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, username: true } });
      usersById = users.reduce((acc, u) => { acc[u.id] = u.username; return acc; }, {} as Record<string, string>);
    }
    return {
      ...shift,
      openedByUsername: shift.openedById ? usersById[shift.openedById] ?? null : null,
      closedByUsername: shift.closedById ? usersById[shift.closedById] ?? null : null,
    } as any;
  }

  async findOpenShiftForBranch(branchId?: string) {
    if (!branchId) {
      const first = await this.prisma.branch.findFirst({ select: { id: true }, orderBy: { createdAt: 'asc' } });
      branchId = first?.id || undefined;
    }
    if (!branchId) throw new BadRequestException('branchId is required');
    const shift = await this.prisma.shift.findFirst({ where: { branchId, status: 'OPEN' }, orderBy: { openedAt: 'desc' } });
    if (!shift) return null;
    const ids = [shift.openedById, shift.closedById].filter(Boolean) as string[];
    let usersById: Record<string, string> = {};
    if (ids.length) {
      const users = await this.prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, username: true } });
      usersById = users.reduce((acc, u) => { acc[u.id] = u.username; return acc; }, {} as Record<string, string>);
    }
    return {
      ...shift,
      openedByUsername: shift.openedById ? usersById[shift.openedById] ?? null : null,
      closedByUsername: shift.closedById ? usersById[shift.closedById] ?? null : null,
    } as any;
  }

  async getCurrentShift(params: { branchId?: string; sectionId: string }) {
    let { branchId, sectionId } = params;
    if (!sectionId) throw new BadRequestException('sectionId is required');
    if (!branchId) {
      const sec = await this.prisma.section.findUnique({ where: { id: sectionId }, select: { branchId: true } });
      branchId = sec?.branchId || undefined;
    }
    if (!branchId) throw new BadRequestException('branchId is required');
    const shift = await this.prisma.shift.findFirst({ where: { branchId, sectionId, status: 'OPEN' } });
    if (!shift) return null;
    const ids = [shift.openedById, shift.closedById].filter(Boolean) as string[];
    let usersById: Record<string, string> = {};
    if (ids.length) {
      const users = await this.prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, username: true } });
      usersById = users.reduce((acc, u) => { acc[u.id] = u.username; return acc; }, {} as Record<string, string>);
    }
    return {
      ...shift,
      openedByUsername: shift.openedById ? usersById[shift.openedById] ?? null : null,
      closedByUsername: shift.closedById ? usersById[shift.closedById] ?? null : null,
    } as any;
  }

  async closeShift(params: { shiftId: string; closingCash: number; closedById?: string }) {
    const { shiftId, closingCash, closedById } = params;
    const shift = await this.prisma.shift.findUnique({ where: { id: shiftId } });
    if (!shift) throw new NotFoundException('Shift not found');
    if (shift.status === 'CLOSED') {
      // Idempotent: return current closed state enriched with usernames
      const ids = [shift.openedById, shift.closedById].filter(Boolean) as string[];
      let usersById: Record<string, string> = {};
      if (ids.length) {
        const users = await this.prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, username: true } });
        usersById = users.reduce((acc, u) => { acc[u.id] = u.username; return acc; }, {} as Record<string, string>);
      }
      return {
        ...shift,
        openedByUsername: shift.openedById ? usersById[shift.openedById] ?? null : null,
        closedByUsername: shift.closedById ? usersById[shift.closedById] ?? null : null,
      } as any;
    }

    // Compute expected cash since open: sum of cash payments in branch in the shift window
    const paymentsAgg = await this.prisma.payment.aggregate({
      where: {
        order: { branchId: shift.branchId },
        createdAt: { gte: shift.openedAt },
        // Note: we don't have a section link on orders; aggregation is branch-wide
        method: { in: ['cash', 'CASH', 'Cash'] },
      },
      _sum: { amount: true },
    });
    const expectedFromSales = parseFloat(String(paymentsAgg._sum.amount ?? 0));
    const expectedCash = (shift.openingCash as unknown as number) + expectedFromSales;
    const difference = (closingCash ?? 0) - expectedCash;

    const closed = await this.prisma.shift.update({
      where: { id: shift.id },
      data: {
        closedAt: new Date(),
        closingCash: closingCash as unknown as any,
        expectedCash: expectedCash as unknown as any,
        difference: difference as unknown as any,
        status: 'CLOSED',
        ...(closedById ? { closedById } : {}),
      },
    });
    const ids = [closed.openedById, closed.closedById].filter(Boolean) as string[];
    let usersById: Record<string, string> = {};
    if (ids.length) {
      const users = await this.prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, username: true } });
      usersById = users.reduce((acc, u) => { acc[u.id] = u.username; return acc; }, {} as Record<string, string>);
    }
    return {
      ...closed,
      openedByUsername: closed.openedById ? usersById[closed.openedById] ?? null : null,
      closedByUsername: closed.closedById ? usersById[closed.closedById] ?? null : null,
    } as any;
  }

  async listShifts(params: { branchId?: string; sectionId?: string; status?: 'OPEN' | 'CLOSED' | 'ALL'; limit?: number; offset?: number }) {
    let { branchId, sectionId, status = 'ALL', limit = 50, offset = 0 } = params;
    if (!branchId) {
      const first = await this.prisma.branch.findFirst({ select: { id: true }, orderBy: { createdAt: 'asc' } });
      branchId = first?.id || undefined;
    }
    if (!branchId) throw new BadRequestException('branchId is required');
    const where: any = { branchId };
    if (sectionId) where.sectionId = sectionId;
    if (status && status !== 'ALL') where.status = status;
    const [items, total] = await Promise.all([
      this.prisma.shift.findMany({
        where,
        orderBy: { openedAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.shift.count({ where }),
    ]);
    // Map user IDs to usernames in one query
    const ids = Array.from(
      new Set([
        ...items.map((s) => s.openedById).filter(Boolean),
        ...items.map((s) => s.closedById).filter(Boolean),
      ])
    ) as string[];
    let usersById: Record<string, string> = {};
    if (ids.length) {
      const users = await this.prisma.user.findMany({
        where: { id: { in: ids } },
        select: { id: true, username: true },
      });
      usersById = users.reduce((acc, u) => {
        acc[u.id] = u.username;
        return acc;
      }, {} as Record<string, string>);
    }
    const mapped = items.map((s) => ({
      ...s,
      openedByUsername: s.openedById ? usersById[s.openedById] ?? null : null,
      closedByUsername: s.closedById ? usersById[s.closedById] ?? null : null,
    }));
    return { items: mapped, total } as any;
  }
}
