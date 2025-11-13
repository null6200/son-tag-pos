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
exports.ShiftsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const shifts_service_1 = require("./shifts.service");
const permissions_guard_1 = require("../auth/permissions.guard");
const permissions_decorator_1 = require("../auth/permissions.decorator");
let ShiftsController = class ShiftsController {
    shifts;
    constructor(shifts) {
        this.shifts = shifts;
    }
    async open(body, req) {
        const rawId = req.user?.id || req.user?.sub || req.user?.userId || req.user?.uid;
        if (!rawId)
            throw new common_1.UnauthorizedException();
        if (!body || !body.branchId)
            throw new common_1.BadRequestException('branchId is required');
        const openedById = String(rawId);
        return this.shifts.openShift({
            branchId: body.branchId,
            sectionId: body.sectionId,
            openedById,
            openingCash: Number(body.openingCash || 0),
        });
    }
    async current(branchId, sectionId, req) {
        if (branchId && sectionId) {
            return this.shifts.getCurrentShift({ branchId, sectionId });
        }
        const rawId = req.user?.id || req.user?.sub || req.user?.userId || req.user?.uid;
        if (!rawId)
            throw new common_1.UnauthorizedException();
        const userId = String(rawId);
        return this.shifts.findOpenShiftForUser(userId);
    }
    async currentForUser(req) {
        const rawId = req.user?.id || req.user?.sub || req.user?.userId || req.user?.uid;
        if (!rawId)
            throw new common_1.UnauthorizedException();
        const userId = String(rawId);
        return this.shifts.findOpenShiftForUser(userId);
    }
    getOpenHelp() {
        return { message: 'Use POST /api/shifts/open with JSON body { branchId, sectionId, openingCash } and a valid Authorization token' };
    }
    async currentForBranch(branchId) {
        return this.shifts.findOpenShiftForBranch(branchId);
    }
    async close(id, body, req) {
        const rawId = req.user?.id || req.user?.sub || req.user?.userId || req.user?.uid;
        if (!rawId) {
            throw new Error('Authenticated user id not found in token');
        }
        const closedById = String(rawId);
        return this.shifts.closeShift({ shiftId: id, closingCash: Number(body.closingCash || 0), closedById });
    }
    async list(branchId, sectionId, status, limit, offset) {
        return this.shifts.listShifts({
            branchId,
            sectionId: sectionId || undefined,
            status: status || 'ALL',
            limit: Math.min(Math.max(parseInt(String(limit ?? 50), 10) || 50, 1), 200),
            offset: Math.max(parseInt(String(offset ?? 0), 10) || 0, 0),
        });
    }
    async getById(id) {
        return this.shifts.getById(id);
    }
};
exports.ShiftsController = ShiftsController;
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    (0, common_1.Post)('open'),
    (0, permissions_decorator_1.Permissions)('open_shift_register'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ShiftsController.prototype, "open", null);
__decorate([
    (0, common_1.Get)('current'),
    __param(0, (0, common_1.Query)('branchId')),
    __param(1, (0, common_1.Query)('sectionId')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], ShiftsController.prototype, "current", null);
__decorate([
    (0, common_1.Get)('current/me'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ShiftsController.prototype, "currentForUser", null);
__decorate([
    (0, common_1.Get)('open'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ShiftsController.prototype, "getOpenHelp", null);
__decorate([
    (0, common_1.Get)('current/branch'),
    __param(0, (0, common_1.Query)('branchId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ShiftsController.prototype, "currentForBranch", null);
__decorate([
    (0, common_1.Put)(':id/close'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], ShiftsController.prototype, "close", null);
__decorate([
    (0, common_1.Get)('list'),
    __param(0, (0, common_1.Query)('branchId')),
    __param(1, (0, common_1.Query)('sectionId')),
    __param(2, (0, common_1.Query)('status')),
    __param(3, (0, common_1.Query)('limit')),
    __param(4, (0, common_1.Query)('offset')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], ShiftsController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ShiftsController.prototype, "getById", null);
exports.ShiftsController = ShiftsController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('shifts'),
    __metadata("design:paramtypes", [shifts_service_1.ShiftsService])
], ShiftsController);
//# sourceMappingURL=shifts.controller.js.map