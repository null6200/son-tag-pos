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
exports.ProductTypesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ProductTypesService = class ProductTypesService {
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
        const take = Math.min(Math.max(pageSize, 1), 100);
        const skip = (Math.max(page, 1) - 1) * take;
        const [items, total] = await this.prisma.$transaction([
            this.prisma.productType.findMany({
                where: bId ? { branchId: bId } : {},
                orderBy: { name: 'asc' },
                skip,
                take,
                include: { productTypeLinks: { include: { sectionFunction: true } } },
            }),
            this.prisma.productType.count({ where: bId ? { branchId: bId } : {} }),
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
        if (dto.allowedFunctionIds?.length) {
            const count = await this.prisma.sectionFunction.count({ where: { id: { in: dto.allowedFunctionIds }, branchId } });
            if (count !== dto.allowedFunctionIds.length)
                throw new common_1.BadRequestException('Invalid section function selection');
        }
        try {
            return await this.prisma.productType.create({
                data: {
                    branchId,
                    name,
                    description: dto.description ?? null,
                    productTypeLinks: {
                        create: (dto.allowedFunctionIds || []).map((fid) => ({ sectionFunctionId: fid })),
                    },
                },
            });
        }
        catch (e) {
            if (e?.code === 'P2002') {
                throw new common_1.BadRequestException('A product type with this name already exists for the branch');
            }
            throw e;
        }
    }
    async update(id, dto, role) {
        if (role !== 'ADMIN' && role !== 'MANAGER')
            throw new common_1.ForbiddenException('Insufficient role');
        const exist = await this.prisma.productType.findUnique({ where: { id } });
        if (!exist)
            throw new common_1.NotFoundException('Product type not found');
        const data = {};
        if (dto.name !== undefined)
            data.name = String(dto.name || '').trim();
        if (dto.description !== undefined)
            data.description = dto.description ?? null;
        const updated = await this.prisma.productType.update({ where: { id }, data });
        if (dto.allowedFunctionIds) {
            if (dto.allowedFunctionIds.length) {
                const count = await this.prisma.sectionFunction.count({ where: { id: { in: dto.allowedFunctionIds }, branchId: exist.branchId } });
                if (count !== dto.allowedFunctionIds.length)
                    throw new common_1.BadRequestException('Invalid section function selection');
            }
            await this.prisma.productTypeAllowedFunction.deleteMany({ where: { productTypeId: id } });
            if (dto.allowedFunctionIds.length) {
                await this.prisma.productTypeAllowedFunction.createMany({ data: dto.allowedFunctionIds.map((fid) => ({ productTypeId: id, sectionFunctionId: fid })) });
            }
        }
        return updated;
    }
    async remove(id, role) {
        if (role !== 'ADMIN' && role !== 'MANAGER')
            throw new common_1.ForbiddenException('Insufficient role');
        const exist = await this.prisma.productType.findUnique({ where: { id } });
        if (!exist)
            throw new common_1.NotFoundException('Product type not found');
        const prodCount = await this.prisma.product.count({ where: { productTypeId: id } });
        if (prodCount > 0)
            throw new common_1.BadRequestException('Cannot delete: used by products');
        await this.prisma.productTypeAllowedFunction.deleteMany({ where: { productTypeId: id } });
        return this.prisma.productType.delete({ where: { id } });
    }
};
exports.ProductTypesService = ProductTypesService;
exports.ProductTypesService = ProductTypesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ProductTypesService);
//# sourceMappingURL=product-types.service.js.map