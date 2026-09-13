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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const SupplierCustomerReport = ({ user }) => {
  const suppliers = [
    { name: 'Coffee Co.', totalPurchase: 5500.00, paid: 5500.00, due: 0.00 },
    { name: 'Liquor World', totalPurchase: 3200.00, paid: 2000.00, due: 1200.00 },
  ];
  const customers = [
    { name: 'Jane Doe', totalSale: 1250.00, received: 1250.00, due: 0.00 },
    { name: 'John Smith', totalSale: 800.00, received: 500.00, due: 300.00 },
  ];

  return (
    <div className="space-y-6">
      <Tabs defaultValue="customers">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
          </TabsList>
          <Button variant="outline"><FileDown className="mr-2 h-4 w-4" /> Export</Button>
        </div>
        <TabsContent value="customers">
          <Card>
            <CardHeader><CardTitle>Customer Report</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer Name</TableHead>
                    <TableHead className="text-right">Total Sale</TableHead>
                    <TableHead className="text-right">Total Received</TableHead>
                    <TableHead className="text-right">Balance Due</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((c, i) => (
                    <TableRow key={i}>
                      <TableCell>{c.name}</TableCell>
                      <TableCell className="text-right">${c.totalSale.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-green-500">${c.received.toFixed(2)}</TableCell>
                      <TableCell className={`text-right font-bold ${c.due > 0 ? 'text-red-500' : ''}`}>${c.due.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="suppliers">
          <Card>
            <CardHeader><CardTitle>Supplier Report</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier Name</TableHead>
                    <TableHead className="text-right">Total Purchase</TableHead>
                    <TableHead className="text-right">Total Paid</TableHead>
                    <TableHead className="text-right">Balance Due</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.map((s, i) => (
                    <TableRow key={i}>
                      <TableCell>{s.name}</TableCell>
                      <TableCell className="text-right">${s.totalPurchase.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-green-500">${s.paid.toFixed(2)}</TableCell>
                      <TableCell className={`text-right font-bold ${s.due > 0 ? 'text-red-500' : ''}`}>${s.due.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SupplierCustomerReport;