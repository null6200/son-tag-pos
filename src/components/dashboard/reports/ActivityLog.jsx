import React, { useEffect, useState } from 'react';
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
import { api } from '@/lib/api';

const ActivityLog = ({ user }) => {
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const res = await api.reports.list({
          type: 'activity_log',
          branchId: user?.branchId || undefined,
          limit: 200,
          offset: 0,
        });
        const items = Array.isArray(res?.items) ? res.items : [];
        setRows(items);
      } catch (_) {
        setRows([]);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [user?.branchId]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Activity Log</CardTitle>
          <Button variant="outline"><FileDown className="mr-2 h-4 w-4" /> Export</Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Subject Type</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                    Loading activity...
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                    No activity recorded.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{log.date ? new Date(log.date).toLocaleString() : ''}</TableCell>
                  <TableCell>{log.userName || 'Unknown'}</TableCell>
                  <TableCell>{log.subjectType || '-'}</TableCell>
                  <TableCell>{log.action}</TableCell>
                  <TableCell className="whitespace-pre-wrap max-w-xl">{log.note || ''}</TableCell>
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