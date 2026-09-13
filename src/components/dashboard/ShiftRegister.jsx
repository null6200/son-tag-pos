import React, { useState, useEffect } from 'react';

import { motion } from 'framer-motion';
import { Waypoints, DollarSign, PlusCircle, MinusCircle, Eye, Info, Search, MoreVertical } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { RequirePermission, hasPermission } from '@/lib/permissions';

const ShiftRegister = ({ user }) => {
  const [activeRegister, setActiveRegister] = useState(null);
  const [openingCash, setOpeningCash] = useState('');
  const [closingCash, setClosingCash] = useState('');
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isCloseFormOpen, setIsCloseFormOpen] = useState(false);
  const [shifts, setShifts] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [confirmClose, setConfirmClose] = useState({ open: false, id: null });
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [sections, setSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [viewShift, setViewShift] = useState(null);
  const [closingBusy, setClosingBusy] = useState(false);
  const [closingTargetId, setClosingTargetId] = useState(null);
  const [closingTargetExpected, setClosingTargetExpected] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const [jumpPage, setJumpPage] = useState('');
  const [movements, setMovements] = useState([]);
  const [isPayInOpen, setIsPayInOpen] = useState(false);
  const [isPayOutOpen, setIsPayOutOpen] = useState(false);
  const [movementAmount, setMovementAmount] = useState('');
  const [movementNote, setMovementNote] = useState('');
  const [reportRows, setReportRows] = useState([]);
  const [reportTotals, setReportTotals] = useState({ totalCash: 0, totalCard: 0, totalTransfer: 0, totalOther: 0, totalCredit: 0, grandTotal: 0 });
  const [reportLoading, setReportLoading] = useState(false);
  const [currencySymbol, setCurrencySymbol] = useState('₦');

  useEffect(() => {
    const loadBiz = () => {
      try {
        const raw = localStorage.getItem('businessInfo');
        if (!raw) return;
        const info = JSON.parse(raw);
        let sym = (info && (info.currencySymbol || info.currency)) || '₦';
        if (typeof sym === 'string') {
          sym = sym.trim();
          // If backend stored a verbose label like "NGN - Nigeria Naira", normalize to simple naira symbol
          if (/ngn/i.test(sym) || /naira/i.test(sym)) {
            sym = '₦';
          }
          setCurrencySymbol(sym || '₦');
        }
      } catch {}
    };

    loadBiz();
    try {
      const handler = () => loadBiz();
      window.addEventListener('businessInfoUpdated', handler);
      return () => { try { window.removeEventListener('businessInfoUpdated', handler); } catch {} };
    } catch {
      return undefined;
    }
  }, []);

  useEffect(() => {
    setActiveRegister(null);
    loadShiftReportRows();
  }, [user?.branchId, selectedBranch, selectedSection, statusFilter, sections, page, pageSize]);

  useEffect(() => {
    // load branches for managers/admin who can cross-view
    (async () => {
      try {
        const list = await api.branches.list();
        setBranches(Array.isArray(list) ? list : []);
        setSelectedBranch((prev) => prev ?? (user?.branchId || list?.[0]?.id || null));
      } catch {
        setBranches([]);
        setSelectedBranch(user?.branchId || null);
      }
    })();
  }, [user?.branchId]);

  // Load sections for the chosen branch and remember last selection per branch
  useEffect(() => {
    (async () => {
      const branchId = selectedBranch || user?.branchId;
      if (!branchId) { setSections([]); setSelectedSection('ALL'); return; }
      try {
        const secs = await api.sections.list({ branchId });
        setSections(Array.isArray(secs) ? secs : []);
        // Load preferred section for this branch from backend user prefs
        try {
          const pref = await (api.userPrefs?.get?.({ key: 'lastShiftSection', branchId }));
          const val = pref?.value || pref; // accept primitive
          if (val && (Array.isArray(secs) ? secs : [])?.some(s => s.id === val)) {
            setSelectedSection(val);
          } else {
            setSelectedSection(prev => prev || 'ALL');
          }
        } catch {
          setSelectedSection(prev => prev || 'ALL');
        }
      } catch {
        setSections([]);
        setSelectedSection('ALL');
      }
    })();
  }, [selectedBranch, user?.branchId]);

  // Backend-driven shift register report rows for the management overview grid
  const loadShiftReportRows = async () => {
    const branchId = selectedBranch || user?.branchId;
    if (!branchId) { setReportRows([]); setReportTotals({ totalCash: 0, totalCard: 0, totalTransfer: 0, totalOther: 0, totalCredit: 0, grandTotal: 0 }); return; }
    try {
      setReportLoading(true);
      const status = statusFilter || 'ALL';
      const sectionId = selectedSection && selectedSection !== 'ALL' ? selectedSection : undefined;
      const limit = pageSize;
      const offset = (page - 1) * pageSize;
      const res = await api.reports.shiftRegisters({ branchId, sectionId, status, limit, offset });
      const items = Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : []);
      setReportRows(items);
      const total = typeof res?.total === 'number' ? res.total : items.length;
      setTotalCount(total);
      if (res?.totals) {
        setReportTotals({
          totalCash: Number(res.totals.totalCash || 0),
          totalCard: Number(res.totals.totalCard || 0),
          totalTransfer: Number(res.totals.totalTransfer || 0),
          totalOther: Number(res.totals.totalOther || 0),
          totalCredit: Number(res.totals.totalCredit || 0),
          grandTotal: Number(res.totals.grandTotal || 0),
        });
      } else {
        setReportTotals({ totalCash: 0, totalCard: 0, totalTransfer: 0, totalOther: 0, totalCredit: 0, grandTotal: 0 });
      }
    } catch (e) {
      setReportRows([]);
      setReportTotals({ totalCash: 0, totalCard: 0, totalTransfer: 0, totalOther: 0, totalCredit: 0, grandTotal: 0 });
    } finally {
      setReportLoading(false);
    }
  };

  // Load backend-driven shift register report rows for the overview grid
  useEffect(() => {
    loadShiftReportRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.branchId, selectedBranch, selectedSection, statusFilter, page, pageSize]);

  const handleOpenRegister = async (e) => {
    e.preventDefault();
    const cashAmount = parseFloat(openingCash);
    if (isNaN(cashAmount) || cashAmount < 0) {
      toast({ title: "Invalid Amount", description: "Please enter a valid opening cash amount.", variant: "destructive" });
      return;
    }
    try {
      const branchId = selectedBranch || user?.branchId;
      const sectionId = selectedSection === 'ALL' ? null : selectedSection;
      if (!branchId || !sectionId) {
        toast({ title: 'Select Section', description: 'Please select a section to open a shift for.', variant: 'destructive' });
        return;
      }
      // Persist preferred section to backend user prefs
      try { await (api.userPrefs?.set?.({ key: 'lastShiftSection', branchId, value: sectionId })); } catch {}
      await api.shifts.open({ branchId, sectionId, openingCash: cashAmount });
      await loadShiftReportRows();
      toast({ title: "Register Opened!", description: `${currencySymbol}${cashAmount.toFixed(2)}.` });
      setOpeningCash('');
    } catch (err) {
      toast({ title: 'Failed to open shift', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  const handleCloseRegister = async (e) => {
    e.preventDefault();
    const cashAmount = parseFloat(closingCash);
    if (isNaN(cashAmount) || cashAmount < 0) {
      toast({ title: "Invalid Amount", description: "Please enter a valid closing cash amount.", variant: "destructive" });
      return;
    }
    try {
      if (closingBusy) return;
      setClosingBusy(true);
      const targetId = closingTargetId || activeRegister?.id;
      if (!targetId) { toast({ title: 'No shift selected', variant: 'destructive' }); return; }
      await api.shifts.close(targetId, { closingCash: cashAmount });
      await loadShiftReportRows();
      toast({ title: "Register Closed!", description: `Shift ended.` });
      setIsCloseFormOpen(false);
      setClosingTargetId(null);
      setClosingTargetExpected(null);
      // No local storage usage for shift state
    } catch (err) {
      const msg = String(err?.message || err || '').toLowerCase();
      if (msg.includes('already closed')) {
        toast({ title: 'Shift already closed', description: 'Refreshing list…' });
        await loadShiftReportRows();
        setIsCloseFormOpen(false);
        setClosingTargetId(null);
        setClosingTargetExpected(null);
        // No local storage usage for shift state
      } else {
        toast({ title: 'Failed to close shift', description: String(err?.message || err), variant: 'destructive' });
      }
    }
    finally { setClosingBusy(false); }
  };

  const confirmCloseShift = async () => {
    const id = confirmClose.id;
    if (!id) { setConfirmClose({ open: false, id: null }); return; }
    setClosingTargetId(id);
    try {
      // Prefer report rows (have expectedCash from backend), fall back to local shifts if any
      const s = (reportRows || []).find(x => x.id === id) || (shifts || []).find(x => x.id === id);
      setClosingTargetExpected(s?.expectedCash ?? null);
    } catch {}
    setClosingCash('');
    setIsCloseFormOpen(true);
    setConfirmClose({ open: false, id: null });
  };

  // Reset pagination on filters
  useEffect(() => { setPage(1); }, [search, statusFilter, selectedBranch]);

  const fmt = (v) => `${currencySymbol}${Number(v || 0).toFixed(2)}`;

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight gradient-text">Shift Register</h2>
          <p className="text-muted-foreground">Open a new shift register to begin sales operations.</p>
        </div>
        <Button variant="outline" onClick={() => { try { window.history.back(); } catch {} }}>Back</Button>
      </div>
      <motion.div initial="hidden" animate="visible" variants={cardVariants}>
        <Card className="max-w-md mx-auto glass-effect">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><PlusCircle className="w-6 h-6 text-primary"/> Open New Shift</CardTitle>
            <CardDescription>Enter the starting cash amount in the drawer.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleOpenRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="opening-cash">Opening Cash Amount</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="opening-cash" type="number" step="0.01" value={openingCash} onChange={(e) => setOpeningCash(e.target.value)} placeholder="e.g., 300.00" className="pl-8"/>
                </div>
              </div>
              <RequirePermission perms={user?.permissions} anyOf={["open_shift_register", "add_shift", "assign_shift"]}>
                <Button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">Start Shift</Button>
              </RequirePermission>
            </form>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial="hidden" animate="visible" variants={cardVariants}>
        <Card className="glass-effect">
          <CardHeader>
            <CardTitle>Shift Overview</CardTitle>
            <CardDescription>All currently opened shifts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
              <div className="relative w-full md:w-1/2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Search by staff name" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Label htmlFor="section-filter" className="text-sm">Section</Label>
                  <select id="section-filter" value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm min-w-[10rem]">
                    <option value="ALL">All</option>
                    {sections.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="status-filter" className="text-sm">Status</Label>
                  <select id="status-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm">
                    <option value="ALL">All</option>
                    <option value="OPEN">Open</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Opened By</TableHead>
                    <TableHead>Open Time</TableHead>
                    <TableHead>Close Time</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead className="text-right">Total Card Bills</TableHead>
                    <TableHead className="text-right">Total Cash In</TableHead>
                    <TableHead className="text-right">Total Bank Transfer</TableHead>
                    <TableHead className="text-right">Other Payments</TableHead>
                    <TableHead className="text-right">Total Debt / Credit</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Status / Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportLoading && reportRows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={13} className="text-center text-muted-foreground py-6">
                        Loading shifts...
                      </TableCell>
                    </TableRow>
                  )}
                  {!reportLoading && reportRows
                    .filter(r => {
                      const status = r.status || (r.closedAt ? 'CLOSED' : 'OPEN');
                      return statusFilter === 'ALL' ? true : status === statusFilter;
                    })
                    .filter(r => (r.userName || r.userEmail || '').toLowerCase().includes(search.toLowerCase()))
                    .map(shift => (
                      <TableRow key={shift.id}>
                        <TableCell>{shift.userName || shift.userEmail || 'Unknown'}</TableCell>

                        <TableCell>{shift.openedAt ? new Date(shift.openedAt).toLocaleString() : ''}</TableCell>
                        <TableCell>{shift.closedAt ? new Date(shift.closedAt).toLocaleString() : '—'}</TableCell>
                        <TableCell>{shift.date ? new Date(shift.date).toLocaleDateString() : (shift.openedAt ? new Date(shift.openedAt).toLocaleDateString() : '')}</TableCell>
                        <TableCell>{[shift.branchName, shift.sectionName].filter(Boolean).join(' / ')}</TableCell>
                        <TableCell>{shift.userName || shift.userEmail || 'Unknown'}</TableCell>
                        <TableCell className="text-right">{fmt(shift.totalCard)}</TableCell>
                        <TableCell className="text-right">{fmt(shift.totalCash)}</TableCell>
                        <TableCell className="text-right">{fmt(shift.totalTransfer)}</TableCell>
                        <TableCell className="text-right">{fmt(shift.totalOther)}</TableCell>
                        <TableCell className="text-right">{fmt(shift.totalCredit)}</TableCell>
                        <TableCell className="text-right font-bold">{fmt(shift.grandTotal)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Badge variant={shift.closedAt ? 'secondary' : 'destructive'}>
                              {shift.closedAt ? 'Closed' : 'Open'}
                            </Badge>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="icon" variant="outline" className="h-7 w-7"><MoreVertical className="h-4 w-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem onClick={() => setViewShift(shift)}>View</DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    try {
                                      setClosingTargetId(shift.id);
                                      setClosingTargetExpected(shift.expectedCash ?? null);
                                      setClosingCash('');
                                      setIsCloseFormOpen(true);
                                    } catch {}
                                  }}
                                  disabled={!!shift.closedAt}
                                >
                                  Close
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  {!reportLoading && reportRows.length > 0 && (
                    <TableRow className="bg-muted/40 font-semibold">
                      <TableCell>Totals</TableCell>
                      <TableCell />
                      <TableCell />
                      <TableCell />
                      <TableCell />
                      <TableCell />
                      <TableCell className="text-right">{fmt(reportTotals.totalCard)}</TableCell>
                      <TableCell className="text-right">{fmt(reportTotals.totalCash)}</TableCell>
                      <TableCell className="text-right">{fmt(reportTotals.totalTransfer)}</TableCell>
                      <TableCell className="text-right">{fmt(reportTotals.totalOther)}</TableCell>
                      <TableCell className="text-right">{fmt(reportTotals.totalCredit)}</TableCell>
                      <TableCell className="text-right">{fmt(reportTotals.grandTotal)}</TableCell>
                      <TableCell />
                    </TableRow>
                  )}
                  {!reportLoading && reportRows
                    .filter(r => {
                      const status = r.status || (r.closedAt ? 'CLOSED' : 'OPEN');
                      return statusFilter === 'ALL' ? true : status === statusFilter;
                    })
                    .filter(r => (r.userName || r.userEmail || '').toLowerCase().includes(search.toLowerCase())).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={13} className="text-center text-muted-foreground py-6">
                        No shifts found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-2">
                  <Label htmlFor="page-size" className="text-sm">Page size</Label>
                  <select id="page-size" value={pageSize} onChange={(e) => setPageSize(parseInt(e.target.value, 10))} className="h-9 rounded-md border bg-background px-3 text-sm">
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>Prev</Button>
                  {(() => {
                    const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
                    const start = Math.max(1, page - 3);
                    const end = Math.min(pageCount, page + 3);
                    const btns = [];
                    if (start > 1) {
                      btns.push(
                        <Button key={1} variant={page === 1 ? 'default' : 'outline'} size="sm" onClick={() => setPage(1)}>1</Button>
                      );
                      if (start > 2) btns.push(<span key="left-ellipsis" className="px-1">…</span>);
                    }
                    for (let i = start; i <= end; i++) {
                      btns.push(
                        <Button key={i} variant={page === i ? 'default' : 'outline'} size="sm" onClick={() => setPage(i)}>{i}</Button>
                      );
                    }
                    if (end < pageCount) {
                      if (end < pageCount - 1) btns.push(<span key="right-ellipsis" className="px-1">…</span>);
                      btns.push(
                        <Button key={pageCount} variant={page === pageCount ? 'default' : 'outline'} size="sm" onClick={() => setPage(pageCount)}>{pageCount}</Button>
                      );
                    }
                    return btns;
                  })()}
                  <Button variant="outline" size="sm" onClick={() => setPage(p => (p * pageSize < totalCount ? p + 1 : p))} disabled={page * pageSize >= totalCount}>Next</Button>
                  <div className="flex items-center gap-1 ml-2">
                    <Label htmlFor="jump-page" className="text-sm">Jump</Label>
                    <Input id="jump-page" value={jumpPage} onChange={(e) => setJumpPage(e.target.value)} className="h-8 w-16" placeholder="#" />
                    <Button variant="outline" size="sm" onClick={() => {
                      const n = parseInt(jumpPage, 10);
                      const pc = Math.max(1, Math.ceil(totalCount / pageSize));
                      if (!isNaN(n)) setPage(Math.min(Math.max(1, n), pc));
                    }}>Go</Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={confirmClose.open} onOpenChange={(v) => setConfirmClose(prev => ({ ...prev, open: v }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Shift</DialogTitle>
            <DialogDescription>Are you sure you want to close this shift?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmClose({ open: false, id: null })}>Cancel</Button>
            <Button onClick={confirmCloseShift}>Yes, Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewShift} onOpenChange={(v) => { if (!v) setViewShift(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Shift Details</DialogTitle>
            <DialogDescription>Overview for {viewShift?.displayId || viewShift?.id}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <InfoItem label="Shift ID" value={viewShift?.displayId || viewShift?.id} />
            <InfoItem label="Opened By" value={viewShift?.openedByUsername || viewShift?.openedById || 'Unknown'} />
            <InfoItem label="Branch / Section" value={[(viewShift?.branchName || ''), (viewShift?.sectionName || '')].filter(Boolean).join(' / ')} />
            <InfoItem label="Opened At" value={viewShift?.openedAt ? new Date(viewShift.openedAt).toLocaleString() : ''} />
            <InfoItem label="Closed At" value={viewShift?.closedAt ? new Date(viewShift.closedAt).toLocaleString() : '—'} />
            <InfoItem label="Total Cash In" value={fmt(viewShift?.totalCash)} />
            <InfoItem label="Total Card Bills" value={fmt(viewShift?.totalCard)} />
            <InfoItem label="Total Bank Transfer" value={fmt(viewShift?.totalTransfer)} />
            <InfoItem label="Other Payments" value={fmt(viewShift?.totalOther)} />
            <InfoItem label="Total Debt / Credit" value={fmt(viewShift?.totalCredit)} />
            <InfoItem label="Grand Total" value={fmt(viewShift?.grandTotal)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewShift(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/** POS-style Close modal available from Overview as well */}
      <Dialog open={isCloseFormOpen} onOpenChange={setIsCloseFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Shift Register</DialogTitle>
            <DialogDescription>Count the cash in the drawer and enter the final amount.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCloseRegister} className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">Expected amount: <span className="font-bold text-foreground">{fmt(closingTargetExpected ?? activeRegister?.expectedCash)}</span></p>
            <div className="space-y-2">
              <Label htmlFor="closing-cash-ov">Counted Cash Amount</Label>
              <Input id="closing-cash-ov" type="number" step="0.01" value={closingCash} onChange={(e) => setClosingCash(e.target.value)} placeholder="e.g., 4100.50" />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsCloseFormOpen(false)}>Cancel</Button>
              <Button type="submit">Confirm & Close Shift</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
};

const StatusItem = ({ icon: Icon, label, value, color = 'text-foreground' }) => (
    <div className="flex items-center gap-4 p-4 rounded-lg bg-background/50 dark:bg-slate-800/50">
        <div className="p-3 rounded-full bg-primary/10">
            <Icon className={`w-6 h-6 text-primary`} />
        </div>
        <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
        </div>
    </div>
);

const InfoItem = ({ label, value, className }) => (
  <div className="flex justify-between items-center py-2 border-b border-border/50">
    <p className="text-muted-foreground">{label}</p>
    <p className={`font-semibold ${className}`}>{value}</p>
  </div>
);

export default ShiftRegister;