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
exports.SectionsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const permissions_guard_1 = require("../auth/permissions.guard");
const permissions_decorator_1 = require("../auth/permissions.decorator");
const sections_service_1 = require("./sections.service");
const prisma_service_1 = require("../prisma/prisma.service");
let SectionsController = class SectionsController {
    sections;
    prisma;
    constructor(sections, prisma) {
        this.sections = sections;
        this.prisma = prisma;
    }
    async list(branchId, req) {
        const effectiveBranchId = branchId ?? req?.user?.branchId;
        if (!effectiveBranchId)
            throw new common_1.BadRequestException('branchId is required');
        return this.sections.listByBranch(String(effectiveBranchId));
    }
    async listAllowed(branchId, productTypeId, productTypeName, req) {
        const effectiveBranchId = branchId ?? req?.user?.branchId;
        if (!effectiveBranchId)
            throw new common_1.BadRequestException('branchId is required');
        let ptId = productTypeId || undefined;
        if (!ptId && productTypeName) {
            const pt = await this.prisma.productType.findFirst({ where: { branchId: String(effectiveBranchId), name: productTypeName } });
            ptId = pt?.id;
        }
        return this.sections.allowedForProductType(String(effectiveBranchId), ptId);
    }
    async create(dto, req) {
        return this.sections.create(dto, req.user?.role);
    }
    async update(id, dto, req) {
        return this.sections.update(id, dto, req.user?.role);
    }
    async remove(id, req) {
        return this.sections.remove(id, req.user?.role);
    }
};
exports.SectionsController = SectionsController;
__decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Get)(),
    (0, permissions_decorator_1.Permissions)('view_branch_section', 'stock_transfer', 'stock_adjustment'),
    __param(0, (0, common_1.Query)('branchId')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SectionsController.prototype, "list", null);
__decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Get)('allowed'),
    (0, permissions_decorator_1.Permissions)('view_branch_section', 'stock_transfer', 'stock_adjustment'),
    __param(0, (0, common_1.Query)('branchId')),
    __param(1, (0, common_1.Query)('productTypeId')),
    __param(2, (0, common_1.Query)('productTypeName')),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], SectionsController.prototype, "listAllowed", null);
__decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Post)(),
    (0, permissions_decorator_1.Permissions)('add_branch_section'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SectionsController.prototype, "create", null);
__decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Put)(':id'),
    (0, permissions_decorator_1.Permissions)('edit_branch_section'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], SectionsController.prototype, "update", null);
__decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Delete)(':id'),
    (0, permissions_decorator_1.Permissions)('delete_branch_section'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SectionsController.prototype, "remove", null);
exports.SectionsController = SectionsController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('sections'),
    __metadata("design:paramtypes", [sections_service_1.SectionsService, prisma_service_1.PrismaService])
], SectionsController);
//# sourceMappingURL=sections.controller.js.map