"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const bcrypt = __importStar(require("bcryptjs"));
let UsersService = class UsersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(branchId, includeArchived) {
        const where = { archived: includeArchived ? undefined : false };
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
    async getPreferences(userId) {
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { preferences: true } });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        return user.preferences || {};
    }
    async updatePreferences(userId, data) {
        if (!data || typeof data !== 'object')
            throw new common_1.BadRequestException('Invalid preferences payload');
        const current = await this.prisma.user.findUnique({ where: { id: userId }, select: { preferences: true } });
        if (!current)
            throw new common_1.NotFoundException('User not found');
        const base = current.preferences && typeof current.preferences === 'object' && !Array.isArray(current.preferences)
            ? current.preferences
            : {};
        const merged = { ...base, ...data };
        const updated = await this.prisma.user.update({ where: { id: userId }, data: { preferences: merged }, select: { preferences: true } });
        return updated.preferences || {};
    }
    async getRuntime(userId) {
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { runtime: true } });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        return user.runtime || {};
    }
    async updateRuntime(userId, data) {
        if (!data || typeof data !== 'object')
            throw new common_1.BadRequestException('Invalid runtime payload');
        const current = await this.prisma.user.findUnique({ where: { id: userId }, select: { runtime: true } });
        if (!current)
            throw new common_1.NotFoundException('User not found');
        const base = current.runtime && typeof current.runtime === 'object' && !Array.isArray(current.runtime)
            ? current.runtime
            : {};
        const merged = { ...base, ...data };
        const updated = await this.prisma.user.update({ where: { id: userId }, data: { runtime: merged }, select: { runtime: true } });
        return updated.runtime || {};
    }
    async findById(id) {
        const u = await this.prisma.user.findUnique({ where: { id }, include: { appRole: true } });
        if (!u)
            throw new common_1.NotFoundException(`User with ID ${id} not found`);
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
    async verifyServicePin(userId, pin) {
        if (!userId || !pin)
            return { ok: false };
        const profile = await this.prisma.employeeProfile.findUnique({ where: { userId }, select: { pinHash: true } });
        if (!profile || !profile.pinHash)
            return { ok: false };
        const ok = await bcrypt.compare(String(pin), String(profile.pinHash));
        return { ok };
    }
    async create(dto, actorRole) {
        if (actorRole !== 'ADMIN' && actorRole !== 'MANAGER') {
            throw new common_1.ForbiddenException('Insufficient role');
        }
        const email = String(dto.email || '').trim().toLowerCase();
        let username = String(dto.username || '').trim();
        if (!username) {
            const first = (dto.firstName || '').toString().trim().toLowerCase();
            const last = (dto.surname || '').toString().trim().toLowerCase();
            const base = (first && last) ? `${first}.${last}` : (email.includes('@') ? email.split('@')[0] : (first || 'user'));
            username = base.replace(/[^a-z0-9_.-]/g, '');
            if (!username)
                username = 'user';
            let suffix = 0;
            while (true) {
                const candidate = suffix ? `${username}${suffix}` : username;
                const existsUser = await this.prisma.user.findUnique({ where: { username: candidate } });
                if (!existsUser) {
                    username = candidate;
                    break;
                }
                suffix += 1;
            }
        }
        const dup = await this.prisma.user.findFirst({
            where: { OR: [{ username }, { email }] },
            select: { id: true },
        });
        if (dup)
            throw new common_1.BadRequestException('Username or email already exists');
        const allowLogin = dto.allowLogin !== false;
        const rawPassword = String(dto.password || '');
        if (allowLogin && rawPassword) {
            const tooShort = rawPassword.length < 8;
            const weak = !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/.test(rawPassword);
            if (tooShort || weak) {
                throw new common_1.BadRequestException('Password too weak: must be at least 8 characters and include upper, lower, and a digit');
            }
        }
        const passwordForStorage = allowLogin && rawPassword ? rawPassword : (rawPassword || Math.random().toString(36) + Date.now());
        const passwordHash = await bcrypt.hash(passwordForStorage, 10);
        const user = await this.prisma.user.create({
            data: {
                username,
                email,
                passwordHash,
                role: dto.role || 'CASHIER',
                branchId: dto.branchId || null,
                firstName: dto.firstName || null,
                surname: dto.surname || null,
                phone: dto.phone || null,
                isServiceStaff: !!dto.isServiceStaff,
                appRoleId: dto.appRoleId || null,
                archived: dto.isActive === false ? true : false,
                preferences: {
                    ...(allowLogin === false ? { allowLogin: false } : {}),
                    ...(dto.accessAllSections !== undefined ? { accessAllSections: !!dto.accessAllSections } : {}),
                    ...(Array.isArray(dto.accessSectionIds) ? { accessSectionIds: dto.accessSectionIds } : {}),
                    ...(dto.accessAllBranches !== undefined ? { accessAllBranches: !!dto.accessAllBranches } : {}),
                    ...(Array.isArray(dto.accessBranchIds) ? { accessBranchIds: dto.accessBranchIds } : {}),
                    ...(dto.prefix ? { prefix: String(dto.prefix) } : {}),
                    ...(dto.servicePinEnabled ? { servicePinEnabled: true } : {}),
                },
            },
            include: { appRole: true },
        });
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
    async update(id, dto, actorRole) {
        if (actorRole !== 'ADMIN' && actorRole !== 'MANAGER') {
            throw new common_1.ForbiddenException('Insufficient role');
        }
        const existing = await this.prisma.user.findUnique({ where: { id } });
        if (!existing)
            throw new common_1.NotFoundException('User not found');
        const data = {};
        if (dto.username !== undefined)
            data.username = dto.username;
        if (dto.email !== undefined)
            data.email = dto.email;
        if (dto.role !== undefined)
            data.role = dto.role;
        if (dto.branchId !== undefined)
            data.branchId = dto.branchId;
        if (dto.firstName !== undefined)
            data.firstName = dto.firstName;
        if (dto.surname !== undefined)
            data.surname = dto.surname;
        if (dto.phone !== undefined)
            data.phone = dto.phone;
        if (dto.isServiceStaff !== undefined)
            data.isServiceStaff = dto.isServiceStaff;
        if (dto.appRoleId !== undefined)
            data.appRoleId = dto.appRoleId;
        if (dto.isActive !== undefined)
            data.archived = dto.isActive === false;
        if (dto.password) {
            const pwd = String(dto.password);
            const tooShort = pwd.length < 8;
            const weak = !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/.test(pwd);
            if (tooShort || weak) {
                throw new common_1.BadRequestException('Password too weak: must be at least 8 characters and include upper, lower, and a digit');
            }
            data.passwordHash = await bcrypt.hash(pwd, 10);
        }
        if (dto.allowLogin !== undefined ||
            dto.accessAllSections !== undefined || Array.isArray(dto.accessSectionIds) ||
            dto.accessAllBranches !== undefined || Array.isArray(dto.accessBranchIds) ||
            dto.prefix !== undefined || dto.servicePinEnabled !== undefined) {
            const existing = await this.prisma.user.findUnique({ where: { id }, select: { preferences: true } });
            const prefs = { ...(existing?.preferences || {}) };
            if (dto.allowLogin !== undefined)
                prefs.allowLogin = !!dto.allowLogin;
            if (dto.accessAllSections !== undefined)
                prefs.accessAllSections = !!dto.accessAllSections;
            if (Array.isArray(dto.accessSectionIds))
                prefs.accessSectionIds = dto.accessSectionIds;
            if (dto.accessAllBranches !== undefined)
                prefs.accessAllBranches = !!dto.accessAllBranches;
            if (Array.isArray(dto.accessBranchIds))
                prefs.accessBranchIds = dto.accessBranchIds;
            if (dto.prefix !== undefined)
                prefs.prefix = dto.prefix;
            if (dto.servicePinEnabled !== undefined)
                prefs.servicePinEnabled = !!dto.servicePinEnabled;
            data.preferences = prefs;
        }
        await this.prisma.user.update({ where: { id }, data });
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
            }
            else if (!dto.servicePin && dto.servicePinEnabled === false) {
                try {
                    await this.prisma.employeeProfile.update({ where: { userId: id }, data: { pinHash: null } });
                }
                catch { }
            }
        }
        return this.findById(id);
    }
    async remove(id, actorRole) {
        if (actorRole !== 'ADMIN' && actorRole !== 'MANAGER') {
            throw new common_1.ForbiddenException('Insufficient role');
        }
        const user = await this.prisma.user.findUnique({ where: { id }, select: { archived: true } });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        if (user.archived) {
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
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map