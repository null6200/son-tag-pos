import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductTypesService {
  constructor(private prisma: PrismaService) {}

  async list(branchId?: string, page = 1, pageSize = 20) {
    let bId = branchId || null;
    if (!bId) {
      const first = await this.prisma.branch.findFirst({ select: { id: true } });
      bId = first?.id || null;
    }
    const take = Math.min(Math.max(pageSize, 1), 100);
    const skip = (Math.max(page, 1) - 1) * take;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.productType.findMany({
        where: bId ? { branchId: bId } : {},
        orderBy: { name: 'asc' },
        skip,
        take,
        include: { productTypeLinks: { include: { sectionFunction: true } } },
      }),
      this.prisma.productType.count({ where: bId ? { branchId: bId } : {} }),
    ]);
    return { items, page, pageSize: take, total, pages: Math.ceil(total / take) };
  }

  async create(dto: { branchId?: string; name: string; description?: string; allowedFunctionIds: string[] }, role?: string) {
    if (role !== 'ADMIN' && role !== 'MANAGER') throw new ForbiddenException('Insufficient role');
    const name = String(dto.name || '').trim();
    if (!name) throw new BadRequestException('name is required');
    // Resolve branchId
    let branchId = dto.branchId || null;
    if (!branchId) {
      const first = await this.prisma.branch.findFirst({ select: { id: true } });
      branchId = first?.id || null;
    }
    if (!branchId) throw new BadRequestException('branchId is required');
    // Validate section function ids belong to same branch
    if (dto.allowedFunctionIds?.length) {
      const count = await this.prisma.sectionFunction.count({ where: { id: { in: dto.allowedFunctionIds }, branchId } });
      if (count !== dto.allowedFunctionIds.length) throw new BadRequestException('Invalid section function selection');
    }
    try {
      return await this.prisma.productType.create({
        data: {
          branchId,
          name,
          description: dto.description ?? null,
          productTypeLinks: {
            create: (dto.allowedFunctionIds || []).map((fid) => ({ sectionFunctionId: fid })),
          },
        },
      });
    } catch (e: any) {
      // Unique constraint on (branchId, name)
      if (e?.code === 'P2002') {
        throw new BadRequestException('A product type with this name already exists for the branch');
      }
      throw e;
    }
  }

  async update(id: string, dto: { name?: string; description?: string; allowedFunctionIds?: string[] }, role?: string) {
    if (role !== 'ADMIN' && role !== 'MANAGER') throw new ForbiddenException('Insufficient role');
    const exist = await this.prisma.productType.findUnique({ where: { id } });
    if (!exist) throw new NotFoundException('Product type not found');
    const data: any = {};
    if (dto.name !== undefined) data.name = String(dto.name || '').trim();
    if (dto.description !== undefined) data.description = dto.description ?? null;

    // Update basic fields
    const updated = await this.prisma.productType.update({ where: { id }, data });

    // Replace allowed function links if provided
    if (dto.allowedFunctionIds) {
      // ensure all belong to same branch
      if (dto.allowedFunctionIds.length) {
        const count = await this.prisma.sectionFunction.count({ where: { id: { in: dto.allowedFunctionIds }, branchId: exist.branchId } });
        if (count !== dto.allowedFunctionIds.length) throw new BadRequestException('Invalid section function selection');
      }
      await this.prisma.productTypeAllowedFunction.deleteMany({ where: { productTypeId: id } });
      if (dto.allowedFunctionIds.length) {
        await this.prisma.productTypeAllowedFunction.createMany({ data: dto.allowedFunctionIds.map((fid) => ({ productTypeId: id, sectionFunctionId: fid })) });
      }
    }
    return updated;
  }

  async remove(id: string, role?: string) {
    if (role !== 'ADMIN' && role !== 'MANAGER') throw new ForbiddenException('Insufficient role');
    const exist = await this.prisma.productType.findUnique({ where: { id } });
    if (!exist) throw new NotFoundException('Product type not found');
    // prevent delete if used by products
    const prodCount = await this.prisma.product.count({ where: { productTypeId: id } });
    if (prodCount > 0) throw new BadRequestException('Cannot delete: used by products');
    await this.prisma.productTypeAllowedFunction.deleteMany({ where: { productTypeId: id } });
    return this.prisma.productType.delete({ where: { id } });
  }
}
