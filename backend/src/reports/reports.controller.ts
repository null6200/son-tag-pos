import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { ReportsService } from './reports.service';

@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  // Generic list endpoint used by the frontend with type query param
  @UseGuards(PermissionsGuard)
  @Get()
  async list(
    @Query('type') type?: string,
    @Query('branchId') branchId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
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
        // Return an empty, well-formed payload for not-yet-implemented types to avoid 500s
        return { items: [], total: 0 };
    }
  }

  // Explicit inventory route used by frontend
  @UseGuards(PermissionsGuard)
  @Get('inventory')
  async inventory(
    @Query('branchId') branchId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const lim = Math.max(0, parseInt(String(limit ?? '10')) || 10);
    const off = Math.max(0, parseInt(String(offset ?? '0')) || 0);
    return this.reports.listInventory({ branchId, from, to, limit: lim, offset: off });
  }

  @UseGuards(PermissionsGuard)
  @Get('overview')
  @Permissions('view_daily_sales_summary')
  async overview(
    @Query('branchId') branchId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reports.overview({ branchId, from, to });
  }

  @UseGuards(PermissionsGuard)
  @Get('export-orders')
  @Permissions('view_daily_sales_summary')
  async exportOrders(
    @Query('branchId') branchId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const { filename, csv } = await this.reports.exportOrdersCsv({ branchId, from, to });
    // Nest will serialize as JSON by default; we return an object with headers for the framework to set.
    // If your framework requires manual header setting, consider switching to @Res()
    return {
      filename,
      contentType: 'text/csv',
      data: csv,
    } as any;
  }

  @UseGuards(PermissionsGuard)
  @Get('sales')
  @Permissions('view_branch_sales_report')
  async sales(
    @Query('branchId') branchId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reports.sales({ branchId, from, to });
  }

  // Z-Report for a specific shift or current shift (by branch/section)
  @UseGuards(PermissionsGuard)
  @Get('shift')
  @Permissions('view_register_report')
  async shift(
    @Query('shiftId') shiftId?: string,
    @Query('branchId') branchId?: string,
    @Query('sectionId') sectionId?: string,
  ) {
    return this.reports.shiftReport({ shiftId, branchId, sectionId });
  }

  // Additional report endpoints (placeholders) guarded by granular permissions
  @UseGuards(PermissionsGuard)
  @Get('purchase-sell')
  @Permissions('view_purchase_sell_report')
  async purchaseSell(@Query() q: any) { return { ok: true, type: 'purchase_sell', q }; }

  @UseGuards(PermissionsGuard)
  @Get('tax')
  @Permissions('view_tax_report')
  async tax(@Query() q: any) { return { ok: true, type: 'tax', q }; }

  @UseGuards(PermissionsGuard)
  @Get('supplier-customer')
  @Permissions('view_supplier_customer_report')
  async supplierCustomer(@Query() q: any) { return { ok: true, type: 'supplier_customer', q }; }

  @UseGuards(PermissionsGuard)
  @Get('expense')
  @Permissions('view_expense_report')
  async expense(@Query() q: any) { return { ok: true, type: 'expense', q }; }

  @UseGuards(PermissionsGuard)
  @Get('profit-loss')
  @Permissions('view_profit_loss_report')
  async profitLoss(@Query() q: any) { return { ok: true, type: 'profit_loss', q }; }

  @UseGuards(PermissionsGuard)
  @Get('stock')
  @Permissions('view_stock_related_reports')
  async stock(@Query() q: any) { return { ok: true, type: 'stock', q }; }

  @UseGuards(PermissionsGuard)
  @Get('trending-products')
  @Permissions('view_trending_product_report')
  async trending(@Query() q: any) { return { ok: true, type: 'trending_products', q }; }

  @UseGuards(PermissionsGuard)
  @Get('register')
  @Permissions('view_register_report')
  async register(@Query() q: any) { return { ok: true, type: 'register', q }; }

  @UseGuards(PermissionsGuard)
  @Get('sales-rep')
  @Permissions('view_sales_rep_report')
  async salesRep(@Query() q: any) { return { ok: true, type: 'sales_rep', q }; }

  @UseGuards(PermissionsGuard)
  @Get('product-stock-value')
  @Permissions('view_product_stock_value')
  async productStockValue(@Query() q: any) { return { ok: true, type: 'product_stock_value', q }; }

  @UseGuards(PermissionsGuard)
  @Get('section-sales')
  @Permissions('view_section_sales_report')
  async sectionSales(@Query() q: any) { return { ok: true, type: 'section_sales', q }; }

  @UseGuards(PermissionsGuard)
  @Get('category-sales')
  @Permissions('view_category_sales_report')
  async categorySales(@Query() q: any) { return { ok: true, type: 'category_sales', q }; }

  @UseGuards(PermissionsGuard)
  @Get('product-performance')
  @Permissions('view_product_performance_report')
  async productPerformance(@Query() q: any) { return { ok: true, type: 'product_performance', q }; }

  @UseGuards(PermissionsGuard)
  @Get('returns')
  @Permissions('view_returns_report')
  async returns(@Query() q: any) { return { ok: true, type: 'returns', q }; }

  @UseGuards(PermissionsGuard)
  @Get('discounts')
  @Permissions('view_discounts_report')
  async discounts(@Query() q: any) { return { ok: true, type: 'discounts', q }; }

  @UseGuards(PermissionsGuard)
  @Get('voids')
  @Permissions('view_voids_report')
  async voids(@Query() q: any) { return { ok: true, type: 'voids', q }; }

  @UseGuards(PermissionsGuard)
  @Get('payment-methods')
  @Permissions('view_payment_methods_report')
  async paymentMethods(@Query() q: any) { return { ok: true, type: 'payment_methods', q }; }

  @UseGuards(PermissionsGuard)
  @Get('cash-in-out')
  @Permissions('view_cash_in_out_report')
  async cashInOut(@Query() q: any) { return { ok: true, type: 'cash_in_out', q }; }

  @UseGuards(PermissionsGuard)
  @Get('customer-aging')
  @Permissions('view_customer_aging_report')
  async customerAging(@Query() q: any) { return { ok: true, type: 'customer_aging', q }; }

  @UseGuards(PermissionsGuard)
  @Get('supplier-aging')
  @Permissions('view_supplier_aging_report')
  async supplierAging(@Query() q: any) { return { ok: true, type: 'supplier_aging', q }; }

  @UseGuards(PermissionsGuard)
  @Get('purchase-detail')
  @Permissions('view_purchase_detail_report')
  async purchaseDetail(@Query() q: any) { return { ok: true, type: 'purchase_detail', q }; }

  @UseGuards(PermissionsGuard)
  @Get('stock-movement')
  @Permissions('view_stock_movement_report')
  async stockMovement(@Query() q: any) { return { ok: true, type: 'stock_movement', q }; }
}
