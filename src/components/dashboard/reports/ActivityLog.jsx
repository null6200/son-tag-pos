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

const ActivityLog = ({ user }) => {
  const data = [
    { date: '2025-10-03 10:05 AM', user: 'Jane Smith', action: 'Created Order #125' },
    { date: '2025-10-03 10:02 AM', user: 'John Doe', action: 'Opened Shift Register' },
    { date: '2025-10-02 08:00 PM', user: 'Admin', action: 'Added new product: "Beef Burger"' },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>System Activity Log</CardTitle>
          <Button variant="outline"><FileDown className="mr-2 h-4 w-4" /> Export</Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, index) => (
                <TableRow key={index}>
                  <TableCell>{row.date}</TableCell>
                  <TableCell>{row.user}</TableCell>
                  <TableCell>{row.action}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ActivityLog;