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
exports.PublicCategoriesController = exports.CategoriesController = void 0;
const common_1 = require("@nestjs/common");
const common_2 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const permissions_guard_1 = require("../auth/permissions.guard");
const permissions_decorator_1 = require("../auth/permissions.decorator");
const categories_service_1 = require("./categories.service");
let CategoriesController = class CategoriesController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    list(branchId, req) {
        const effectiveBranchId = branchId ?? req?.user?.branchId;
        return this.svc.list({ branchId: effectiveBranchId });
    }
    listAll() { return this.svc.listAny(); }
    create(dto, req) {
        const effective = { ...dto };
        if (!effective.branchId && req?.user?.branchId)
            effective.branchId = req.user.branchId;
        return this.svc.create(effective);
    }
    update(id, dto) { return this.svc.update(id, dto); }
    remove(id) { return this.svc.remove(id); }
};
exports.CategoriesController = CategoriesController;
__decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Get)(),
    (0, permissions_decorator_1.Permissions)('view_category', 'view_pos_sell', 'add_pos_sell', 'edit_pos_sell', 'delete_pos_sell'),
    __param(0, (0, common_1.Query)('branchId')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CategoriesController.prototype, "list", null);
__decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Get)('debug/all'),
    (0, permissions_decorator_1.Permissions)('view_category'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CategoriesController.prototype, "listAll", null);
__decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Post)(),
    (0, permissions_decorator_1.Permissions)('add_category'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], CategoriesController.prototype, "create", null);
__decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Put)(':id'),
    (0, permissions_decorator_1.Permissions)('edit_category'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CategoriesController.prototype, "update", null);
__decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Delete)(':id'),
    (0, permissions_decorator_1.Permissions)('delete_category'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CategoriesController.prototype, "remove", null);
exports.CategoriesController = CategoriesController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('categories'),
    __metadata("design:paramtypes", [categories_service_1.CategoriesService])
], CategoriesController);
let PublicCategoriesController = class PublicCategoriesController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    async list(branchId) {
        const rows = await this.svc.listAny({ branchId });
        return rows.map((c) => ({ id: c.id, name: c.name, code: c.code || null, branchId: c.branchId }));
    }
};
exports.PublicCategoriesController = PublicCategoriesController;
__decorate([
    (0, common_2.Get)(),
    __param(0, (0, common_2.Query)('branchId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PublicCategoriesController.prototype, "list", null);
exports.PublicCategoriesController = PublicCategoriesController = __decorate([
    (0, common_2.Controller)('public/categories'),
    __metadata("design:paramtypes", [categories_service_1.CategoriesService])
], PublicCategoriesController);
//# sourceMappingURL=categories.controller.js.map