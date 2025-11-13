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
exports.SubcategoriesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let SubcategoriesService = class SubcategoriesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(branchId) {
        const where = {};
        if (branchId)
            where.branchId = branchId;
        const items = await this.prisma.subcategory.findMany({ where, orderBy: { name: 'asc' } });
        const total = await this.prisma.subcategory.count({ where });
        return { items, total };
    }
    async create(dto) {
        return this.prisma.subcategory.create({ data: { name: dto.name, code: dto.code ?? null, branchId: dto.branchId ?? null } });
    }
    async update(id, dto) {
        return this.prisma.subcategory.update({ where: { id }, data: { name: dto.name, code: dto.code ?? null, branchId: dto.branchId ?? null } });
    }
    async remove(id) {
        await this.prisma.subcategory.delete({ where: { id } });
        return { ok: true };
    }
};
exports.SubcategoriesService = SubcategoriesService;
exports.SubcategoriesService = SubcategoriesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SubcategoriesService);
//# sourceMappingURL=subcategories.service.js.map