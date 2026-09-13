import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: { branchId?: string }) {
    let branchId: string | undefined = params?.branchId;
    if (!branchId) {
      const first = await this.prisma.branch.findFirst({ select: { id: true }, orderBy: { createdAt: 'asc' } });
      branchId = first?.id;
    }
    if (!branchId) throw new BadRequestException('branchId is required');
    return this.prisma.category.findMany({ where: { branchId }, orderBy: { name: 'asc' }, select: { id: true, name: true, code: true } });
  }

  async create(dto: { name: string; code?: string | null; branchId?: string }) {
    let { name, code } = dto || ({} as any);
    let branchId: string | undefined = dto?.branchId;
    if (!branchId) {
      const first = await this.prisma.branch.findFirst({ select: { id: true }, orderBy: { createdAt: 'asc' } });
      branchId = first?.id;
    }
    if (!branchId) throw new BadRequestException('branchId is required');
    if (!name || typeof name !== 'string') throw new BadRequestException('name is required');
    // unique by (branchId, name)
    try {
      return await this.prisma.category.create({ data: { name: String(name).trim(), code: (code || null), branchId } });
    } catch (e: any) {
      if (e?.code === 'P2002') throw new BadRequestException('A category with this name already exists for the branch');
      throw e;
    }
  }

  async update(id: string, dto: { name?: string | null; code?: string | null }) {
    const exists = await this.prisma.category.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Category not found');
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name?.trim() || null;
    if (dto.code !== undefined) data.code = dto.code?.trim() || null;
    if (!Object.keys(data).length) throw new BadRequestException('No fields to update');
    return this.prisma.category.update({ where: { id }, data, select: { id: true, name: true, code: true } });
  }

  async remove(id: string) {
    const exists = await this.prisma.category.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Category not found');
    return this.prisma.category.delete({ where: { id }, select: { id: true } });
  }

  // Diagnostic/public listing (optional branchId)
  async listAny(params?: { branchId?: string }) {
    const where: any = {};
    if (params?.branchId) where.branchId = params.branchId;
    return this.prisma.category.findMany({ where, orderBy: { name: 'asc' }, select: { id: true, name: true, code: true, branchId: true } });
  }
}
