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
exports.ProductsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ProductsService = class ProductsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(branchId, includeArchived) {
        return this.prisma.product.findMany({
            where: {
                ...(branchId ? { branchId } : {}),
                ...(includeArchived ? {} : { archived: false }),
            },
            orderBy: { name: 'asc' },
        });
    }
    async create(dto, role) {
        let branchId = dto?.branchId;
        if (!branchId) {
            const first = await this.prisma.branch.findFirst({ select: { id: true }, orderBy: { createdAt: 'asc' } });
            branchId = first?.id;
        }
        if (!branchId)
            throw new common_1.BadRequestException('branchId is required');
        let productTypeId = dto.productTypeId;
        if (!productTypeId && dto.productTypeName) {
            const byName = await this.prisma.productType.findFirst({ where: { branchId, name: dto.productTypeName } });
            if (!byName)
                throw new common_1.BadRequestException('Product type not found');
            productTypeId = byName.id;
        }
        if (productTypeId) {
            const pt = await this.prisma.productType.findUnique({ where: { id: productTypeId } });
            if (!pt)
                throw new common_1.BadRequestException('Product type not found');
            if (pt.branchId !== branchId)
                throw new common_1.BadRequestException('Product type belongs to a different branch');
        }
        let product;
        try {
            product = await this.prisma.$transaction(async (tx) => {
                const b = await tx.branch.update({ where: { id: branchId }, data: { nextSkuSeq: { increment: 1 } }, select: { nextSkuSeq: true } });
                const seq = Number(b.nextSkuSeq || 0);
                const sku = String(seq).padStart(3, '0');
                const created = await tx.product.create({
                    data: {
                        name: dto.name,
                        sku,
                        category: dto.category,
                        subCategory: dto.subCategory,
                        price: dto.price,
                        taxRate: dto.taxRate,
                        branchId: branchId,
                        productTypeId: productTypeId ?? null,
                    },
                });
                const qtyInitialRaw = dto.initialQty !== undefined && dto.initialQty !== null ? String(dto.initialQty) : undefined;
                const qtyInitial = qtyInitialRaw !== undefined ? Math.max(0, Math.floor(Number(qtyInitialRaw))) : 0;
                await tx.inventory.upsert({
                    where: { productId_branchId: { productId: created.id, branchId: branchId } },
                    create: { productId: created.id, branchId: branchId, qtyOnHand: 0 },
                    update: {},
                });
                if (dto.initialSectionId && qtyInitial > 0) {
                    const sec = await tx.section.findUnique({ where: { id: dto.initialSectionId } });
                    if (!sec)
                        throw new common_1.BadRequestException('Section not found');
                    if (sec.branchId !== branchId)
                        throw new common_1.BadRequestException('Section belongs to a different branch');
                    const invSec = await tx.sectionInventory.upsert({
                        where: { productId_sectionId: { productId: created.id, sectionId: dto.initialSectionId } },
                        update: {},
                        create: { productId: created.id, sectionId: dto.initialSectionId, qtyOnHand: 0 },
                    });
                    const nextQty = Number(invSec.qtyOnHand || 0) + qtyInitial;
                    await tx.sectionInventory.update({
                        where: { productId_sectionId: { productId: created.id, sectionId: dto.initialSectionId } },
                        data: { qtyOnHand: nextQty },
                    });
                    await tx.stockMovement.create({
                        data: {
                            productId: created.id,
                            branchId: branchId,
                            sectionFrom: null,
                            sectionTo: dto.initialSectionId,
                            delta: qtyInitial,
                            reason: 'ADJUST',
                            referenceId: `ADJ|${invSec.qtyOnHand}|${nextQty}|||PRODUCT_CREATE_INITIAL`,
                        },
                    });
                }
                return created;
            });
        }
        catch (e) {
            if (e?.code === 'P2002')
                throw new common_1.BadRequestException('A product with this SKU already exists.');
            throw e;
        }
        return product;
    }
    async update(id, dto, role) {
        const exist = await this.prisma.product.findUnique({ where: { id } });
        if (!exist)
            throw new common_1.NotFoundException('Product not found');
        let productTypeId = undefined;
        if (dto.productTypeId !== undefined || dto.productTypeName !== undefined) {
            if (dto.productTypeId === null || dto.productTypeName === null || dto.productTypeId === '' || dto.productTypeName === '') {
                productTypeId = null;
            }
            else if (dto.productTypeId) {
                const pt = await this.prisma.productType.findUnique({ where: { id: dto.productTypeId } });
                if (!pt)
                    throw new common_1.BadRequestException('Product type not found');
                if (pt.branchId !== exist.branchId)
                    throw new common_1.BadRequestException('Product type belongs to a different branch');
                productTypeId = pt.id;
            }
            else if (dto.productTypeName) {
                const ptByName = await this.prisma.productType.findFirst({ where: { branchId: exist.branchId, name: dto.productTypeName } });
                if (!ptByName)
                    throw new common_1.BadRequestException('Product type not found');
                productTypeId = ptByName.id;
            }
        }
        return this.prisma.product.update({
            where: { id },
            data: {
                name: dto.name,
                category: dto.category,
                subCategory: dto.subCategory,
                price: dto.price,
                taxRate: dto.taxRate,
                ...(productTypeId !== undefined ? { productTypeId } : {}),
            },
        });
    }
    async remove(id, role) {
        const exist = await this.prisma.product.findUnique({ where: { id } });
        if (!exist)
            throw new common_1.NotFoundException('Product not found');
        const salesCount = await this.prisma.orderItem.count({ where: { productId: id } });
        if (salesCount > 0) {
            return this.prisma.product.update({ where: { id }, data: { archived: true } });
        }
        try {
            await this.prisma.inventory.deleteMany({ where: { productId: id } });
            await this.prisma.sectionInventory.deleteMany({ where: { productId: id } }).catch(() => { });
            await this.prisma.orderItem.deleteMany({ where: { productId: id } }).catch(() => { });
            await this.prisma.priceEntry.deleteMany({ where: { productId: id } }).catch(() => { });
            return await this.prisma.product.delete({ where: { id } });
        }
        catch (e) {
            return this.prisma.product.update({ where: { id }, data: { archived: true } });
        }
    }
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ProductsService);
//# sourceMappingURL=products.service.js.map