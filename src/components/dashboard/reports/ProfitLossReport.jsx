import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DollarSign, TrendingUp, TrendingDown, FileDown } from 'lucide-react';

const ProfitLossReport = ({ user }) => {
  const data = {
    totalPurchase: 15230.50,
    totalSale: 28750.00,
    grossProfit: 13519.50,
    totalExpense: 4500.00,
    netProfit: 9019.50,
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4 items-end">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="date-range">Date Range</Label>
            <Input id="date-range" type="date" />
          </div>
          <Button>Apply Filters</Button>
          <Button variant="outline" className="ml-auto"><FileDown className="mr-2 h-4 w-4" /> Export</Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${data.totalSale.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Purchases</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${data.totalPurchase.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gross Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${data.grossProfit.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profit & Loss Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
              <span className="font-medium">Total Sales</span>
              <span className="font-bold text-green-500">+ ${data.totalSale.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
              <span className="font-medium">Total Purchases</span>
              <span className="font-bold text-red-500">- ${data.totalPurchase.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg border-t-2 border-b-2 border-gray-200 dark:border-gray-700">
              <span className="font-semibold text-lg">Gross Profit</span>
              <span className="font-extrabold text-lg text-green-600">${data.grossProfit.toFixed(2)}</span>
            </div>
             <div className="flex justify-between items-center p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
              <span className="font-medium">Total Expenses</span>
              <span className="font-bold text-red-500">- ${data.totalExpense.toFixed(2)}</span>
            </div>
             <div className="flex justify-between items-center p-4 rounded-lg bg-green-100 dark:bg-green-900/50 border-t-2 border-green-500">
              <span className="font-semibold text-xl">Net Profit</span>
              <span className="font-extrabold text-xl text-green-700 dark:text-green-400">${data.netProfit.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfitLossReport;