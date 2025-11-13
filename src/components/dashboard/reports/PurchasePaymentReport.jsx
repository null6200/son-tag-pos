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

const PurchasePaymentReport = ({ user }) => {
  const data = [
    { date: '2025-09-28', ref: 'PO-001', supplier: 'Coffee Co.', amount: 1500.00, status: 'Paid' },
    { date: '2025-09-29', ref: 'PO-002', supplier: 'Liquor World', amount: 600.00, status: 'Paid' },
    { date: '2025-10-01', ref: 'PO-003', supplier: 'Fresh Foods Inc.', amount: 850.00, status: 'Due' },
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
          <CardTitle>Purchase Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Purchase Ref.</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, index) => (
                <TableRow key={index}>
                  <TableCell>{row.date}</TableCell>
                  <TableCell>{row.ref}</TableCell>
                  <TableCell>{row.supplier}</TableCell>
                  <TableCell className="text-right font-bold">${row.amount.toFixed(2)}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${row.status === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {row.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default PurchasePaymentReport;