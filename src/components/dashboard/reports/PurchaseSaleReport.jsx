import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileDown } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const PurchaseSaleReport = ({ user }) => {
  const data = [
    { date: '2025-10-01', purchase: 1200.00, sale: 2500.00, profit: 1300.00 },
    { date: '2025-10-02', purchase: 1500.50, sale: 3200.00, profit: 1699.50 },
    { date: '2025-10-03', purchase: 950.00, sale: 1800.50, profit: 850.50 },
  ];

  const totals = data.reduce((acc, curr) => ({
    purchase: acc.purchase + curr.purchase,
    sale: acc.sale + curr.sale,
    profit: acc.profit + curr.profit,
  }), { purchase: 0, sale: 0, profit: 0 });

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

      <Card>
        <CardHeader>
          <CardTitle>Purchase & Sale Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Total Purchase</TableHead>
                <TableHead className="text-right">Total Sale</TableHead>
                <TableHead className="text-right">Profit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, index) => (
                <TableRow key={index}>
                  <TableCell>{row.date}</TableCell>
                  <TableCell className="text-right text-red-500">${row.purchase.toFixed(2)}</TableCell>
                  <TableCell className="text-right text-green-500">${row.sale.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-bold">${row.profit.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableRow className="font-bold bg-gray-100 dark:bg-gray-800">
              <TableCell>Total</TableCell>
              <TableCell className="text-right text-red-600">${totals.purchase.toFixed(2)}</TableCell>
              <TableCell className="text-right text-green-600">${totals.sale.toFixed(2)}</TableCell>
              <TableCell className="text-right">${totals.profit.toFixed(2)}</TableCell>
            </TableRow>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default PurchaseSaleReport;