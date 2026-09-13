import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  async list(branchId: string, includeArchived?: boolean) {
    if (!branchId) throw new BadRequestException('branchId required');
    return this.prisma.appRole.findMany({
      where: {
        branchId,
        ...(includeArchived ? {} : { archived: false }),
      },
      orderBy: { name: 'asc' },
    });
  }

  async create(dto: { branchId: string; name: string; permissions?: string[] }, actorRole?: string) {
    if (actorRole !== 'ADMIN' && actorRole !== 'MANAGER') throw new ForbiddenException('Insufficient role');
    if (!dto.branchId || !dto.name) throw new BadRequestException('branchId and name required');
    const exists = await this.prisma.appRole.findFirst({ where: { branchId: dto.branchId, name: dto.name } });
    if (exists) throw new BadRequestException('Role name already exists in branch');
    return this.prisma.appRole.create({ data: { branchId: dto.branchId, name: dto.name, permissions: dto.permissions || [] } });
  }

  async update(id: string, dto: { name?: string; permissions?: string[]; archived?: boolean }, actorRole?: string) {
    if (actorRole !== 'ADMIN' && actorRole !== 'MANAGER') throw new ForbiddenException('Insufficient role');
    const role = await this.prisma.appRole.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Role not found');
    if (dto.name && dto.name !== role.name) {
      const dup = await this.prisma.appRole.findFirst({ where: { branchId: role.branchId, name: dto.name } });
      if (dup) throw new BadRequestException('Role name already exists in branch');
    }
    return this.prisma.appRole.update({ where: { id }, data: { name: dto.name ?? undefined, permissions: dto.permissions ?? undefined, archived: dto.archived ?? undefined } });
  }

  async remove(id: string, actorRole?: string) {
    if (actorRole !== 'ADMIN' && actorRole !== 'MANAGER') throw new ForbiddenException('Insufficient role');
    const role = await this.prisma.appRole.findUnique({ where: { id }, include: { users: true } });
    if (!role) throw new NotFoundException('Role not found');
    // If already archived, allow hard delete
    if (role.archived) {
      // Detach users from this role
      await this.prisma.user.updateMany({ where: { appRoleId: id }, data: { appRoleId: null } });
      return this.prisma.appRole.delete({ where: { id } });
    }
    // If role has users -> archive; else delete
    if ((role.users?.length || 0) > 0) {
      return this.prisma.appRole.update({ where: { id }, data: { archived: true } });
    }
    return this.prisma.appRole.delete({ where: { id } });
  }
}
