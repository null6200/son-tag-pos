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
exports.PurchasesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let PurchasesService = class PurchasesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    notImplemented() { throw new common_1.NotImplementedException(); }
    async listAll() {
        return this.prisma.purchase.findMany({
            include: { items: true, payments: true },
            orderBy: { createdAt: 'desc' },
        });
    }
    async listMine() {
        return this.listAll();
    }
    async create(dto) {
        const items = (dto.items || []).map(i => ({ ...i, qty: Number(i.qty), price: i.price }));
        const total = items.reduce((acc, it) => acc + Number(it.price) * Number(it.qty), 0);
        const purchase = await this.prisma.purchase.create({
            data: {
                branchId: dto.branchId,
                supplierId: dto.supplierId || null,
                total: String(total),
            },
        });
        if (items.length) {
            await this.prisma.purchaseItem.createMany({
                data: items.map(it => ({
                    purchaseId: purchase.id,
                    productId: it.productId,
                    qty: Number(it.qty),
                    price: it.price,
                })),
            });
        }
        if ((dto.payments || []).length) {
            await this.prisma.purchasePayment.createMany({
                data: (dto.payments || []).map(p => ({
                    purchaseId: purchase.id,
                    method: p.method,
                    amount: p.amount,
                    reference: p.reference,
                })),
            });
        }
        return this.prisma.purchase.findUnique({
            where: { id: purchase.id },
            include: { items: true, payments: true },
        });
    }
    async update(id, dto) {
        return this.prisma.purchase.update({ where: { id }, data: dto });
    }
    async remove(id) {
        await this.prisma.purchaseItem.deleteMany({ where: { purchaseId: id } });
        await this.prisma.purchasePayment.deleteMany({ where: { purchaseId: id } });
        return this.prisma.purchase.delete({ where: { id } });
    }
    async addPayment(id, dto) {
        return this.prisma.purchasePayment.create({
            data: {
                purchaseId: id,
                method: dto.method,
                amount: dto.amount,
                reference: dto.reference,
            },
        });
    }
    async editPayment(id, paymentId, dto) {
        return this.prisma.purchasePayment.update({
            where: { id: paymentId },
            data: {
                method: dto.method,
                amount: dto.amount,
                reference: dto.reference,
            },
        });
    }
    async deletePayment(id, paymentId) {
        return this.prisma.purchasePayment.delete({ where: { id: paymentId } });
    }
};
exports.PurchasesService = PurchasesService;
exports.PurchasesService = PurchasesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PurchasesService);
//# sourceMappingURL=purchases.service.js.map