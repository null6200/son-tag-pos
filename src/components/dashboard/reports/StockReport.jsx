import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const StockReport = ({ user }) => {
  const data = [
    { product: 'Espresso Beans', sku: 'ING-001', category: 'Coffee', currentStock: '25 kg', unitPrice: 30.00, stockValue: 750.00 },
    { product: 'Rum', sku: 'LIQ-005', category: 'Liquor', currentStock: '12 L', unitPrice: 25.00, stockValue: 300.00 },
    { product: 'Chicken Wings (Frozen)', sku: 'FD-002-FR', category: 'Food', currentStock: '50 kg', unitPrice: 8.00, stockValue: 400.00 },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Current Stock Levels</CardTitle>
          <Button variant="outline"><FileDown className="mr-2 h-4 w-4" /> Export</Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Current Stock</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Stock Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, index) => (
                <TableRow key={index}>
                  <TableCell>{row.product}</TableCell>
                  <TableCell>{row.sku}</TableCell>
                  <TableCell>{row.category}</TableCell>
                  <TableCell>{row.currentStock}</TableCell>
                  <TableCell className="text-right">${row.unitPrice.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-bold">${row.stockValue.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default StockReport;