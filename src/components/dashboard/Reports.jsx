import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  PackagePlus,
  Flame,
  FileText,
  CreditCard,
  BookOpen,
  ClipboardList,
  Utensils,
  UserCheck,
  History,
  ArrowRight,
  TrendingDown,
  ArrowLeft,
  CalendarDays,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ReportViewer from '@/components/dashboard/reports/ReportViewer';
import ReportOverview from '@/components/dashboard/ReportOverview';
import ReportsPage from '@/components/dashboard/ReportsPage';
import { hasPermission } from '@/lib/permissions';

const reportCategories = [
  {
    title: 'Profit & Sales Reports',
    reports: [
      { id: 'profit-loss', name: 'Profit / Loss Report', icon: TrendingUp, description: 'Analyze gross and net profit margins.' },
      { id: 'purchase-sale', name: 'Purchase & Sale Report', icon: ShoppingCart, description: 'Compare buying and selling volumes.' },
      { id: 'product-sell', name: 'Product Sell Report', icon: BarChart3, description: 'Detailed breakdown of items sold.' },
      { id: 'trending-product', name: 'Trending Product Report', icon: Flame, description: 'Identify your most popular items.' },
    ],
  },
  {
    title: 'Stock & Inventory Reports',
    reports: [
      { id: 'stock', name: 'Stock Report', icon: Package, description: 'Current stock levels and valuation.' },
      { id: 'stock-adjustment', name: 'Stock Adjustment Report', icon: PackagePlus, description: 'Track all stock modifications.' },
      { id: 'items', name: 'Items Report', icon: FileText, description: 'Comprehensive list of all products.' },
      { id: 'product-purchase', name: 'Product Purchase Report', icon: TrendingDown, description: 'History of all purchased products.' },
    ],
  },
  {
    title: 'Payment & Expense Reports',
    reports: [
      { id: 'purchase-payment', name: 'Purchase Payment Report', icon: CreditCard, description: 'Track payments made to suppliers.' },
      { id: 'sell-payment', name: 'Sell Payment Report', icon: DollarSign, description: 'Consolidated report of all sales payments.' },
      { id: 'expense', name: 'Expense Report', icon: BookOpen, description: 'Log of all operational expenses.' },
    ],
  },
  {
    title: 'Staff & Customer Reports',
    reports: [
      { id: 'supplier-customer', name: 'Supplier & Customer Report', icon: Users, description: 'Manage supplier and customer data.' },
      { id: 'customer-group', name: 'Customer Group Report', icon: Users, description: 'Analyze sales by customer segments.' },
      { id: 'staff', name: 'Staff Report', icon: UserCheck, description: 'Overview of staff performance and activity.' },
      { id: 'shift-register', name: 'Shift Register Report', icon: ClipboardList, description: 'Detailed logs of all shifts.' },
      { id: 'leave', name: 'Leave Report', icon: CalendarDays, description: 'Summary of all staff leave.' },
    ],
  },
  {
    title: 'Operational Reports',
    reports: [
      { id: 'table', name: 'Table Report', icon: Utensils, description: 'Analyze table turnover and sales.' },
      { id: 'activity-log', name: 'Activity Log', icon: History, description: 'Chronological log of all system activities.' },
    ],
  },
];

const reportPermMap = {
  // Profit & Sales Reports
  'profit-loss': 'view_profit_loss_report',
  'purchase-sale': 'view_purchase_sell_report',
  'product-sell': 'view_product_performance_report',
  'trending-product': 'view_trending_product_report',
  // Stock & Inventory Reports
  'stock': 'view_stock_related_reports',
  'stock-adjustment': 'view_stock_related_reports',
  'items': 'view_product_stock_value',
  'product-purchase': 'view_purchase_detail_report',
  // Payment & Expense Reports
  'purchase-payment': 'view_purchase_detail_report',
  'sell-payment': 'view_payment_methods_report',
  'expense': 'view_expense_report',
  // Staff & Customer Reports
  'supplier-customer': 'view_supplier_customer_report',
  'customer-group': 'view_supplier_customer_report',
  'staff': 'view_sales_rep_report',
  'shift-register': 'view_register_report',
  'leave': 'view_daily_sales_summary',
  // Operational Reports
  'table': 'view_branch_sales_report',
  'activity-log': 'view_voids_report',
};

const ReportCard = ({ report, onSelect }) => {
  const Icon = report.icon;
  return (
    <motion.div
      whileHover={{ scale: 1.05, boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}
      className="cursor-pointer"
      onClick={() => onSelect(report)}
    >
      <Card className="glass-effect h-full flex flex-col">
        <CardHeader className="flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-semibold">{report.name}</CardTitle>
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white">
            <Icon className="w-5 h-5" />
          </div>
        </CardHeader>
        <CardContent className="flex-grow">
          <p className="text-sm text-muted-foreground">{report.description}</p>
        </CardContent>
        <div className="p-4 pt-0">
          <Button variant="ghost" className="w-full justify-start p-0 h-auto text-primary hover:text-primary">
            View Report <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </Card>
    </motion.div>
  );
};

const Reports = ({ user }) => {
  const [viewingReport, setViewingReport] = useState(null);
  const perms = Array.isArray(user?.permissions) ? user.permissions : [];

  return (
    <ReportsPage />
  );
};

export default Reports;