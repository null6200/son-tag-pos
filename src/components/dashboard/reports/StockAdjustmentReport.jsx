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

const StockAdjustmentReport = ({ user }) => {
  const data = [
    { date: '2025-10-02', ref: 'ADJ-001', product: 'Rum', qty: '-1 L', reason: 'Wastage' },
    { date: '2025-10-01', ref: 'ADJ-002', product: 'Espresso Beans', qty: '+2 kg', reason: 'Stock Count Correction' },
  ];

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
          <CardTitle>Stock Adjustment History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Reference No.</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, index) => (
                <TableRow key={index}>
                  <TableCell>{row.date}</TableCell>
                  <TableCell>{row.ref}</TableCell>
                  <TableCell>{row.product}</TableCell>
                  <TableCell className={row.qty.startsWith('+') ? 'text-green-500' : 'text-red-500'}>{row.qty}</TableCell>
                  <TableCell>{row.reason}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default StockAdjustmentReport;