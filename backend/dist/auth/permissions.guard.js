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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionsGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const permissions_decorator_1 = require("./permissions.decorator");
const prisma_service_1 = require("../prisma/prisma.service");
let PermissionsGuard = class PermissionsGuard {
    reflector;
    prisma;
    constructor(reflector, prisma) {
        this.reflector = reflector;
        this.prisma = prisma;
    }
    expandPermissions(perms) {
        const base = new Set(Array.isArray(perms) ? perms.map(p => String(p)) : []);
        const has = (p) => base.has(p);
        if (has('inventory') || has('inventory_manage') || has('inventory_management')) {
            base.add('stock_adjustment');
            base.add('stock_transfer');
            base.add('view_product');
            base.add('add_product');
            base.add('edit_product');
            base.add('delete_product');
            base.add('view_branch_section');
            base.add('view_category');
            base.add('view_subcategory');
            base.add('view_brand');
            base.add('view_product_type');
            base.add('view_section_function');
            base.add('view_settings');
        }
        if (has('product') || has('product_manage') || has('product_management')) {
            base.add('view_product');
            base.add('add_product');
            base.add('edit_product');
            base.add('delete_product');
            base.add('view_category');
            base.add('view_subcategory');
            base.add('view_brand');
            base.add('view_product_type');
            base.add('view_branch_section');
        }
        if (has('add_product') || has('edit_product')) {
            base.add('view_product');
            base.add('view_category');
            base.add('view_subcategory');
            base.add('view_brand');
            base.add('view_product_type');
            base.add('view_branch_section');
        }
        if (has('settings') || has('edit_settings') || has('settings_manage')) {
            base.add('edit_settings');
        }
        if (has('pos_sell') || has('sell') || has('sales')) {
            base.add('view_pos_sell');
            base.add('add_pos_sell');
            base.add('edit_pos_sell');
            base.add('delete_pos_sell');
        }
        const wildcards = Array.from(base).filter(p => p.endsWith('.*'));
        for (const wc of wildcards) {
            const prefix = wc.slice(0, -2);
            if (prefix === 'inventory') {
                base.add('stock_adjustment');
                base.add('stock_transfer');
                base.add('view_branch_section');
            }
            if (prefix === 'product' || prefix === 'products') {
                base.add('view_product');
                base.add('add_product');
                base.add('edit_product');
                base.add('delete_product');
                base.add('view_category');
                base.add('view_subcategory');
                base.add('view_brand');
                base.add('view_product_type');
                base.add('view_branch_section');
            }
            if (prefix === 'pos' || prefix === 'sell') {
                base.add('view_pos_sell');
                base.add('add_pos_sell');
                base.add('edit_pos_sell');
                base.add('delete_pos_sell');
            }
        }
        return Array.from(base);
    }
    async canActivate(context) {
        const required = this.reflector.getAllAndOverride(permissions_decorator_1.PERMISSIONS_KEY, [
            context.getHandler(),
            context.getClass(),
        ]) || [];
        if (required.length === 0)
            return true;
        const req = context.switchToHttp().getRequest();
        const user = req.user;
        const roleEnum = user?.role || user?.user_metadata?.role;
        if (roleEnum === 'ADMIN')
            return true;
        if (!user)
            throw new common_1.ForbiddenException('Unauthorized');
        let perms = user?.permissions || user?.user_metadata?.permissions || [];
        if ((!perms || perms.length === 0) && (user?.userId || user?.sub || user?.id)) {
            const uid = String(user.userId || user.sub || user.id);
            try {
                const u = await this.prisma.user.findUnique({ where: { id: uid }, include: { appRole: true } });
                if (u) {
                    if (u.role === 'ADMIN')
                        return true;
                    perms = Array.isArray(u.appRole?.permissions) ? u.appRole.permissions : [];
                    try {
                        req.user.permissions = perms;
                    }
                    catch { }
                }
            }
            catch { }
        }
        perms = this.expandPermissions(perms);
        const ok = required.some(r => (perms || []).includes('all') || (perms || []).includes(r));
        if (!ok)
            throw new common_1.ForbiddenException('Insufficient permissions');
        return true;
    }
};
exports.PermissionsGuard = PermissionsGuard;
exports.PermissionsGuard = PermissionsGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector, prisma_service_1.PrismaService])
], PermissionsGuard);
//# sourceMappingURL=permissions.guard.js.map