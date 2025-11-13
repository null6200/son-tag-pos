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
exports.ReportsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const permissions_guard_1 = require("../auth/permissions.guard");
const permissions_decorator_1 = require("../auth/permissions.decorator");
const reports_service_1 = require("./reports.service");
let ReportsController = class ReportsController {
    reports;
    constructor(reports) {
        this.reports = reports;
    }
    async list(type, branchId, from, to, limit, offset) {
        const lim = Math.max(0, parseInt(String(limit ?? '10')) || 10);
        const off = Math.max(0, parseInt(String(offset ?? '0')) || 0);
        switch ((type || '').toLowerCase()) {
            case 'inventory':
                return this.reports.listInventory({ branchId, from, to, limit: lim, offset: off });
            case 'staff':
                return this.reports.listStaff({ branchId, from, to, limit: lim, offset: off });
            case 'cash_movements':
                return this.reports.listCashMovements({ branchId, from, to, limit: lim, offset: off });
            case 'table':
            case 'discounts':
            default:
                return { items: [], total: 0 };
        }
    }
    async inventory(branchId, from, to, limit, offset) {
        const lim = Math.max(0, parseInt(String(limit ?? '10')) || 10);
        const off = Math.max(0, parseInt(String(offset ?? '0')) || 0);
        return this.reports.listInventory({ branchId, from, to, limit: lim, offset: off });
    }
    async overview(branchId, from, to) {
        return this.reports.overview({ branchId, from, to });
    }
    async exportOrders(branchId, from, to) {
        const { filename, csv } = await this.reports.exportOrdersCsv({ branchId, from, to });
        return {
            filename,
            contentType: 'text/csv',
            data: csv,
        };
    }
    async sales(branchId, from, to) {
        return this.reports.sales({ branchId, from, to });
    }
    async shift(shiftId, branchId, sectionId) {
        return this.reports.shiftReport({ shiftId, branchId, sectionId });
    }
    async purchaseSell(q) { return { ok: true, type: 'purchase_sell', q }; }
    async tax(q) { return { ok: true, type: 'tax', q }; }
    async supplierCustomer(q) { return { ok: true, type: 'supplier_customer', q }; }
    async expense(q) { return { ok: true, type: 'expense', q }; }
    async profitLoss(q) { return { ok: true, type: 'profit_loss', q }; }
    async stock(q) { return { ok: true, type: 'stock', q }; }
    async trending(q) { return { ok: true, type: 'trending_products', q }; }
    async register(q) { return { ok: true, type: 'register', q }; }
    async salesRep(q) { return { ok: true, type: 'sales_rep', q }; }
    async productStockValue(q) { return { ok: true, type: 'product_stock_value', q }; }
    async sectionSales(q) { return { ok: true, type: 'section_sales', q }; }
    async categorySales(q) { return { ok: true, type: 'category_sales', q }; }
    async productPerformance(q) { return { ok: true, type: 'product_performance', q }; }
    async returns(q) { return { ok: true, type: 'returns', q }; }
    async discounts(q) { return { ok: true, type: 'discounts', q }; }
    async voids(q) { return { ok: true, type: 'voids', q }; }
    async paymentMethods(q) { return { ok: true, type: 'payment_methods', q }; }
    async cashInOut(q) { return { ok: true, type: 'cash_in_out', q }; }
    async customerAging(q) { return { ok: true, type: 'customer_aging', q }; }
    async supplierAging(q) { return { ok: true, type: 'supplier_aging', q }; }
    async purchaseDetail(q) { return { ok: true, type: 'purchase_detail', q }; }
    async stockMovement(q) { return { ok: true, type: 'stock_movement', q }; }
};
exports.ReportsController = ReportsController;
__decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('type')),
    __param(1, (0, common_1.Query)('branchId')),
    __param(2, (0, common_1.Query)('from')),
    __param(3, (0, common_1.Query)('to')),
    __param(4, (0, common_1.Query)('limit')),
    __param(5, (0, common_1.Query)('offset')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "list", null);
__decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Get)('inventory'),
    __param(0, (0, common_1.Query)('branchId')),
    __param(1, (0, common_1.Query)('from')),
    __param(2, (0, common_1.Query)('to')),
    __param(3, (0, common_1.Query)('limit')),
    __param(4, (0, common_1.Query)('offset')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "inventory", null);
__decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Get)('overview'),
    (0, permissions_decorator_1.Permissions)('view_daily_sales_summary'),
    __param(0, (0, common_1.Query)('branchId')),
    __param(1, (0, common_1.Query)('from')),
    __param(2, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "overview", null);
__decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Get)('export-orders'),
    (0, permissions_decorator_1.Permissions)('view_daily_sales_summary'),
    __param(0, (0, common_1.Query)('branchId')),
    __param(1, (0, common_1.Query)('from')),
    __param(2, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "exportOrders", null);
__decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Get)('sales'),
    (0, permissions_decorator_1.Permissions)('view_branch_sales_report'),
    __param(0, (0, common_1.Query)('branchId')),
    __param(1, (0, common_1.Query)('from')),
    __param(2, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "sales", null);
__decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Get)('shift'),
    (0, permissions_decorator_1.Permissions)('view_register_report'),
    __param(0, (0, common_1.Query)('shiftId')),
    __param(1, (0, common_1.Query)('branchId')),
    __param(2, (0, common_1.Query)('sectionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "shift", null);
__decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Get)('purchase-sell'),
    (0, permissions_decorator_1.Permissions)('view_purchase_sell_report'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "purchaseSell", null);
__decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Get)('tax'),
    (0, permissions_decorator_1.Permissions)('view_tax_report'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "tax", null);
__decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Get)('supplier-customer'),
    (0, permissions_decorator_1.Permissions)('view_supplier_customer_report'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "supplierCustomer", null);
__decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Get)('expense'),
    (0, permissions_decorator_1.Permissions)('view_expense_report'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "expense", null);
__decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Get)('profit-loss'),
    (0, permissions_decorator_1.Permissions)('view_profit_loss_report'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "profitLoss", null);
__decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Get)('stock'),
    (0, permissions_decorator_1.Permissions)('view_stock_related_reports'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "stock", null);
__decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Get)('trending-products'),
    (0, permissions_decorator_1.Permissions)('view_trending_product_report'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "trending", null);
__decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Get)('register'),
    (0, permissions_decorator_1.Permissions)('view_register_report'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "register", null);
__decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Get)('sales-rep'),
    (0, permissions_decorator_1.Permissions)('view_sales_rep_report'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "salesRep", null);
__decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Get)('product-stock-value'),
    (0, permissions_decorator_1.Permissions)('view_product_stock_value'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "productStockValue", null);
__decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Get)('section-sales'),
    (0, permissions_decorator_1.Permissions)('view_section_sales_report'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "sectionSales", null);
__decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Get)('category-sales'),
    (0, permissions_decorator_1.Permissions)('view_category_sales_report'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "categorySales", null);
__decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Get)('product-performance'),
    (0, permissions_decorator_1.Permissions)('view_product_performance_report'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "productPerformance", null);
__decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Get)('returns'),
    (0, permissions_decorator_1.Permissions)('view_returns_report'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "returns", null);
__decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Get)('discounts'),
    (0, permissions_decorator_1.Permissions)('view_discounts_report'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "discounts", null);
__decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Get)('voids'),
    (0, permissions_decorator_1.Permissions)('view_voids_report'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "voids", null);
__decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Get)('payment-methods'),
    (0, permissions_decorator_1.Permissions)('view_payment_methods_report'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "paymentMethods", null);
__decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Get)('cash-in-out'),
    (0, permissions_decorator_1.Permissions)('view_cash_in_out_report'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "cashInOut", null);
__decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Get)('customer-aging'),
    (0, permissions_decorator_1.Permissions)('view_customer_aging_report'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "customerAging", null);
__decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Get)('supplier-aging'),
    (0, permissions_decorator_1.Permissions)('view_supplier_aging_report'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "supplierAging", null);
__decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Get)('purchase-detail'),
    (0, permissions_decorator_1.Permissions)('view_purchase_detail_report'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "purchaseDetail", null);
__decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Get)('stock-movement'),
    (0, permissions_decorator_1.Permissions)('view_stock_movement_report'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "stockMovement", null);
exports.ReportsController = ReportsController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('reports'),
    __metadata("design:paramtypes", [reports_service_1.ReportsService])
], ReportsController);
//# sourceMappingURL=reports.controller.js.map