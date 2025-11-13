import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class TablesService {
  constructor(private prisma: PrismaService) {}

  async listBySection(sectionId: string) {
    return this.prisma.table.findMany({
      where: { sectionId },
      orderBy: { name: 'asc' },
    });
  }

  async create(sectionId: string, name: string, capacity?: number, status?: string, role?: string) {
    // Authorization handled by PermissionsGuard at controller level
    if (!sectionId || !name) throw new BadRequestException('Missing fields');
    // Ensure section exists to avoid FK 500
    const section = await this.prisma.section.findUnique({ where: { id: sectionId } });
    if (!section) throw new BadRequestException('Section not found');
    try {
      return await this.prisma.table.create({
        data: {
          sectionId,
          name,
          status: (status === 'available' || status === 'occupied' || status === 'reserved' || status === 'locked') ? status : 'available',
          ...(typeof capacity === 'number' && !Number.isNaN(capacity) ? { capacity } : {}),
        },
      });
    } catch (e: any) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2002') {
          throw new BadRequestException('A table with this name already exists in this section');
        }
        if (e.code === 'P2003') {
          throw new BadRequestException('Invalid section specified');
        }
      }
      throw e;
    }
  }

  async update(id: string, name?: string, sectionId?: string, capacity?: number, status?: string, role?: string) {
    // Authorization handled by PermissionsGuard at controller level
    const t = await this.prisma.table.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Table not found');
    if (sectionId && sectionId !== t.sectionId) {
      const s = await this.prisma.section.findUnique({ where: { id: sectionId } });
      if (!s) throw new BadRequestException('Section not found');
    }
    try {
      return await this.prisma.table.update({
        where: { id },
        data: {
          name: name ?? t.name,
          sectionId: sectionId ?? t.sectionId,
          ...(typeof capacity === 'number' && !Number.isNaN(capacity) ? { capacity } : {}),
          ...(status ? { status } : {}),
        },
      });
    } catch (e: any) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2002') {
          throw new BadRequestException('A table with this name already exists in this section');
        }
        if (e.code === 'P2003') {
          throw new BadRequestException('Invalid section specified');
        }
      }
      throw e;
    }
  }

  async remove(id: string, role?: string) {
    // Authorization handled by PermissionsGuard at controller level
    const t = await this.prisma.table.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Table not found');
    if (t.status === 'occupied' || t.status === 'locked')
      throw new BadRequestException('Cannot delete an in-use table');
    return this.prisma.table.delete({ where: { id } });
  }

  async lock(id: string, role?: string) {
    // Authorization handled by PermissionsGuard at controller level
    const t = await this.prisma.table.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Table not found');
    if (t.status === 'locked') throw new BadRequestException('Already locked');
    return this.prisma.table.update({
      where: { id },
      data: { status: 'locked' },
    });
  }

  async unlock(id: string, role?: string) {
    // Authorization handled by PermissionsGuard at controller level
    const t = await this.prisma.table.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Table not found');
    if (t.status !== 'locked') throw new BadRequestException('Not locked');
    return this.prisma.table.update({
      where: { id },
      data: { status: 'available' },
    });
  }
}
