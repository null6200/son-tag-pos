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

const ItemsReport = ({ user }) => {
  const data = [
    { product: 'Espresso', sku: 'CF-001', category: 'Beverage', purchasePrice: 2.50, sellPrice: 5.00 },
    { product: 'Mojito', sku: 'CK-003', category: 'Cocktail', purchasePrice: 4.00, sellPrice: 12.00 },
    { product: 'Chicken Wings', sku: 'FD-002', category: 'Food', purchasePrice: 6.50, sellPrice: 12.00 },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>All Items List</CardTitle>
          <Button variant="outline"><FileDown className="mr-2 h-4 w-4" /> Export</Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Purchase Price</TableHead>
                <TableHead className="text-right">Selling Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, index) => (
                <TableRow key={index}>
                  <TableCell>{row.product}</TableCell>
                  <TableCell>{row.sku}</TableCell>
                  <TableCell>{row.category}</TableCell>
                  <TableCell className="text-right">${row.purchasePrice.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-bold">${row.sellPrice.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ItemsReport;