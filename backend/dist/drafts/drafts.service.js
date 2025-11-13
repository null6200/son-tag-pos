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
exports.DraftsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let DraftsService = class DraftsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(branchId, sectionId, page = 1, pageSize = 20, userId, perms = []) {
        const hasAll = (perms || []).includes('all')
            || (perms || []).includes('view_drafts_all')
            || (perms || []).some(p => typeof p === 'string' && /all/i.test(p) && /(draft|sale|order)s?/i.test(p));
        const where = {
            ...(branchId ? { branchId } : {}),
            ...(sectionId ? { sectionId } : {}),
        };
        if (!hasAll && userId) {
            where.waiterId = userId;
        }
        if (!branchId && !hasAll && !userId) {
            throw new common_1.BadRequestException('branchId required');
        }
        const total = await this.prisma.draft.count({ where });
        let items = await this.prisma.draft.findMany({
            where,
            orderBy: { updatedAt: 'desc' },
            skip: (Math.max(1, page) - 1) * Math.max(1, pageSize),
            take: Math.max(1, pageSize),
        });
        try {
            const orderIds = Array.from(new Set(items.map((d) => d.orderId).filter(Boolean)));
            if (orderIds.length) {
                const orders = await this.prisma.order.findMany({
                    where: { id: { in: orderIds } },
                    select: { id: true, status: true },
                });
                const terminal = new Set(['PAID', 'CANCELLED', 'VOIDED', 'REFUNDED']);
                const statusById = new Map(orders.map(o => [o.id, String(o.status || '').toUpperCase()]));
                items = items.filter((d) => {
                    const st = statusById.get(d.orderId);
                    return !st || !terminal.has(st);
                });
            }
        }
        catch { }
        return { items, total, page, pageSize };
    }
    async get(id) {
        const draft = await this.prisma.draft.findUnique({ where: { id } });
        if (!draft)
            throw new common_1.NotFoundException('Draft not found');
        return draft;
    }
    async create(dto) {
        if (!dto.branchId || !dto.name)
            throw new common_1.BadRequestException('Missing fields');
        return this.prisma.draft.create({
            data: {
                branchId: dto.branchId,
                sectionId: dto.sectionId ?? null,
                tableId: dto.tableId ?? null,
                orderId: dto.orderId ?? null,
                name: dto.name,
                serviceType: dto.serviceType,
                waiterId: dto.waiterId ?? null,
                customerName: dto.customerName ?? null,
                customerPhone: dto.customerPhone ?? null,
                cart: dto.cart,
                subtotal: dto.subtotal,
                discount: dto.discount,
                tax: dto.tax,
                total: dto.total,
                status: dto.status,
                reservationKey: dto.reservationKey ?? null,
            },
        });
    }
    async update(id, dto) {
        const existing = await this.prisma.draft.findUnique({ where: { id } });
        if (!existing)
            throw new common_1.NotFoundException('Draft not found');
        return this.prisma.draft.update({
            where: { id },
            data: {
                ...(dto.sectionId !== undefined ? { sectionId: dto.sectionId } : {}),
                ...(dto.tableId !== undefined ? { tableId: dto.tableId } : {}),
                ...(dto.orderId !== undefined ? { orderId: dto.orderId } : {}),
                ...(dto.name !== undefined ? { name: dto.name } : {}),
                ...(dto.serviceType !== undefined ? { serviceType: dto.serviceType } : {}),
                ...(dto.waiterId !== undefined ? { waiterId: dto.waiterId } : {}),
                ...(dto.customerName !== undefined ? { customerName: dto.customerName } : {}),
                ...(dto.customerPhone !== undefined ? { customerPhone: dto.customerPhone } : {}),
                ...(dto.cart !== undefined ? { cart: dto.cart } : {}),
                ...(dto.subtotal !== undefined ? { subtotal: dto.subtotal } : {}),
                ...(dto.discount !== undefined ? { discount: dto.discount } : {}),
                ...(dto.tax !== undefined ? { tax: dto.tax } : {}),
                ...(dto.total !== undefined ? { total: dto.total } : {}),
                ...(dto.status !== undefined ? { status: dto.status } : {}),
                ...(dto.reservationKey !== undefined ? { reservationKey: dto.reservationKey } : {}),
            },
        });
    }
    async remove(id) {
        const existing = await this.prisma.draft.findUnique({ where: { id } });
        if (!existing)
            throw new common_1.NotFoundException('Draft not found');
        return this.prisma.draft.delete({ where: { id } });
    }
};
exports.DraftsService = DraftsService;
exports.DraftsService = DraftsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DraftsService);
//# sourceMappingURL=drafts.service.js.map