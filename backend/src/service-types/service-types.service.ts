import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ServiceTypesService {
  constructor(private prisma: PrismaService) {}

  async list(branchId?: string) {
    let bId = branchId || null;
    if (!bId) {
      const first = await this.prisma.branch.findFirst({ select: { id: true }, orderBy: { createdAt: 'asc' } });
      bId = first?.id || null;
    }
    if (!bId) throw new BadRequestException('branchId is required');
    return this.prisma.serviceType.findMany({ where: { branchId: bId, archived: false }, orderBy: { name: 'asc' } });
  }

  async create({ branchId, name, description }: { branchId?: string; name: string; description?: string }, role?: string) {
    if (role !== 'ADMIN' && role !== 'MANAGER') throw new ForbiddenException('Insufficient role');
    let bId = branchId || null;
    if (!bId) {
      const first = await this.prisma.branch.findFirst({ select: { id: true }, orderBy: { createdAt: 'asc' } });
      bId = first?.id || null;
    }
    if (!bId) throw new BadRequestException('branchId is required');
    try {
      return await this.prisma.serviceType.create({ data: { branchId: bId, name, description } });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new BadRequestException('A service type with this name already exists for the branch');
      }
      throw e;
    }
  }

  async update(id: string, dto: { name?: string; description?: string; archived?: boolean }, role?: string) {
    if (role !== 'ADMIN' && role !== 'MANAGER') throw new ForbiddenException('Insufficient role');
    return this.prisma.serviceType.update({ where: { id }, data: dto });
  }

  async remove(id: string, role?: string) {
    if (role !== 'ADMIN' && role !== 'MANAGER') throw new ForbiddenException('Insufficient role');
    return this.prisma.serviceType.update({ where: { id }, data: { archived: true } });
  }
}
