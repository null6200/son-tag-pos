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
exports.DraftsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const permissions_guard_1 = require("../auth/permissions.guard");
const permissions_decorator_1 = require("../auth/permissions.decorator");
const drafts_service_1 = require("./drafts.service");
let DraftsController = class DraftsController {
    drafts;
    constructor(drafts) {
        this.drafts = drafts;
    }
    async list(branchId, sectionId, page, pageSize, req) {
        const p = page ? parseInt(page, 10) : 1;
        const ps = pageSize ? parseInt(pageSize, 10) : 20;
        const role = req?.user?.role;
        let userId = req?.user?.userId;
        let perms = Array.isArray(req?.user?.permissions) ? req.user.permissions : [];
        if (role === 'ADMIN') {
            userId = undefined;
            perms = [...new Set([...(perms || []), 'all'])];
        }
        return this.drafts.list(branchId, sectionId, p, ps, userId, perms);
    }
    async get(id) {
        return this.drafts.get(id);
    }
    async create(body, _req) {
        return this.drafts.create(body);
    }
    async update(id, body) {
        return this.drafts.update(id, body);
    }
    async remove(id) {
        return this.drafts.remove(id);
    }
};
exports.DraftsController = DraftsController;
__decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Get)(),
    (0, permissions_decorator_1.Permissions)('view_pos_sell'),
    __param(0, (0, common_1.Query)('branchId')),
    __param(1, (0, common_1.Query)('sectionId')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('pageSize')),
    __param(4, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, Object]),
    __metadata("design:returntype", Promise)
], DraftsController.prototype, "list", null);
__decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Get)(':id'),
    (0, permissions_decorator_1.Permissions)('view_pos_sell'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DraftsController.prototype, "get", null);
__decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Post)(),
    (0, permissions_decorator_1.Permissions)('view_pos_sell', 'edit_pos_sell', 'add_pos_sell', 'view_drafts_all'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], DraftsController.prototype, "create", null);
__decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Put)(':id'),
    (0, permissions_decorator_1.Permissions)('view_pos_sell', 'edit_pos_sell', 'add_pos_sell', 'view_drafts_all'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DraftsController.prototype, "update", null);
__decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Delete)(':id'),
    (0, permissions_decorator_1.Permissions)('delete_pos_sell', 'view_drafts_all', 'view_pos_sell', 'add_pos_sell', 'edit_pos_sell'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DraftsController.prototype, "remove", null);
exports.DraftsController = DraftsController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('drafts'),
    __metadata("design:paramtypes", [drafts_service_1.DraftsService])
], DraftsController);
//# sourceMappingURL=drafts.controller.js.map