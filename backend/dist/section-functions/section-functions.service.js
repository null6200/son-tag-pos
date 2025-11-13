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
exports.SectionFunctionsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let SectionFunctionsService = class SectionFunctionsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(branchId, page = 1, pageSize = 20) {
        let bId = branchId || null;
        if (!bId) {
            const first = await this.prisma.branch.findFirst({ select: { id: true } });
            bId = first?.id || null;
        }
        if (!bId)
            throw new common_1.BadRequestException('branchId is required');
        const take = Math.min(Math.max(pageSize, 1), 100);
        const skip = (Math.max(page, 1) - 1) * take;
        const [items, total] = await this.prisma.$transaction([
            this.prisma.sectionFunction.findMany({ where: { branchId: bId }, orderBy: { name: 'asc' }, skip, take }),
            this.prisma.sectionFunction.count({ where: { branchId: bId } }),
        ]);
        return { items, page, pageSize: take, total, pages: Math.ceil(total / take) };
    }
    async create(dto, role) {
        if (role !== 'ADMIN' && role !== 'MANAGER')
            throw new common_1.ForbiddenException('Insufficient role');
        const name = String(dto.name || '').trim();
        if (!name)
            throw new common_1.BadRequestException('name is required');
        let branchId = dto.branchId || null;
        if (!branchId) {
            const first = await this.prisma.branch.findFirst({ select: { id: true } });
            branchId = first?.id || null;
        }
        if (!branchId)
            throw new common_1.BadRequestException('branchId is required');
        return this.prisma.sectionFunction.create({ data: { branchId, name, description: dto.description ?? null } });
    }
    async update(id, dto, role) {
        if (role !== 'ADMIN' && role !== 'MANAGER')
            throw new common_1.ForbiddenException('Insufficient role');
        const exist = await this.prisma.sectionFunction.findUnique({ where: { id } });
        if (!exist)
            throw new common_1.NotFoundException('Section function not found');
        const data = {};
        if (dto.name !== undefined)
            data.name = String(dto.name || '').trim();
        if (dto.description !== undefined)
            data.description = dto.description ?? null;
        return this.prisma.sectionFunction.update({ where: { id }, data });
    }
    async remove(id, role) {
        if (role !== 'ADMIN' && role !== 'MANAGER')
            throw new common_1.ForbiddenException('Insufficient role');
        const exist = await this.prisma.sectionFunction.findUnique({ where: { id } });
        if (!exist)
            throw new common_1.NotFoundException('Section function not found');
        return this.prisma.$transaction(async (tx) => {
            await tx.section.updateMany({ where: { sectionFunctionId: id }, data: { sectionFunctionId: null } });
            await tx.productTypeAllowedFunction.deleteMany({ where: { sectionFunctionId: id } });
            return tx.sectionFunction.delete({ where: { id } });
        });
    }
};
exports.SectionFunctionsService = SectionFunctionsService;
exports.SectionFunctionsService = SectionFunctionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SectionFunctionsService);
//# sourceMappingURL=section-functions.service.js.map