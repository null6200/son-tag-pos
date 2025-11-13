import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  async listAll(branchId?: string) {
    const where: any = {};
    if (branchId) where.branchId = branchId;
    return this.prisma.supplier.findMany({ where, orderBy: { name: 'asc' } });
  }

  async create(dto: any) {
    const name = dto.name || dto.businessName || dto.contactName || 'Supplier';
    const data: any = { name };
    // Supplier.branchId is optional in schema; include if provided
    if (dto.branchId !== undefined) data.branchId = dto.branchId;
    return this.prisma.supplier.create({ data });
  }

  async update(id: string, dto: any) {
    const exists = await this.prisma.supplier.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Supplier not found');
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.branchId !== undefined) data.branchId = dto.branchId;
    return this.prisma.supplier.update({ where: { id }, data });
  }

  async remove(id: string) {
    const exists = await this.prisma.supplier.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Supplier not found');
    return this.prisma.supplier.delete({ where: { id } });
  }
}
