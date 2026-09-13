import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SectionFunctionsService {
  constructor(private prisma: PrismaService) {}

  async list(branchId?: string, page = 1, pageSize = 20) {
    let bId = branchId || null;
    if (!bId) {
      const first = await this.prisma.branch.findFirst({ select: { id: true } });
      bId = first?.id || null;
    }
    if (!bId) throw new BadRequestException('branchId is required');
    const take = Math.min(Math.max(pageSize, 1), 100);
    const skip = (Math.max(page, 1) - 1) * take;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.sectionFunction.findMany({ where: { branchId: bId }, orderBy: { name: 'asc' }, skip, take }),
      this.prisma.sectionFunction.count({ where: { branchId: bId } }),
    ]);
    return { items, page, pageSize: take, total, pages: Math.ceil(total / take) };
  }

  async create(dto: { branchId?: string; name: string; description?: string }, role?: string) {
    if (role !== 'ADMIN' && role !== 'MANAGER') throw new ForbiddenException('Insufficient role');
    const name = String(dto.name || '').trim();
    if (!name) throw new BadRequestException('name is required');
    let branchId = dto.branchId || null;
    if (!branchId) {
      const first = await this.prisma.branch.findFirst({ select: { id: true } });
      branchId = first?.id || null;
    }
    if (!branchId) throw new BadRequestException('branchId is required');
    return this.prisma.sectionFunction.create({ data: { branchId, name, description: dto.description ?? null } });
  }

  async update(id: string, dto: { name?: string; description?: string }, role?: string) {
    if (role !== 'ADMIN' && role !== 'MANAGER') throw new ForbiddenException('Insufficient role');
    const exist = await this.prisma.sectionFunction.findUnique({ where: { id } });
    if (!exist) throw new NotFoundException('Section function not found');
    const data: any = {};
    if (dto.name !== undefined) data.name = String(dto.name || '').trim();
    if (dto.description !== undefined) data.description = dto.description ?? null;
    return this.prisma.sectionFunction.update({ where: { id }, data });
  }

  async remove(id: string, role?: string) {
    if (role !== 'ADMIN' && role !== 'MANAGER') throw new ForbiddenException('Insufficient role');
    const exist = await this.prisma.sectionFunction.findUnique({ where: { id } });
    if (!exist) throw new NotFoundException('Section function not found');
    // Safe detach: null out section references and remove product type links, then delete
    return this.prisma.$transaction(async (tx) => {
      await tx.section.updateMany({ where: { sectionFunctionId: id }, data: { sectionFunctionId: null } });
      await tx.productTypeAllowedFunction.deleteMany({ where: { sectionFunctionId: id } });
      return tx.sectionFunction.delete({ where: { id } });
    });
  }
}
