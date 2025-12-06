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
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const res = await api.reports.list({
          type: 'activity_log',
          branchId: user?.branchId || undefined,
          page,
          pageSize,
        });
        const items = Array.isArray(res?.items) ? res.items : [];
        setRows(items);
        setTotal(typeof res?.total === 'number' ? res.total : items.length);
      } catch (_) {
        setRows([]);
        setTotal(0);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [user?.branchId, page]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Activity Log</CardTitle>
          <Button variant="outline"><FileDown className="mr-2 h-4 w-4" /> Export</Button>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md overflow-y-auto max-h-[520px]">
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
          </div>

          {(() => {
            const totalPages = Math.max(1, Math.ceil(total / pageSize));
            const clamped = Math.min(page, totalPages);
            const startIdx = total === 0 ? 0 : (clamped - 1) * pageSize + 1;
            const endIdx = total === 0 ? 0 : Math.min(total, clamped * pageSize);
            return (
              <div className="flex items-center justify-between mt-4 text-sm">
                <div className="text-muted-foreground">{total === 0 ? '0' : `${startIdx}-${endIdx}`} of {total}</div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={clamped <= 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={clamped >= totalPages}
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );
};

export default ActivityLog;