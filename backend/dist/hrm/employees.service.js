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
exports.EmployeesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const bcrypt = __importStar(require("bcrypt"));
let EmployeesService = class EmployeesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(branchId, q) {
        if (!branchId)
            throw new common_1.BadRequestException('branchId required');
        return this.prisma.employeeProfile.findMany({
            where: {
                branchId,
                ...(q
                    ? {
                        OR: [
                            { jobTitle: { contains: q, mode: 'insensitive' } },
                            { user: { username: { contains: q, mode: 'insensitive' } } },
                            { user: { email: { contains: q, mode: 'insensitive' } } },
                            { user: { firstName: { contains: q, mode: 'insensitive' } } },
                            { user: { surname: { contains: q, mode: 'insensitive' } } },
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
                        firstName: true,
                        surname: true,
                        phone: true,
                        appRoleId: true,
                        appRole: { select: { id: true, name: true } },
                    },
                },
            },
            orderBy: { hireDate: 'desc' },
        });
    }
    async create(dto) {
        const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const exists = await this.prisma.employeeProfile.findUnique({ where: { userId: dto.userId } });
        if (exists)
            throw new common_1.BadRequestException('Employee profile already exists');
        return this.prisma.employeeProfile.create({
            data: {
                userId: dto.userId,
                branchId: dto.branchId,
                jobTitle: dto.jobTitle || null,
                hourlyRate: dto.hourlyRate,
                hireDate: dto.hireDate || new Date(),
            },
        });
    }
    async update(id, dto) {
        const profile = await this.prisma.employeeProfile.findUnique({ where: { id } });
        if (!profile)
            throw new common_1.NotFoundException('Employee profile not found');
        return this.prisma.employeeProfile.update({
            where: { id },
            data: {
                status: dto.status ?? undefined,
                jobTitle: dto.jobTitle ?? undefined,
                hourlyRate: dto.hourlyRate ?? undefined,
                terminationDate: (dto.terminationDate === undefined ? undefined : dto.terminationDate),
            },
        });
    }
    async setPin(id, pin, actorRole) {
        if (actorRole !== 'ADMIN' && actorRole !== 'MANAGER')
            throw new common_1.ForbiddenException('Insufficient role');
        const profile = await this.prisma.employeeProfile.findUnique({ where: { id }, include: { user: true } });
        if (!profile)
            throw new common_1.NotFoundException('Employee profile not found');
        const pinHash = pin ? await bcrypt.hash(String(pin), 10) : null;
        return this.prisma.employeeProfile.update({ where: { id }, data: { pinHash } });
    }
};
exports.EmployeesService = EmployeesService;
exports.EmployeesService = EmployeesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], EmployeesService);
//# sourceMappingURL=employees.service.js.map