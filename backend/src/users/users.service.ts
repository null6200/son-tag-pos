import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async list(branchId?: string, includeArchived?: boolean) {
    const where: any = { archived: includeArchived ? undefined : false };
    if (branchId) {
      where.OR = [{ branchId }, { branchId: null }];
    }
    const users = await this.prisma.user.findMany({
      where,
      include: { appRole: true },
      orderBy: { username: 'asc' },
    });
    return users.map(u => ({
      id: u.id,
      username: u.username,
      email: u.email,
      role: u.role,
      branchId: u.branchId,
      firstName: u.firstName,
      surname: u.surname,
      phone: u.phone,
      isServiceStaff: u.isServiceStaff,
      archived: u.archived,
      appRole: u.appRole ? { id: u.appRole.id, name: u.appRole.name } : null,
    }));
  }

  async getPreferences(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { preferences: true } });
    if (!user) throw new NotFoundException('User not found');
    return (user.preferences as any) || {};
  }

  async updatePreferences(userId: string, data: Record<string, any>) {
    if (!data || typeof data !== 'object') throw new BadRequestException('Invalid preferences payload');
    const current = await this.prisma.user.findUnique({ where: { id: userId }, select: { preferences: true } });
    if (!current) throw new NotFoundException('User not found');
    const base = current.preferences && typeof current.preferences === 'object' && !Array.isArray(current.preferences)
      ? (current.preferences as Record<string, any>)
      : {};
    const merged = { ...base, ...data };
    const updated = await this.prisma.user.update({ where: { id: userId }, data: { preferences: merged }, select: { preferences: true } });
    return (updated.preferences as any) || {};
  }

  async getRuntime(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { runtime: true } });
    if (!user) throw new NotFoundException('User not found');
    return (user.runtime as any) || {};
  }

  async updateRuntime(userId: string, data: Record<string, any>) {
    if (!data || typeof data !== 'object') throw new BadRequestException('Invalid runtime payload');
    const current = await this.prisma.user.findUnique({ where: { id: userId }, select: { runtime: true } });
    if (!current) throw new NotFoundException('User not found');
    const base = current.runtime && typeof current.runtime === 'object' && !Array.isArray(current.runtime)
      ? (current.runtime as Record<string, any>)
      : {};
    const merged = { ...base, ...data };
    const updated = await this.prisma.user.update({ where: { id: userId }, data: { runtime: merged }, select: { runtime: true } });
    return (updated.runtime as any) || {};
  }

  async findById(id: string) {
    const u = await this.prisma.user.findUnique({ where: { id }, include: { appRole: true } });
    if (!u) throw new NotFoundException(`User with ID ${id} not found`);
    return {
      id: u.id,
      username: u.username,
      email: u.email,
      role: u.role,
      branchId: u.branchId,
      firstName: u.firstName,
      surname: u.surname,
      phone: u.phone,
      isServiceStaff: u.isServiceStaff,
      archived: u.archived,
      appRole: u.appRole ? { id: u.appRole.id, name: u.appRole.name } : null,
      permissions: u.role === 'ADMIN' ? ['all'] : (u.appRole?.permissions || []),
    };
  }

  async verifyServicePin(userId: string, pin: string) {
    if (!userId || !pin) return { ok: false } as any;
    const profile = await this.prisma.employeeProfile.findUnique({ where: { userId }, select: { pinHash: true } });
    if (!profile || !profile.pinHash) return { ok: false } as any;
    const ok = await bcrypt.compare(String(pin), String(profile.pinHash));
    return { ok } as any;
  }

  async create(dto: any, actorRole?: string) {
    if (actorRole !== 'ADMIN' && actorRole !== 'MANAGER') {
      throw new ForbiddenException('Insufficient role');
    }

    const email = String(dto.email || '').trim().toLowerCase();
    let username = String(dto.username || '').trim();
    if (!username) {
      // auto-generate from names or email local part
      const first = (dto.firstName || '').toString().trim().toLowerCase();
      const last = (dto.surname || '').toString().trim().toLowerCase();
      const base = (first && last) ? `${first}.${last}` : (email.includes('@') ? email.split('@')[0] : (first || 'user'));
      username = base.replace(/[^a-z0-9_.-]/g, '');
      if (!username) username = 'user';
      // ensure uniqueness with numeric suffix if needed
      let suffix = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const candidate = suffix ? `${username}${suffix}` : username;
        const existsUser = await this.prisma.user.findUnique({ where: { username: candidate } });
        if (!existsUser) { username = candidate; break; }
        suffix += 1;
      }
    }

    const dup = await this.prisma.user.findFirst({
      where: { OR: [{ username }, { email }] },
      select: { id: true },
    });
    if (dup) throw new BadRequestException('Username or email already exists');

    const allowLogin = dto.allowLogin !== false; // default true
    const rawPassword = String(dto.password || '');
    // Enforce password policy if login is allowed and caller provided a password
    if (allowLogin && rawPassword) {
      const tooShort = rawPassword.length < 8;
      const weak = !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/.test(rawPassword);
      if (tooShort || weak) {
        throw new BadRequestException('Password too weak: must be at least 8 characters and include upper, lower, and a digit');
      }
    }
    const passwordForStorage = allowLogin && rawPassword ? rawPassword : (rawPassword || Math.random().toString(36) + Date.now());
    const passwordHash = await bcrypt.hash(passwordForStorage, 10);

    const user = await this.prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        role: (dto.role as any) || 'CASHIER',
        branchId: dto.branchId || null,
        firstName: dto.firstName || null,
        surname: dto.surname || null,
        phone: dto.phone || null,
        isServiceStaff: !!dto.isServiceStaff,
        appRoleId: dto.appRoleId || null,
        archived: dto.isActive === false ? true : false,
        // store auxiliary flags in preferences JSON
        preferences: {
          ...(allowLogin === false ? { allowLogin: false } : {}),
          // New section-based access flags
          ...(dto.accessAllSections !== undefined ? { accessAllSections: !!dto.accessAllSections } : {}),
          ...(Array.isArray(dto.accessSectionIds) ? { accessSectionIds: dto.accessSectionIds } : {}),
          // Backward-compatible branch-based keys if caller still uses them
          ...(dto.accessAllBranches !== undefined ? { accessAllBranches: !!dto.accessAllBranches } : {}),
          ...(Array.isArray(dto.accessBranchIds) ? { accessBranchIds: dto.accessBranchIds } : {}),
          ...(dto.prefix ? { prefix: String(dto.prefix) } : {}),
          ...(dto.servicePinEnabled ? { servicePinEnabled: true } : {}),
        } as any,
      },
      include: { appRole: true },
    });

    // If servicePinEnabled and servicePin provided, create/update EmployeeProfile with pinHash
    if (dto.servicePinEnabled && dto.servicePin) {
      const pinHash = await bcrypt.hash(String(dto.servicePin), 10);
      const branchId = user.branchId || dto.branchId;
      if (branchId) {
        await this.prisma.employeeProfile.upsert({
          where: { userId: user.id },
          update: { branchId, pinHash },
          create: { userId: user.id, branchId, pinHash },
        });
      }
    }

    return this.findById(user.id);
  }

  async update(id: string, dto: any, actorRole?: string) {
    if (actorRole !== 'ADMIN' && actorRole !== 'MANAGER') {
      throw new ForbiddenException('Insufficient role');
    }

    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('User not found');

    const data: any = {};
    if (dto.username !== undefined) data.username = dto.username;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.role !== undefined) data.role = dto.role as any;
    if (dto.branchId !== undefined) data.branchId = dto.branchId;
    if (dto.firstName !== undefined) data.firstName = dto.firstName;
    if (dto.surname !== undefined) data.surname = dto.surname;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.isServiceStaff !== undefined) data.isServiceStaff = dto.isServiceStaff;
    if (dto.appRoleId !== undefined) data.appRoleId = dto.appRoleId;
    if (dto.isActive !== undefined) data.archived = dto.isActive === false;
    if (dto.password) {
      const pwd = String(dto.password);
      const tooShort = pwd.length < 8;
      const weak = !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/.test(pwd);
      if (tooShort || weak) {
        throw new BadRequestException('Password too weak: must be at least 8 characters and include upper, lower, and a digit');
      }
      data.passwordHash = await bcrypt.hash(pwd, 10);
    }

    // merge preferences
    if (
      dto.allowLogin !== undefined ||
      dto.accessAllSections !== undefined || Array.isArray(dto.accessSectionIds) ||
      dto.accessAllBranches !== undefined || Array.isArray(dto.accessBranchIds) ||
      dto.prefix !== undefined || dto.servicePinEnabled !== undefined
    ) {
      const existing = await this.prisma.user.findUnique({ where: { id }, select: { preferences: true } });
      const prefs = { ...(existing?.preferences as any || {}) };
      if (dto.allowLogin !== undefined) prefs.allowLogin = !!dto.allowLogin;
      if (dto.accessAllSections !== undefined) prefs.accessAllSections = !!dto.accessAllSections;
      if (Array.isArray(dto.accessSectionIds)) prefs.accessSectionIds = dto.accessSectionIds;
      if (dto.accessAllBranches !== undefined) prefs.accessAllBranches = !!dto.accessAllBranches;
      if (Array.isArray(dto.accessBranchIds)) prefs.accessBranchIds = dto.accessBranchIds;
      if (dto.prefix !== undefined) prefs.prefix = dto.prefix;
      if (dto.servicePinEnabled !== undefined) prefs.servicePinEnabled = !!dto.servicePinEnabled;
      data.preferences = prefs as any;
    }

    await this.prisma.user.update({ where: { id }, data });

    // Update/create employee profile PIN if provided
    if (dto.servicePin !== undefined) {
      const pinHash = dto.servicePin ? await bcrypt.hash(String(dto.servicePin), 10) : null;
      const user = await this.prisma.user.findUnique({ where: { id }, select: { branchId: true } });
      const branchId = dto.branchId || user?.branchId;
      if (pinHash && branchId) {
        await this.prisma.employeeProfile.upsert({
          where: { userId: id },
          update: { branchId, pinHash },
          create: { userId: id, branchId, pinHash },
        });
      } else if (!dto.servicePin && dto.servicePinEnabled === false) {
        // disable pin
        try { await this.prisma.employeeProfile.update({ where: { userId: id }, data: { pinHash: null } }); } catch {}
      }
    }
    return this.findById(id);
  }

  async remove(id: string, actorRole?: string) {
    if (actorRole !== 'ADMIN' && actorRole !== 'MANAGER') {
      throw new ForbiddenException('Insufficient role');
    }

    const user = await this.prisma.user.findUnique({ where: { id }, select: { archived: true } });
    if (!user) throw new NotFoundException('User not found');

    if (user.archived) {
      // Detach orders and delete user
      await this.prisma.order.updateMany({ where: { userId: id }, data: { userId: null } });
      await this.prisma.user.delete({ where: { id } });
      return { id, archived: true };
    }

    const salesCount = await this.prisma.order.count({ where: { userId: id } });
    if (salesCount > 0) {
      const updated = await this.prisma.user.update({ where: { id }, data: { archived: true }, select: { id: true, archived: true } });
      return updated;
    }

    await this.prisma.order.updateMany({ where: { userId: id }, data: { userId: null } });
    await this.prisma.user.delete({ where: { id } });
    return { id, archived: true };
  }
}
