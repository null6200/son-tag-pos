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
exports.BranchesController = exports.PublicBranchesController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const permissions_guard_1 = require("../auth/permissions.guard");
const permissions_decorator_1 = require("../auth/permissions.decorator");
const branches_service_1 = require("./branches.service");
const common_2 = require("@nestjs/common");
class CreateBranchDto {
    name;
    location;
}
let PublicBranchesController = class PublicBranchesController {
    branchesService;
    constructor(branchesService) {
        this.branchesService = branchesService;
    }
    async listPublic() {
        const rows = await this.branchesService.findPublic();
        return rows.map((b) => ({ id: b.id, name: b.name }));
    }
};
exports.PublicBranchesController = PublicBranchesController;
__decorate([
    (0, common_1.Get)(),
    (0, common_2.Header)('Cache-Control', 'no-store'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PublicBranchesController.prototype, "listPublic", null);
exports.PublicBranchesController = PublicBranchesController = __decorate([
    (0, common_1.Controller)('public/branches'),
    __metadata("design:paramtypes", [branches_service_1.BranchesService])
], PublicBranchesController);
class UpdateBranchDto {
    name;
    location;
}
let BranchesController = class BranchesController {
    branchesService;
    constructor(branchesService) {
        this.branchesService = branchesService;
    }
    async list() {
        return this.branchesService.findAll();
    }
    async create(dto, req) {
        return this.branchesService.create(dto, req.user?.role);
    }
    async update(id, dto, req) {
        return this.branchesService.update(id, dto, req.user?.role);
    }
    async remove(id, req) {
        return this.branchesService.remove(id, req.user?.role);
    }
};
exports.BranchesController = BranchesController;
__decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Get)(),
    (0, permissions_decorator_1.Permissions)('view_branch_section'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BranchesController.prototype, "list", null);
__decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Post)(),
    (0, permissions_decorator_1.Permissions)('add_branch_section'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateBranchDto, Object]),
    __metadata("design:returntype", Promise)
], BranchesController.prototype, "create", null);
__decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Put)(':id'),
    (0, permissions_decorator_1.Permissions)('edit_branch_section'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, UpdateBranchDto, Object]),
    __metadata("design:returntype", Promise)
], BranchesController.prototype, "update", null);
__decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Delete)(':id'),
    (0, permissions_decorator_1.Permissions)('delete_branch_section'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], BranchesController.prototype, "remove", null);
exports.BranchesController = BranchesController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('branches'),
    __metadata("design:paramtypes", [branches_service_1.BranchesService])
], BranchesController);
//# sourceMappingURL=branches.controller.js.map