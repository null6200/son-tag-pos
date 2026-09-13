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

const StaffReport = ({ user }) => {
  const data = [
    { staff: 'John Doe', role: 'Manager', totalSales: 5200.00, orders: 85 },
    { staff: 'Jane Smith', role: 'Waiter', totalSales: 8300.50, orders: 150 },
    { staff: 'Peter Jones', role: 'Bartender', totalSales: 6100.00, orders: 120 },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Staff Performance</CardTitle>
          <Button variant="outline"><FileDown className="mr-2 h-4 w-4" /> Export</Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Total Sales Handled</TableHead>
                <TableHead className="text-right">Total Orders</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, index) => (
                <TableRow key={index}>
                  <TableCell>{row.staff}</TableCell>
                  <TableCell>{row.role}</TableCell>
                  <TableCell className="text-right font-bold">${row.totalSales.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{row.orders}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffReport;