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
exports.SettingsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let SettingsService = class SettingsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async get(branchId) {
        if (!branchId) {
            const any = await this.prisma.setting.findFirst();
            if (any)
                return any;
            try {
                const firstBranch = await this.prisma.branch.findFirst({ select: { id: true, name: true } });
                if (firstBranch)
                    return { branchId: firstBranch.id, businessName: firstBranch.name, currency: 'USD', taxRate: 0 };
            }
            catch { }
            return { businessName: 'My Business', currency: 'USD', taxRate: 0 };
        }
        const row = await this.prisma.setting.findFirst({ where: { branchId } });
        if (row)
            return row;
        try {
            const branch = await this.prisma.branch.findUnique({ where: { id: branchId }, select: { name: true } });
            return { branchId, businessName: branch?.name || 'My Business', currency: 'USD', taxRate: 0 };
        }
        catch {
            return { branchId, businessName: 'My Business', currency: 'USD', taxRate: 0 };
        }
    }
    async set(data) {
        const branchId = data.branchId || null;
        if (branchId) {
            const exists = await this.prisma.setting.findFirst({ where: { branchId } });
            if (exists) {
                return this.prisma.setting.update({ where: { id: exists.id }, data: { businessName: data.businessName, currency: data.currency, taxRate: data.taxRate, logoUrl: data.logoUrl, address: data.address, phone: data.phone, email: data.email, currencySymbol: data.currencySymbol, theme: data.theme, allowOverselling: data.allowOverselling, receiptFooterNote: data.receiptFooterNote, invoiceFooterNote: data.invoiceFooterNote } });
            }
            return this.prisma.setting.create({ data: { branchId, businessName: data.businessName, currency: data.currency, taxRate: data.taxRate, logoUrl: data.logoUrl, address: data.address, phone: data.phone, email: data.email, currencySymbol: data.currencySymbol, theme: data.theme, allowOverselling: data.allowOverselling, receiptFooterNote: data.receiptFooterNote, invoiceFooterNote: data.invoiceFooterNote } });
        }
        const any = await this.prisma.setting.findFirst();
        if (any)
            return this.prisma.setting.update({ where: { id: any.id }, data: { businessName: data.businessName, currency: data.currency, taxRate: data.taxRate, logoUrl: data.logoUrl, address: data.address, phone: data.phone, email: data.email, currencySymbol: data.currencySymbol, theme: data.theme, allowOverselling: data.allowOverselling, receiptFooterNote: data.receiptFooterNote, invoiceFooterNote: data.invoiceFooterNote } });
        return this.prisma.setting.create({ data: { businessName: data.businessName, currency: data.currency, taxRate: data.taxRate, logoUrl: data.logoUrl, address: data.address, phone: data.phone, email: data.email, currencySymbol: data.currencySymbol, theme: data.theme, allowOverselling: data.allowOverselling, receiptFooterNote: data.receiptFooterNote, invoiceFooterNote: data.invoiceFooterNote } });
    }
};
exports.SettingsService = SettingsService;
exports.SettingsService = SettingsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SettingsService);
//# sourceMappingURL=settings.service.js.map