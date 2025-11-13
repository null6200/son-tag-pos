import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SubcategoriesService {
  constructor(private prisma: PrismaService) {}

  async list(branchId?: string) {
    const where: any = {};
    if (branchId) where.branchId = branchId;
    const items = await this.prisma.subcategory.findMany({ where, orderBy: { name: 'asc' } });
    const total = await this.prisma.subcategory.count({ where });
    return { items, total };
  }

  async create(dto: any) {
    return this.prisma.subcategory.create({ data: { name: dto.name, code: dto.code ?? null, branchId: dto.branchId ?? null } as any });
  }

  async update(id: string, dto: any) {
    return this.prisma.subcategory.update({ where: { id }, data: { name: dto.name, code: dto.code ?? null, branchId: dto.branchId ?? null } as any });
  }

  async remove(id: string) {
    await this.prisma.subcategory.delete({ where: { id } });
    return { ok: true };
  }
}
