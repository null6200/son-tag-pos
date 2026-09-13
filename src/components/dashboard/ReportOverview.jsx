import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { RequirePermission, hasPermission } from '@/lib/permissions';
import { api } from '@/lib/api';

const mockReports = Array.from({ length: 67 }).map((_, i) => {
  const types = ['Sales', 'Expenses', 'Shift'];
  const t = types[i % types.length];
  const created = new Date(Date.now() - i * 86400000);
  return {
    id: `R${String(i + 1).padStart(3, '0')}`,
    title: `${t} Report #${i + 1}`,
    type: t,
    createdBy: i % 5 === 0 ? 'system' : `user${(i % 9) + 1}`,
    createdAt: created.toISOString(),
    summary: `${t} summary for ${created.toDateString()}`,
  };
});

const ReportOverview = ({ reports: initialReports, user, perms: permsProp }) => {
  const perms = Array.isArray(permsProp) ? permsProp : (user?.permissions || []);
  const [reports, setReports] = useState(Array.isArray(initialReports) ? initialReports : mockReports);
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [view, setView] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null });
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(null); // if backend provides total

  const [typeOptions, setTypeOptions] = useState(['Sales', 'Expenses', 'Shift']);
  useEffect(() => {
    (async () => {
      try {
        const list = await api.reports.types();
        if (Array.isArray(list) && list.length > 0) setTypeOptions(list.map(String));
      } catch {}
    })();
  }, []);

  const filtered = useMemo(() => {
    return reports.filter(r => {
      const matchType = typeFilter === 'ALL' ? true : r.type === typeFilter;
      const d = new Date(r.createdAt).getTime();
      const fromOk = from ? d >= new Date(from).getTime() : true;
      const toOk = to ? d <= new Date(to).getTime() : true;
      return matchType && fromOk && toOk;
    });
  }, [reports, typeFilter, from, to]);

  // Load from backend when possible
  useEffect(() => {
    (async () => {
      if (!hasPermission(perms, 'view_report')) return;
      if (!user?.branchId) { setTotal(null); return; }
      setLoading(true);
      try {
        const resp = await api.reports.list({
          branchId: user.branchId,
          type: typeFilter !== 'ALL' ? typeFilter : undefined,
          from: from || undefined,
          to: to || undefined,
          page,
          pageSize,
        });
        if (Array.isArray(resp)) {
          setReports(resp);
          setTotal(resp.length);
        } else if (resp && Array.isArray(resp.items)) {
          setReports(resp.items);
          setTotal(typeof resp.total === 'number' ? resp.total : resp.items.length);
        } else {
          // fallback to mock if shape unexpected
          setReports(Array.isArray(initialReports) ? initialReports : mockReports);
          setTotal(null);
        }
      } catch {
        // fallback to mock if backend fails
        setReports(Array.isArray(initialReports) ? initialReports : mockReports);
        setTotal(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.branchId, typeFilter, from, to, page, pageSize, perms]);

  const totalCount = total ?? filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const clamped = Math.min(page, totalPages);
  const startIdx = (clamped - 1) * pageSize;
  const items = total === null ? filtered.slice(startIdx, startIdx + pageSize) : reports;

  const handleGenerate = () => {
    // Stub for now
    const newItem = {
      id: `R${String(reports.length + 1).padStart(3, '0')}`,
      title: `Sales Report #${reports.length + 1}`,
      type: 'Sales',
      createdBy: 'you',
      createdAt: new Date().toISOString(),
      summary: 'Generated on demand',
    };
    setReports(prev => [newItem, ...prev]);
  };

  const handleDownload = async (r) => {
    try {
      const res = await api.reports.download(r.id);
      if (typeof res === 'string' && res.startsWith('http')) {
        window.open(res, '_blank');
        return;
      }
      const text = typeof res === 'string' ? res : JSON.stringify(res, null, 2);
      const blob = new Blob([text], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${r.title.replace(/\s+/g, '_')}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // graceful no-op
    }
  };

  const handleDelete = (id) => setDeleteConfirm({ open: true, id });

  const confirmDelete = async () => {
    const id = deleteConfirm.id;
    if (!id) { setDeleteConfirm({ open: false, id: null }); return; }
    try {
      await api.reports.remove(id);
      setReports(prev => prev.filter(r => r.id !== id));
      setDeleteConfirm({ open: false, id: null });
    } catch {
      setDeleteConfirm({ open: false, id: null });
    }
  };

  return (
    <Card className="glass-effect">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Reports Overview</CardTitle>
          <CardDescription>Browse, filter, and manage generated reports</CardDescription>
        </div>
        <RequirePermission perms={perms} anyOf={["create_report"]}>
          <Button onClick={handleGenerate}>Generate Report</Button>
        </RequirePermission>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasPermission(perms, 'view_report') && (
          <div className="text-sm text-muted-foreground">You do not have permission to view reports.</div>
        )}
        <div className="flex flex-col md:flex-row gap-3 md:items-end md:justify-between">
          <div className="flex items-center gap-2">
            <Label htmlFor="type" className="text-sm">Type</Label>
            <select id="type" value={typeFilter} onChange={(e) => { setPage(1); setTypeFilter(e.target.value); }} className="h-9 rounded-md border bg-background px-3 text-sm min-w-[12rem]">
              <option value="ALL">All</option>
              {typeOptions.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm" htmlFor="from">From</Label>
            <Input id="from" type="date" value={from} onChange={(e) => { setPage(1); setFrom(e.target.value); }} className="w-[11rem]" />
            <Label className="text-sm" htmlFor="to">To</Label>
            <Input id="to" type="date" value={to} onChange={(e) => { setPage(1); setTo(e.target.value); }} className="w-[11rem]" />
          </div>
        </div>

        <div className="border rounded-md overflow-hidden">
          <div className="grid grid-cols-12 bg-muted/50 text-sm font-semibold px-3 py-2">
            <div className="col-span-4">Report Title</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-2">Generated By</div>
            <div className="col-span-2">Date Created</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>
          <div className="divide-y">
            {loading && (
              <div className="px-3 py-6 text-sm text-muted-foreground">Loading reports...</div>
            )}
            {!loading && hasPermission(perms, 'view_report') && items.map(r => (
              <div key={r.id} className="grid grid-cols-12 px-3 py-2 text-sm items-center odd:bg-background/50 hover:bg-muted/40">
                <button className="col-span-4 text-left text-primary hover:underline" onClick={() => setView(r)}>{r.title}</button>
                <div className="col-span-2">{r.type}</div>
                <div className="col-span-2">{r.createdBy}</div>
                <div className="col-span-2">{new Date(r.createdAt).toLocaleString()}</div>
                <div className="col-span-2 flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => setView(r)}>View</Button>
                  <Button size="sm" variant="outline" onClick={() => handleDownload(r)}>Download</Button>
                  <RequirePermission perms={perms} anyOf={["delete_report"]}>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(r.id)}>Delete</Button>
                  </RequirePermission>
                </div>
              </div>
            ))}
            {!loading && hasPermission(perms, 'view_report') && items.length === 0 && (
              <div className="px-3 py-6 text-sm text-muted-foreground">No reports found.</div>
            )}
          </div>
        </div>

        {(() => {
          const totalN = totalCount;
          const s = totalN === 0 ? 0 : startIdx + 1;
          const e = Math.min(totalN, startIdx + pageSize);
          const totalPages = Math.max(1, Math.ceil(totalN / pageSize));
          return (
            <div className="flex flex-col items-center gap-3 pt-3">
              <div className="text-sm text-muted-foreground">{totalN === 0 ? '0' : `${s}-${e}`} of {totalN}</div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }).slice(0, 5).map((_, idx) => {
                    const pg = idx + 1;
                    const active = pg === page;
                    return (
                      <Button key={pg} variant={active ? 'default' : 'outline'} size="sm" onClick={() => setPage(pg)}>{pg}</Button>
                    );
                  })}
                </div>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next</Button>
              </div>
            </div>
          );
        })()}
      </CardContent>

      {/* View Details modal */}
      <Dialog open={!!view} onOpenChange={(v) => { if (!v) setView(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{view?.title}</DialogTitle>
            <DialogDescription>Type: {view?.type} • Generated by {view?.createdBy}</DialogDescription>
          </DialogHeader>
          {view && (
            <div className="space-y-2 text-sm">
              <div><strong>ID:</strong> {view.id}</div>
              <div><strong>Date Created:</strong> {new Date(view.createdAt).toLocaleString()}</div>
              <div><strong>Summary:</strong> {view.summary}</div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => handleDownload(view)}>Download</Button>
            <Button onClick={() => setView(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={deleteConfirm.open} onOpenChange={(v) => setDeleteConfirm(prev => ({ ...prev, open: v }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Report</DialogTitle>
            <DialogDescription>Are you sure you want to delete this report?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteConfirm({ open: false, id: null })}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default ReportOverview;
