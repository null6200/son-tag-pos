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
const permissions_guard_1 = require("../auth/permissions.guard");
const permissions_decorator_1 = require("../auth/permissions.decorator");
const shifts_service_1 = require("./shifts.service");
let ShiftsController = class ShiftsController {
    shifts;
    constructor(shifts) {
        this.shifts = shifts;
    }
    async list(branchId, from, to, userId) {
        return this.shifts.list({ branchId, from: from ? new Date(from) : undefined, to: to ? new Date(to) : undefined, userId });
    }
    async assign(body) {
        return this.shifts.assign({
            userId: body.userId,
            branchId: body.branchId,
            start: new Date(body.start),
            end: body.end ? new Date(body.end) : null,
            note: body.note ?? null,
        });
    }
    async update(id, body) {
        return this.shifts.update(id, {
            start: body.start ? new Date(body.start) : undefined,
            end: body.end === undefined ? undefined : (body.end ? new Date(body.end) : null),
            status: body.status,
            note: body.note === undefined ? undefined : body.note,
        });
    }
    async remove(id) {
        return this.shifts.remove(id);
    }
};
exports.ShiftsController = ShiftsController;
__decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Get)(),
    (0, permissions_decorator_1.Permissions)('assign_shift'),
    __param(0, (0, common_1.Query)('branchId')),
    __param(1, (0, common_1.Query)('from')),
    __param(2, (0, common_1.Query)('to')),
    __param(3, (0, common_1.Query)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], ShiftsController.prototype, "list", null);
__decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Post)(),
    (0, permissions_decorator_1.Permissions)('assign_shift'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ShiftsController.prototype, "assign", null);
__decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Put)(':id'),
    (0, permissions_decorator_1.Permissions)('assign_shift'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ShiftsController.prototype, "update", null);
__decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Delete)(':id'),
    (0, permissions_decorator_1.Permissions)('assign_shift'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ShiftsController.prototype, "remove", null);
exports.ShiftsController = ShiftsController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('hrm/shifts'),
    __metadata("design:paramtypes", [shifts_service_1.HrmShiftsService])
], ShiftsController);
//# sourceMappingURL=shifts.controller.js.map