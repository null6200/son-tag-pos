import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join, resolve } from 'path';
import { existsSync } from 'fs';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuditController } from './audit/audit.controller';
import { AuditService } from './audit/audit.service';
import { HealthController } from './health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { BranchesModule } from './branches/branches.module';
import { ProductsModule } from './products/products.module';
import { InventoryModule } from './inventory/inventory.module';
import { OrdersModule } from './orders/orders.module';
import { SectionsModule } from './sections/sections.module';
import { TablesModule } from './tables/tables.module';
import { PricingModule } from './pricing/pricing.module';
import { ReportsModule } from './reports/reports.module';
import { ShiftsModule } from './shifts/shifts.module';
import { RolesModule } from './roles/roles.module';
import { PermissionsGuard } from './auth/permissions.guard';
import { HrmModule } from './hrm/hrm.module';
import { UnitsModule } from './units/units.module';
import { CategoriesModule } from './categories/categories.module';
import { BrandsModule } from './brands/brands.module';
import { TaxRatesModule } from './taxrates/taxrates.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { CustomersModule } from './customers/customers.module';
import { PurchasesModule } from './purchases/purchases.module';
import { SectionFunctionsModule } from './section-functions/section-functions.module';
import { ProductTypesModule } from './product-types/product-types.module';
import { ServiceTypesModule } from './service-types/service-types.module';
import { DraftsModule } from './drafts/drafts.module';
import { SettingsModule } from './settings/settings.module';
import { SubcategoriesModule } from './subcategories/subcategories.module';
import { UploadsController } from './uploads.controller';

// Resolve the frontend dist folder at the project root in both dev and prod
// Support multiple launch contexts: from project root, from backend/, and from backend/dist
const DIST_CANDIDATES = [
  resolve(__dirname, '..', '..', 'dist'),         // project-root/dist when __dirname is backend/dist
  resolve(process.cwd(), 'dist'),                 // if cwd is project root
  resolve(process.cwd(), '..', 'dist'),           // if cwd is backend/
  resolve(__dirname, '..', '..', '..', 'dist'),   // extra fallback
];
const STATIC_ROOT = DIST_CANDIDATES.find((p) => existsSync(p)) || '';
// Only serve uploaded files (frontend is served by Vite dev server in dev)
const STATIC_MODULES = [
  ServeStaticModule.forRoot({
    rootPath: resolve(process.cwd(), 'uploads'),
    serveRoot: '/uploads',
  }),
];

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        ttl: 60,
        limit: 60,
      },
    ]),
    ...STATIC_MODULES,
    PrismaModule,
    AuthModule,
    UsersModule,
    BranchesModule,
    ProductsModule,
    InventoryModule,
    OrdersModule,
    SectionsModule,
    TablesModule,
    PricingModule,
    ReportsModule,
    ShiftsModule,
    RolesModule,
    HrmModule,
    UnitsModule,
    CategoriesModule,
    BrandsModule,
    TaxRatesModule,
    SuppliersModule,
    CustomersModule,
    PurchasesModule,
    SectionFunctionsModule,
    ProductTypesModule,
    ServiceTypesModule,
    DraftsModule,
    SettingsModule,
    SubcategoriesModule,
  ],
  controllers: [AppController, HealthController, AuditController, UploadsController],
  providers: [
    AppService,
    PermissionsGuard,
    AuditService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
