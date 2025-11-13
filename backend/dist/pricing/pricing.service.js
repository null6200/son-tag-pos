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
exports.PricingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let PricingService = class PricingService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getEffectivePrices(branchId, sectionId) {
        const priceList = (await this.prisma.priceList.findFirst({
            where: {
                branchId,
                active: true,
                ...(sectionId ? { sectionId } : { sectionId: null }),
            },
            include: { entries: true },
            orderBy: { createdAt: 'desc' },
        })) ||
            (await this.prisma.priceList.findFirst({
                where: { branchId, active: true, sectionId: null },
                include: { entries: true },
                orderBy: { createdAt: 'desc' },
            }));
        const entriesMap = {};
        const toNum = (v) => {
            if (v === null || v === undefined)
                return 0;
            const n = Number(v.valueOf ? v.valueOf() : v);
            if (Number.isFinite(n))
                return n;
            const p = parseFloat(String(v));
            return Number.isFinite(p) ? p : 0;
        };
        if (priceList) {
            for (const e of priceList.entries) {
                entriesMap[e.productId] = toNum(e.price);
            }
        }
        const products = await this.prisma.product.findMany({
            where: { branchId },
        });
        for (const p of products) {
            if (entriesMap[p.id] === undefined) {
                entriesMap[p.id] = toNum(p.price);
            }
        }
        return entriesMap;
    }
    async createPriceList(dto, role) {
        if (role !== 'ADMIN' && role !== 'MANAGER')
            throw new common_1.ForbiddenException('Insufficient role');
        return this.prisma.priceList.create({
            data: {
                name: dto.name,
                branchId: dto.branchId,
                sectionId: dto.sectionId ?? null,
                active: dto.active ?? true,
            },
        });
    }
    async ensureActivePriceList(branchId, sectionId, role) {
        if (role && role !== 'ADMIN' && role !== 'MANAGER') {
            throw new common_1.ForbiddenException('Insufficient role');
        }
        if (!branchId) {
            const first = await this.prisma.branch.findFirst({ select: { id: true }, orderBy: { createdAt: 'asc' } });
            branchId = first?.id;
        }
        if (!branchId)
            throw new common_1.NotFoundException('Branch not found');
        const existing = await this.prisma.priceList.findFirst({
            where: { branchId, active: true, sectionId: sectionId ?? null },
            orderBy: { createdAt: 'desc' },
        });
        if (existing)
            return existing;
        await this.prisma.priceList.updateMany({
            where: { branchId, sectionId: sectionId ?? null, active: true },
            data: { active: false },
        });
        return this.prisma.priceList.create({
            data: {
                name: sectionId ? `Section-${sectionId}` : `Branch-${branchId}`,
                branchId: branchId,
                sectionId: sectionId ?? null,
                active: true,
            },
        });
    }
    async upsertPriceEntry(dto, role) {
        if (role !== 'ADMIN' && role !== 'MANAGER')
            throw new common_1.ForbiddenException('Insufficient role');
        const pl = await this.prisma.priceList.findUnique({
            where: { id: dto.priceListId },
        });
        if (!pl)
            throw new common_1.NotFoundException('Price list not found');
        const existing = await this.prisma.priceEntry.findUnique({
            where: {
                priceListId_productId: {
                    priceListId: dto.priceListId,
                    productId: dto.productId,
                },
            },
        });
        if (existing) {
            return this.prisma.priceEntry.update({
                where: { id: existing.id },
                data: { price: dto.price },
            });
        }
        return this.prisma.priceEntry.create({
            data: {
                priceListId: dto.priceListId,
                productId: dto.productId,
                price: dto.price,
            },
        });
    }
};
exports.PricingService = PricingService;
exports.PricingService = PricingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PricingService);
//# sourceMappingURL=pricing.service.js.map