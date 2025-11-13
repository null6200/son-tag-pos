import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BrandsService {
  constructor(private prisma: PrismaService) {}

  async list(branchId?: string) {
    const where: any = {};
    if (branchId) where.branchId = branchId;
    const items = await this.prisma.brand.findMany({ where, orderBy: { name: 'asc' } });
    const total = await this.prisma.brand.count({ where });
    return { items, total };
  }

  async create(dto: any) {
    return this.prisma.brand.create({ data: { name: dto.name, branchId: dto.branchId ?? null } as any });
  }

  async update(id: string, dto: any) {
    return this.prisma.brand.update({ where: { id }, data: { name: dto.name, branchId: dto.branchId ?? null } as any });
  }

  async remove(id: string) {
    await this.prisma.brand.delete({ where: { id } });
    return { ok: true };
  }
}
