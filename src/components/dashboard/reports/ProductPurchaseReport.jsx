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

const ProductPurchaseReport = ({ user }) => {
  const data = [
    { date: '2025-09-28', product: 'Espresso Beans', supplier: 'Coffee Co.', qty: '50 kg', total: 1500.00 },
    { date: '2025-09-29', product: 'Rum', supplier: 'Liquor World', qty: '24 L', total: 600.00 },
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
          <CardTitle>Product Purchase History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead className="text-right">Total Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, index) => (
                <TableRow key={index}>
                  <TableCell>{row.date}</TableCell>
                  <TableCell>{row.product}</TableCell>
                  <TableCell>{row.supplier}</TableCell>
                  <TableCell>{row.qty}</TableCell>
                  <TableCell className="text-right font-bold">${row.total.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductPurchaseReport;