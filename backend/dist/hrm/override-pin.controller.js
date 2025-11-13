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
exports.OverridePinController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const permissions_guard_1 = require("../auth/permissions.guard");
const permissions_decorator_1 = require("../auth/permissions.decorator");
const override_pin_service_1 = require("./override-pin.service");
let OverridePinController = class OverridePinController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    async get(branchId) {
        return this.svc.get(branchId);
    }
    async set(body) {
        return this.svc.set(body.branchId, body.pin || '', body.graceSeconds);
    }
    async verify(body, req) {
        const fallbackBranchId = req?.user?.branchId ? String(req.user.branchId) : undefined;
        return this.svc.verify(body.branchId || fallbackBranchId, body.pin);
    }
};
exports.OverridePinController = OverridePinController;
__decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Get)(),
    (0, permissions_decorator_1.Permissions)('update_override_pin'),
    __param(0, (0, common_1.Query)('branchId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OverridePinController.prototype, "get", null);
__decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Post)('set'),
    (0, permissions_decorator_1.Permissions)('add_override_pin', 'update_override_pin'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OverridePinController.prototype, "set", null);
__decorate([
    (0, common_1.Post)('verify'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], OverridePinController.prototype, "verify", null);
exports.OverridePinController = OverridePinController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('hrm/override-pin'),
    __metadata("design:paramtypes", [override_pin_service_1.OverridePinService])
], OverridePinController);
//# sourceMappingURL=override-pin.controller.js.map