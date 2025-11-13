import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class EmployeesService {
  constructor(private prisma: PrismaService) {}

  async list(branchId: string, q?: string) {
    if (!branchId) throw new BadRequestException('branchId required');
    return this.prisma.employeeProfile.findMany({
      where: {
        branchId,
        ...(q
          ? {
              OR: [
                { jobTitle: { contains: q, mode: 'insensitive' } },
                { user: { username: { contains: q, mode: 'insensitive' } } },
                { user: { email: { contains: q, mode: 'insensitive' } } },
                { user: { firstName: { contains: q, mode: 'insensitive' } as any } },
                { user: { surname: { contains: q, mode: 'insensitive' } as any } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        branchId: true,
        status: true,
        jobTitle: true,
        hireDate: true,
        terminationDate: true,
        hourlyRate: true,
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            firstName: true as any,
            surname: true as any,
            phone: true as any,
            appRoleId: true as any,
            appRole: { select: { id: true, name: true } } as any,
          },
        },
      },
      orderBy: { hireDate: 'desc' },
    });
  }

  async create(dto: { userId: string; branchId: string; jobTitle?: string; hourlyRate?: number; hireDate?: Date }) {
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException('User not found');
    const exists = await this.prisma.employeeProfile.findUnique({ where: { userId: dto.userId } });
    if (exists) throw new BadRequestException('Employee profile already exists');

    return this.prisma.employeeProfile.create({
      data: {
        userId: dto.userId,
        branchId: dto.branchId,
        jobTitle: dto.jobTitle || null,
        hourlyRate: dto.hourlyRate as any,
        hireDate: (dto.hireDate as any) || new Date(),
      },
    });
  }

  async update(id: string, dto: { status?: string; jobTitle?: string; hourlyRate?: number; terminationDate?: Date | null }) {
    const profile = await this.prisma.employeeProfile.findUnique({ where: { id } });
    if (!profile) throw new NotFoundException('Employee profile not found');
    return this.prisma.employeeProfile.update({
      where: { id },
      data: {
        status: (dto.status as any) ?? undefined,
        jobTitle: dto.jobTitle ?? undefined,
        hourlyRate: (dto.hourlyRate as any) ?? undefined,
        terminationDate: (dto.terminationDate === undefined ? undefined : (dto.terminationDate as any)),
      },
    });
  }

  async setPin(id: string, pin?: string, actorRole?: string) {
    if (actorRole !== 'ADMIN' && actorRole !== 'MANAGER') throw new ForbiddenException('Insufficient role');
    const profile = await this.prisma.employeeProfile.findUnique({ where: { id }, include: { user: true } });
    if (!profile) throw new NotFoundException('Employee profile not found');
    const pinHash = pin ? await bcrypt.hash(String(pin), 10) : null;
    return this.prisma.employeeProfile.update({ where: { id }, data: { pinHash } });
  }
}
