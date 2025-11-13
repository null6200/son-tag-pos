"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceTypesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ServiceTypesService = class ServiceTypesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(branchId) {
        let bId = branchId || null;
        if (!bId) {
            const first = await this.prisma.branch.findFirst({ select: { id: true }, orderBy: { createdAt: 'asc' } });
            bId = first?.id || null;
        }
        if (!bId)
            throw new common_1.BadRequestException('branchId is required');
        return this.prisma.serviceType.findMany({ where: { branchId: bId, archived: false }, orderBy: { name: 'asc' } });
    }
    async create({ branchId, name, description }, role) {
        if (role !== 'ADMIN' && role !== 'MANAGER')
            throw new common_1.ForbiddenException('Insufficient role');
        let bId = branchId || null;
        if (!bId) {
            const first = await this.prisma.branch.findFirst({ select: { id: true }, orderBy: { createdAt: 'asc' } });
            bId = first?.id || null;
        }
        if (!bId)
            throw new common_1.BadRequestException('branchId is required');
        try {
            return await this.prisma.serviceType.create({ data: { branchId: bId, name, description } });
        }
        catch (e) {
            if (e?.code === 'P2002') {
                throw new common_1.BadRequestException('A service type with this name already exists for the branch');
            }
            throw e;
        }
    }
    async update(id, dto, role) {
        if (role !== 'ADMIN' && role !== 'MANAGER')
            throw new common_1.ForbiddenException('Insufficient role');
        return this.prisma.serviceType.update({ where: { id }, data: dto });
    }
    async remove(id, role) {
        if (role !== 'ADMIN' && role !== 'MANAGER')
            throw new common_1.ForbiddenException('Insufficient role');
        return this.prisma.serviceType.update({ where: { id }, data: { archived: true } });
    }
};
exports.ServiceTypesService = ServiceTypesService;
exports.ServiceTypesService = ServiceTypesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ServiceTypesService);
//# sourceMappingURL=service-types.service.js.map