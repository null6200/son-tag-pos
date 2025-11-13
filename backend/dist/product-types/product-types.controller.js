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
exports.ProductTypesController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const permissions_guard_1 = require("../auth/permissions.guard");
const permissions_decorator_1 = require("../auth/permissions.decorator");
const product_types_service_1 = require("./product-types.service");
let ProductTypesController = class ProductTypesController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    async list(branchId, page, pageSize, req) {
        const effectiveBranchId = branchId ?? req?.user?.branchId ?? undefined;
        const p = Math.max(1, parseInt(String(page || '1'), 10) || 1);
        const ps = Math.min(100, Math.max(1, parseInt(String(pageSize || '20'), 10) || 20));
        return this.svc.list(effectiveBranchId ? String(effectiveBranchId) : undefined, p, ps);
    }
    async create(dto, req) {
        const branchId = dto.branchId ?? req?.user?.branchId;
        if (!branchId) {
            const first = await this.svc['prisma'].branch.findFirst({ select: { id: true } }).catch(() => null);
            if (!first?.id)
                throw new common_1.BadRequestException('branchId is required');
            return this.svc.create({ branchId: first.id, name: dto.name, description: dto.description, allowedFunctionIds: dto.allowedFunctionIds || [] }, req.user?.role);
        }
        return this.svc.create({ branchId, name: dto.name, description: dto.description, allowedFunctionIds: dto.allowedFunctionIds || [] }, req.user?.role);
    }
    async update(id, dto, req) {
        return this.svc.update(String(id), dto, req.user?.role);
    }
    async remove(id, req) {
        return this.svc.remove(String(id), req.user?.role);
    }
};
exports.ProductTypesController = ProductTypesController;
__decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Get)(),
    (0, permissions_decorator_1.Permissions)('view_product_type'),
    __param(0, (0, common_1.Query)('branchId')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('pageSize')),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], ProductTypesController.prototype, "list", null);
__decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Post)(),
    (0, permissions_decorator_1.Permissions)('add_product_type'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ProductTypesController.prototype, "create", null);
__decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Put)(':id'),
    (0, permissions_decorator_1.Permissions)('edit_product_type'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], ProductTypesController.prototype, "update", null);
__decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Delete)(':id'),
    (0, permissions_decorator_1.Permissions)('delete_product_type'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ProductTypesController.prototype, "remove", null);
exports.ProductTypesController = ProductTypesController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('product-types'),
    __metadata("design:paramtypes", [product_types_service_1.ProductTypesService])
], ProductTypesController);
//# sourceMappingURL=product-types.controller.js.map