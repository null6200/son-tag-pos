import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DiscountsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: { branchId?: string }) {
    let branchId: string | undefined = params?.branchId;
    if (!branchId) {
      const first = await this.prisma.branch.findFirst({ select: { id: true }, orderBy: { createdAt: 'asc' } });
      branchId = first?.id;
    }
    if (!branchId) throw new BadRequestException('branchId is required');
    return this.prisma.discount.findMany({
      where: { branchId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, type: true, amount: true, isActive: true },
    });
  }

  async create(dto: { branchId?: string; name: string; type: string; amount: number; isActive?: boolean }) {
    let { name, type } = dto || ({} as any);
    let amount = dto?.amount;
    let branchId: string | undefined = dto?.branchId;
    if (!branchId) {
      const first = await this.prisma.branch.findFirst({ select: { id: true }, orderBy: { createdAt: 'asc' } });
      branchId = first?.id;
    }
    if (!branchId) throw new BadRequestException('branchId is required');
    if (!name || typeof name !== 'string') throw new BadRequestException('name is required');
    const kind = String(type || 'percentage').toLowerCase() === 'fixed' ? 'fixed' : 'percentage';
    const num = Number(amount);
    if (!Number.isFinite(num) || num < 0) throw new BadRequestException('amount must be a non-negative number');
    try {
      return await this.prisma.discount.create({
        data: {
          branchId,
          name: String(name).trim(),
          type: kind,
          amount: num,
          isActive: dto?.isActive ?? true,
        },
        select: { id: true, name: true, type: true, amount: true, isActive: true },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') throw new BadRequestException('A discount with this name already exists for the branch');
      throw e;
    }
  }

  async update(id: string, dto: { name?: string; type?: string; amount?: number; isActive?: boolean }) {
    const exists = await this.prisma.discount.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Discount not found');
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name?.trim();
    if (dto.type !== undefined) data.type = String(dto.type).toLowerCase() === 'fixed' ? 'fixed' : 'percentage';
    if (dto.amount !== undefined) {
      const num = Number(dto.amount);
      if (!Number.isFinite(num) || num < 0) throw new BadRequestException('amount must be a non-negative number');
      data.amount = num;
    }
    if (dto.isActive !== undefined) data.isActive = !!dto.isActive;
    if (!Object.keys(data).length) throw new BadRequestException('No fields to update');
    return this.prisma.discount.update({
      where: { id },
      data,
      select: { id: true, name: true, type: true, amount: true, isActive: true },
    });
  }

  async remove(id: string) {
    const exists = await this.prisma.discount.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Discount not found');
    return this.prisma.discount.delete({ where: { id }, select: { id: true } });
  }
}
