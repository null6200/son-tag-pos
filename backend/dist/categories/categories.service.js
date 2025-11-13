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
exports.CategoriesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let CategoriesService = class CategoriesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(params) {
        let branchId = params?.branchId;
        if (!branchId) {
            const first = await this.prisma.branch.findFirst({ select: { id: true }, orderBy: { createdAt: 'asc' } });
            branchId = first?.id;
        }
        if (!branchId)
            throw new common_1.BadRequestException('branchId is required');
        return this.prisma.category.findMany({ where: { branchId }, orderBy: { name: 'asc' }, select: { id: true, name: true, code: true } });
    }
    async create(dto) {
        let { name, code } = dto || {};
        let branchId = dto?.branchId;
        if (!branchId) {
            const first = await this.prisma.branch.findFirst({ select: { id: true }, orderBy: { createdAt: 'asc' } });
            branchId = first?.id;
        }
        if (!branchId)
            throw new common_1.BadRequestException('branchId is required');
        if (!name || typeof name !== 'string')
            throw new common_1.BadRequestException('name is required');
        try {
            return await this.prisma.category.create({ data: { name: String(name).trim(), code: (code || null), branchId } });
        }
        catch (e) {
            if (e?.code === 'P2002')
                throw new common_1.BadRequestException('A category with this name already exists for the branch');
            throw e;
        }
    }
    async update(id, dto) {
        const exists = await this.prisma.category.findUnique({ where: { id } });
        if (!exists)
            throw new common_1.NotFoundException('Category not found');
        const data = {};
        if (dto.name !== undefined)
            data.name = dto.name?.trim() || null;
        if (dto.code !== undefined)
            data.code = dto.code?.trim() || null;
        if (!Object.keys(data).length)
            throw new common_1.BadRequestException('No fields to update');
        return this.prisma.category.update({ where: { id }, data, select: { id: true, name: true, code: true } });
    }
    async remove(id) {
        const exists = await this.prisma.category.findUnique({ where: { id } });
        if (!exists)
            throw new common_1.NotFoundException('Category not found');
        return this.prisma.category.delete({ where: { id }, select: { id: true } });
    }
    async listAny(params) {
        const where = {};
        if (params?.branchId)
            where.branchId = params.branchId;
        return this.prisma.category.findMany({ where, orderBy: { name: 'asc' }, select: { id: true, name: true, code: true, branchId: true } });
    }
};
exports.CategoriesService = CategoriesService;
exports.CategoriesService = CategoriesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CategoriesService);
//# sourceMappingURL=categories.service.js.map