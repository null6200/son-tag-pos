import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HrmShiftsService {
  constructor(private prisma: PrismaService) {}

  async list(params: { branchId: string; from?: Date; to?: Date; userId?: string }) {
    if (!params.branchId) throw new BadRequestException('branchId required');
    return (this.prisma as any).shiftAssignment.findMany({
      where: {
        branchId: params.branchId,
        userId: params.userId || undefined,
        ...(params.from || params.to
          ? {
              OR: [
                // overlaps with [from, to]
                {
                  AND: [
                    params.from ? { start: { gte: params.from as any } } : {},
                    params.to ? { start: { lte: params.to as any } } : {},
                  ],
                },
                {
                  AND: [
                    params.from ? { end: { gte: params.from as any } } : {},
                    params.to ? { end: { lte: params.to as any } } : {},
                  ],
                },
              ],
            }
          : {}),
      },
      orderBy: { start: 'asc' },
      select: {
        id: true,
        userId: true,
        branchId: true,
        start: true,
        end: true,
        status: true,
        note: true,
        user: { select: { id: true, username: true, firstName: true as any, surname: true as any } },
      },
    });
  }

  async assign(data: { userId: string; branchId: string; start: Date; end?: Date | null; note?: string | null }) {
    if (!data.userId || !data.branchId || !data.start) throw new BadRequestException('userId, branchId, start required');
    const user = await (this.prisma as any).user.findUnique({ where: { id: data.userId } });
    if (!user) throw new NotFoundException('User not found');
    return (this.prisma as any).shiftAssignment.create({
      data: {
        userId: data.userId,
        branchId: data.branchId,
        start: data.start as any,
        end: (data.end as any) ?? null,
        note: data.note ?? null,
      },
    });
  }

  async update(id: string, data: { start?: Date; end?: Date | null; status?: string; note?: string | null }) {
    const existing = await (this.prisma as any).shiftAssignment.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Shift not found');
    return (this.prisma as any).shiftAssignment.update({
      where: { id },
      data: {
        start: (data.start as any) ?? undefined,
        end: (data.end === undefined ? undefined : (data.end as any)),
        status: (data.status as any) ?? undefined,
        note: (data.note === undefined ? undefined : data.note),
      },
    });
  }

  async remove(id: string) {
    const existing = await (this.prisma as any).shiftAssignment.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Shift not found');
    await (this.prisma as any).shiftAssignment.delete({ where: { id } });
    return { ok: true };
  }
}
