import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HrmLeavesService {
  constructor(private prisma: PrismaService) {}

  async list(params: { branchId: string; status?: string; userId?: string }) {
    if (!params.branchId) throw new BadRequestException('branchId required');
    return (this.prisma as any).leaveRequest.findMany({
      where: {
        branchId: params.branchId,
        status: (params.status as any) || undefined,
        userId: params.userId || undefined,
      },
      orderBy: { startDate: 'desc' },
      select: {
        id: true,
        branchId: true,
        userId: true,
        type: true,
        startDate: true,
        endDate: true,
        status: true,
        reason: true,
        approvedById: true,
        user: { select: { id: true, username: true, firstName: true as any, surname: true as any } },
      },
    });
  }

  async create(data: { userId: string; branchId: string; type: string; startDate: Date; endDate: Date; reason?: string }) {
    if (!data.userId || !data.branchId || !data.type || !data.startDate || !data.endDate)
      throw new BadRequestException('userId, branchId, type, startDate, endDate required');
    return (this.prisma as any).leaveRequest.create({
      data: {
        userId: data.userId,
        branchId: data.branchId,
        type: (data.type as any),
        startDate: data.startDate as any,
        endDate: data.endDate as any,
        reason: data.reason ?? null,
        status: 'PENDING' as any,
      },
    });
  }

  async approve(id: string, approverUserId: string) {
    const lr = await (this.prisma as any).leaveRequest.findUnique({ where: { id } });
    if (!lr) throw new NotFoundException('Leave not found');
    return (this.prisma as any).leaveRequest.update({
      where: { id },
      data: { status: 'APPROVED' as any, approvedById: approverUserId },
    });
  }

  async reject(id: string, approverUserId: string, reason?: string) {
    const lr = await (this.prisma as any).leaveRequest.findUnique({ where: { id } });
    if (!lr) throw new NotFoundException('Leave not found');
    return (this.prisma as any).leaveRequest.update({
      where: { id },
      data: { status: 'REJECTED' as any, approvedById: approverUserId, reason: reason ?? lr.reason },
    });
  }

  async cancel(id: string, byUserId: string) {
    const lr = await (this.prisma as any).leaveRequest.findUnique({ where: { id } });
    if (!lr) throw new NotFoundException('Leave not found');
    if (lr.userId !== byUserId) throw new ForbiddenException('Only the requester can cancel');
    return (this.prisma as any).leaveRequest.update({ where: { id }, data: { status: 'CANCELLED' as any } });
  }
}
