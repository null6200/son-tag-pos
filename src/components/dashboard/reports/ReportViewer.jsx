import React from 'react';
import { motion } from 'framer-motion';
import ProfitLossReport from '@/components/dashboard/reports/ProfitLossReport';
import PurchaseSaleReport from '@/components/dashboard/reports/PurchaseSaleReport';
import ProductSellReport from '@/components/dashboard/reports/ProductSellReport';
import TrendingProductReport from '@/components/dashboard/reports/TrendingProductReport';
import StockReport from '@/components/dashboard/reports/StockReport';
import StockAdjustmentReport from '@/components/dashboard/reports/StockAdjustmentReport';
import ItemsReport from '@/components/dashboard/reports/ItemsReport';
import ProductPurchaseReport from '@/components/dashboard/reports/ProductPurchaseReport';
import PurchasePaymentReport from '@/components/dashboard/reports/PurchasePaymentReport';
import SellPaymentReport from '@/components/dashboard/reports/SellPaymentReport';
import ExpenseReport from '@/components/dashboard/reports/ExpenseReport';
import SupplierCustomerReport from '@/components/dashboard/reports/SupplierCustomerReport';
import CustomerGroupReport from '@/components/dashboard/reports/CustomerGroupReport';
import StaffReport from '@/components/dashboard/reports/StaffReport';
import ShiftRegisterReport from '@/components/dashboard/reports/ShiftRegisterReport';
import TableReport from '@/components/dashboard/reports/TableReport';
import ActivityLog from '@/components/dashboard/reports/ActivityLog';
import LeaveReport from '@/components/dashboard/reports/LeaveReport';

const reportComponents = {
  'profit-loss': ProfitLossReport,
  'purchase-sale': PurchaseSaleReport,
  'product-sell': ProductSellReport,
  'trending-product': TrendingProductReport,
  'stock': StockReport,
  'stock-adjustment': StockAdjustmentReport,
  'items': ItemsReport,
  'product-purchase': ProductPurchaseReport,
  'purchase-payment': PurchasePaymentReport,
  'sell-payment': SellPaymentReport,
  'expense': ExpenseReport,
  'supplier-customer': SupplierCustomerReport,
  'customer-group': CustomerGroupReport,
  'staff': StaffReport,
  'shift-register': ShiftRegisterReport,
  'table': TableReport,
  'activity-log': ActivityLog,
  'leave': LeaveReport,
};

const ReportViewer = ({ report, user }) => {
  const SpecificReport = reportComponents[report.id];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold gradient-text mb-2">{report.name}</h2>
          <p className="text-muted-foreground">{report.description}</p>
        </div>
        {SpecificReport ? <SpecificReport user={user} /> : <p>Report not found.</p>}
      </div>
    </motion.div>
  );
};

export default ReportViewer;