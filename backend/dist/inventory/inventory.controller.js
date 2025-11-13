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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const permissions_guard_1 = require("../auth/permissions.guard");
const permissions_decorator_1 = require("../auth/permissions.decorator");
const inventory_service_1 = require("./inventory.service");
const prisma_service_1 = require("../prisma/prisma.service");
class AdjustStockDto {
    delta;
    reason;
}
let InventoryController = class InventoryController {
    inventory;
    prisma;
    constructor(inventory, prisma) {
        this.inventory = inventory;
        this.prisma = prisma;
    }
    async list(branchId) {
        return this.inventory.listByBranch(branchId);
    }
    async releaseReservationsAll(branchId, req) {
        const u = req?.user || {};
        const uid = u.id || u.userId || u.sub;
        const displayName = (u.firstName && u.surname) ? `${u.firstName} ${u.surname}` : (u.fullName || u.name || u.username || uid);
        return this.inventory.releaseReservationsAll(branchId, { id: uid, name: displayName });
    }
    async listBySection(sectionId, sectionName, branchId) {
        let sid = sectionId;
        if (!sid && sectionName) {
            const sec = await this.prisma.section.findFirst({ where: { name: sectionName, ...(branchId ? { branchId } : {}) } });
            sid = sec?.id;
        }
        return this.inventory.listBySection(sid);
    }
    async aggregateByBranch(branchId) {
        return this.inventory.aggregateByBranch(branchId);
    }
    async getSettings(branchId) {
        if (branchId) {
            const row = await this.prisma.setting.findFirst({ where: { branchId }, select: { allowOverselling: true, branchId: true } });
            return { branchId, allowOverselling: !!row?.allowOverselling };
        }
        const any = await this.prisma.setting.findFirst({ select: { allowOverselling: true, branchId: true } });
        return { branchId: any?.branchId, allowOverselling: !!any?.allowOverselling };
    }
    async setAllowOverselling(body) {
        const branchId = body?.branchId || null;
        const value = !!body?.allowOverselling;
        if (branchId) {
            const exists = await this.prisma.setting.findFirst({ where: { branchId }, select: { id: true } });
            if (exists) {
                await this.prisma.setting.update({ where: { id: exists.id }, data: { allowOverselling: value } });
            }
            else {
                await this.prisma.setting.create({ data: { branchId, allowOverselling: value } });
            }
            return { ok: true, branchId, allowOverselling: value };
        }
        const any = await this.prisma.setting.findFirst({ select: { id: true } });
        if (any) {
            await this.prisma.setting.update({ where: { id: any.id }, data: { allowOverselling: value } });
        }
        else {
            await this.prisma.setting.create({ data: { allowOverselling: value } });
        }
        return { ok: true, allowOverselling: value };
    }
    async movements(branchId, limit) {
        return this.inventory.listMovements(branchId, Number(limit) || 100);
    }
    async transfers(branchId, limit) {
        return this.inventory.listTransfers(branchId, Number(limit) || 100);
    }
    async adjustments(branchId, limit) {
        return this.inventory.listAdjustments(branchId, Number(limit) || 100);
    }
    async adjust(productId, branchId, dto, req) {
        const u = req?.user || {};
        const uid = u.id || u.userId || u.sub;
        const displayName = (u.firstName && u.surname) ? `${u.firstName} ${u.surname}` : (u.fullName || u.name || u.username || uid);
        const dtoWithName = { ...dto, __userName: displayName };
        return this.inventory.adjust(productId, branchId, dtoWithName, u?.role, uid);
    }
    async adjustInSection(productId, sectionId, sectionName, branchId, dto, req) {
        const u = req?.user || {};
        const uid = u.id || u.userId || u.sub;
        const displayName = (u.firstName && u.surname) ? `${u.firstName} ${u.surname}` : (u.fullName || u.name || u.username || uid);
        const dtoWithName = { ...dto, __userName: displayName };
        let sid = sectionId;
        if (!sid && sectionName) {
            const sec = await this.prisma.section.findFirst({ where: { name: sectionName, ...(branchId ? { branchId } : {}) } });
            sid = sec?.id;
        }
        return this.inventory.adjustInSection(productId, sid, dtoWithName, u?.role, uid);
    }
    async releaseReservations(sectionId, body, req) {
        const u = req?.user || {};
        const uid = u.id || u.userId || u.sub;
        const displayName = (u.firstName && u.surname) ? `${u.firstName} ${u.surname}` : (u.fullName || u.name || u.username || uid);
        let sid = sectionId;
        if ((!sid || sid === 'null' || sid === 'undefined') && body?.sectionName) {
            const sec = await this.prisma.section.findFirst({ where: { name: body.sectionName, ...(body?.branchId ? { branchId: body.branchId } : {}) } });
            sid = sec?.id || sid;
        }
        return this.inventory.releaseReservations(sid, body?.reservationKey, { id: uid, name: displayName });
    }
    async releaseReservationsGet(sectionId, reservationKey, sectionName, branchId, req) {
        const u = req?.user || {};
        const uid = u.id || u.userId || u.sub;
        const displayName = (u.firstName && u.surname) ? `${u.firstName} ${u.surname}` : (u.fullName || u.name || u.username || uid);
        let sid = sectionId;
        if ((!sid || sid === 'null' || sid === 'undefined') && sectionName) {
            const sec = await this.prisma.section.findFirst({ where: { name: sectionName, ...(branchId ? { branchId } : {}) } });
            sid = sec?.id || sid;
        }
        return this.inventory.releaseReservations(sid, reservationKey || undefined, { id: uid, name: displayName });
    }
    async transfer(body, req) {
        const u = req?.user || {};
        const uid = u.id || u.userId || u.sub;
        const displayName = (u.firstName && u.surname) ? `${u.firstName} ${u.surname}` : (u.fullName || u.name || u.username || uid);
        let fromId = body.fromSectionId;
        let toId = body.toSectionId;
        if ((!fromId || fromId === '') && body.fromSectionName) {
            const s = await this.prisma.section.findFirst({ where: { name: body.fromSectionName, ...(body.branchId ? { branchId: body.branchId } : {}) } });
            fromId = s?.id;
        }
        if ((!toId || toId === '') && body.toSectionName) {
            const s = await this.prisma.section.findFirst({ where: { name: body.toSectionName, ...(body.branchId ? { branchId: body.branchId } : {}) } });
            toId = s?.id;
        }
        return this.inventory.transfer(fromId, toId, body.items, u?.role, { id: uid, name: displayName });
    }
};
exports.InventoryController = InventoryController;
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, permissions_decorator_1.Permissions)('view_branch_section'),
    __param(0, (0, common_1.Query)('branchId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('release-reservations-all'),
    __param(0, (0, common_1.Query)('branchId')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "releaseReservationsAll", null);
__decorate([
    (0, common_1.Get)('sections'),
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, permissions_decorator_1.Permissions)('view_branch_section'),
    __param(0, (0, common_1.Query)('sectionId')),
    __param(1, (0, common_1.Query)('sectionName')),
    __param(2, (0, common_1.Query)('branchId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "listBySection", null);
__decorate([
    (0, common_1.Get)('aggregate'),
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, permissions_decorator_1.Permissions)('view_branch_section'),
    __param(0, (0, common_1.Query)('branchId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "aggregateByBranch", null);
__decorate([
    (0, common_1.Get)('settings'),
    __param(0, (0, common_1.Query)('branchId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "getSettings", null);
__decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Put)('settings/overselling'),
    (0, permissions_decorator_1.Permissions)('edit_settings', 'stock_adjustment', 'stock_transfer'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "setAllowOverselling", null);
__decorate([
    (0, common_1.Get)('movements'),
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, permissions_decorator_1.Permissions)('view_branch_section'),
    __param(0, (0, common_1.Query)('branchId')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "movements", null);
__decorate([
    (0, common_1.Get)('transfers'),
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, permissions_decorator_1.Permissions)('view_branch_section'),
    __param(0, (0, common_1.Query)('branchId')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "transfers", null);
__decorate([
    (0, common_1.Get)('adjustments'),
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, permissions_decorator_1.Permissions)('view_branch_section'),
    __param(0, (0, common_1.Query)('branchId')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "adjustments", null);
__decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Put)(':productId/adjust'),
    (0, permissions_decorator_1.Permissions)('stock_adjustment'),
    __param(0, (0, common_1.Param)('productId')),
    __param(1, (0, common_1.Query)('branchId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, AdjustStockDto, Object]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "adjust", null);
__decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Put)('sections/:productId/adjust'),
    (0, permissions_decorator_1.Permissions)('stock_adjustment', 'add_pos_sell'),
    __param(0, (0, common_1.Param)('productId')),
    __param(1, (0, common_1.Query)('sectionId')),
    __param(2, (0, common_1.Query)('sectionName')),
    __param(3, (0, common_1.Query)('branchId')),
    __param(4, (0, common_1.Body)()),
    __param(5, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object, AdjustStockDto, Object]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "adjustInSection", null);
__decorate([
    (0, common_1.Post)('sections/:sectionId/release-reservations'),
    __param(0, (0, common_1.Param)('sectionId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "releaseReservations", null);
__decorate([
    (0, common_1.Get)('sections/:sectionId/release-reservations'),
    __param(0, (0, common_1.Param)('sectionId')),
    __param(1, (0, common_1.Query)('reservationKey')),
    __param(2, (0, common_1.Query)('sectionName')),
    __param(3, (0, common_1.Query)('branchId')),
    __param(4, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "releaseReservationsGet", null);
__decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Post)('transfer'),
    (0, permissions_decorator_1.Permissions)('stock_transfer'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "transfer", null);
exports.InventoryController = InventoryController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('inventory'),
    __metadata("design:paramtypes", [inventory_service_1.InventoryService, prisma_service_1.PrismaService])
], InventoryController);
//# sourceMappingURL=inventory.controller.js.map