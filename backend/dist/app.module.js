"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const core_1 = require("@nestjs/core");
const config_1 = require("@nestjs/config");
const serve_static_1 = require("@nestjs/serve-static");
const path_1 = require("path");
const fs_1 = require("fs");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const audit_controller_1 = require("./audit/audit.controller");
const audit_service_1 = require("./audit/audit.service");
const health_controller_1 = require("./health.controller");
const prisma_module_1 = require("./prisma/prisma.module");
const auth_module_1 = require("./auth/auth.module");
const users_module_1 = require("./users/users.module");
const branches_module_1 = require("./branches/branches.module");
const products_module_1 = require("./products/products.module");
const inventory_module_1 = require("./inventory/inventory.module");
const orders_module_1 = require("./orders/orders.module");
const sections_module_1 = require("./sections/sections.module");
const tables_module_1 = require("./tables/tables.module");
const pricing_module_1 = require("./pricing/pricing.module");
const reports_module_1 = require("./reports/reports.module");
const shifts_module_1 = require("./shifts/shifts.module");
const roles_module_1 = require("./roles/roles.module");
const permissions_guard_1 = require("./auth/permissions.guard");
const hrm_module_1 = require("./hrm/hrm.module");
const units_module_1 = require("./units/units.module");
const categories_module_1 = require("./categories/categories.module");
const brands_module_1 = require("./brands/brands.module");
const taxrates_module_1 = require("./taxrates/taxrates.module");
const suppliers_module_1 = require("./suppliers/suppliers.module");
const customers_module_1 = require("./customers/customers.module");
const purchases_module_1 = require("./purchases/purchases.module");
const section_functions_module_1 = require("./section-functions/section-functions.module");
const product_types_module_1 = require("./product-types/product-types.module");
const service_types_module_1 = require("./service-types/service-types.module");
const drafts_module_1 = require("./drafts/drafts.module");
const settings_module_1 = require("./settings/settings.module");
const subcategories_module_1 = require("./subcategories/subcategories.module");
const uploads_controller_1 = require("./uploads.controller");
const DIST_CANDIDATES = [
    (0, path_1.resolve)(__dirname, '..', '..', 'dist'),
    (0, path_1.resolve)(process.cwd(), 'dist'),
    (0, path_1.resolve)(process.cwd(), '..', 'dist'),
    (0, path_1.resolve)(__dirname, '..', '..', '..', 'dist'),
];
const STATIC_ROOT = DIST_CANDIDATES.find((p) => (0, fs_1.existsSync)(p)) || '';
const STATIC_MODULES = [
    serve_static_1.ServeStaticModule.forRoot({
        rootPath: (0, path_1.resolve)(process.cwd(), 'uploads'),
        serveRoot: '/uploads',
    }),
];
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            throttler_1.ThrottlerModule.forRoot([
                {
                    ttl: 60,
                    limit: 60,
                },
            ]),
            ...STATIC_MODULES,
            prisma_module_1.PrismaModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            branches_module_1.BranchesModule,
            products_module_1.ProductsModule,
            inventory_module_1.InventoryModule,
            orders_module_1.OrdersModule,
            sections_module_1.SectionsModule,
            tables_module_1.TablesModule,
            pricing_module_1.PricingModule,
            reports_module_1.ReportsModule,
            shifts_module_1.ShiftsModule,
            roles_module_1.RolesModule,
            hrm_module_1.HrmModule,
            units_module_1.UnitsModule,
            categories_module_1.CategoriesModule,
            brands_module_1.BrandsModule,
            taxrates_module_1.TaxRatesModule,
            suppliers_module_1.SuppliersModule,
            customers_module_1.CustomersModule,
            purchases_module_1.PurchasesModule,
            section_functions_module_1.SectionFunctionsModule,
            product_types_module_1.ProductTypesModule,
            service_types_module_1.ServiceTypesModule,
            drafts_module_1.DraftsModule,
            settings_module_1.SettingsModule,
            subcategories_module_1.SubcategoriesModule,
        ],
        controllers: [app_controller_1.AppController, health_controller_1.HealthController, audit_controller_1.AuditController, uploads_controller_1.UploadsController],
        providers: [
            app_service_1.AppService,
            permissions_guard_1.PermissionsGuard,
            audit_service_1.AuditService,
            { provide: core_1.APP_GUARD, useClass: throttler_1.ThrottlerGuard },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map