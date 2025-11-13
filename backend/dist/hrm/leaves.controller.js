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
exports.LeavesController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const permissions_guard_1 = require("../auth/permissions.guard");
const permissions_decorator_1 = require("../auth/permissions.decorator");
const leaves_service_1 = require("./leaves.service");
let LeavesController = class LeavesController {
    leaves;
    constructor(leaves) {
        this.leaves = leaves;
    }
    async list(branchId, status, userId) {
        return this.leaves.list({ branchId, status, userId });
    }
    async create(body) {
        return this.leaves.create({
            userId: body.userId,
            branchId: body.branchId,
            type: body.type,
            startDate: new Date(body.startDate),
            endDate: new Date(body.endDate),
            reason: body.reason,
        });
    }
    async approve(id, body) {
        return this.leaves.approve(id, body.approverUserId);
    }
    async reject(id, body) {
        return this.leaves.reject(id, body.approverUserId, body.reason);
    }
    async cancel(id, body) {
        return this.leaves.cancel(id, body.byUserId);
    }
};
exports.LeavesController = LeavesController;
__decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Get)(),
    (0, permissions_decorator_1.Permissions)('view_leave'),
    __param(0, (0, common_1.Query)('branchId')),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], LeavesController.prototype, "list", null);
__decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Post)(),
    (0, permissions_decorator_1.Permissions)('add_leave'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], LeavesController.prototype, "create", null);
__decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Post)(':id/approve'),
    (0, permissions_decorator_1.Permissions)('edit_leave'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], LeavesController.prototype, "approve", null);
__decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Post)(':id/reject'),
    (0, permissions_decorator_1.Permissions)('edit_leave'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], LeavesController.prototype, "reject", null);
__decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Post)(':id/cancel'),
    (0, permissions_decorator_1.Permissions)('delete_leave'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], LeavesController.prototype, "cancel", null);
exports.LeavesController = LeavesController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('hrm/leaves'),
    __metadata("design:paramtypes", [leaves_service_1.HrmLeavesService])
], LeavesController);
//# sourceMappingURL=leaves.controller.js.map