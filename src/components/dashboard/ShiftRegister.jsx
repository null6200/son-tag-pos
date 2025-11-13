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

  useEffect(() => {
    setActiveRegister(null);
    reloadShifts();
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

  const reloadShifts = async () => {
    const branchId = selectedBranch || user?.branchId;
    if (!branchId) { setShifts([]); return; }
    try {
      const status = statusFilter || 'ALL';
      const sectionId = selectedSection && selectedSection !== 'ALL' ? selectedSection : undefined;
      const limit = pageSize;
      const offset = (page - 1) * pageSize;
      const result = await api.shifts.list({ branchId, sectionId, status, limit, offset });
      let list = Array.isArray(result) ? result : (Array.isArray(result?.items) ? result.items : []);
      const total = typeof result?.total === 'number' ? result.total : list.length;
      setTotalCount(total);
      console.debug('[ShiftRegister] list()', { branchId, sectionId, status, listCount: list.length });
      // Merge strongest signals first: users.runtime.lastShiftId
      try {
        const rt = await api.users.getRuntime();
        if (rt?.lastShiftId) {
          try {
            const byId = await api.shifts.get(rt.lastShiftId);
            if (byId && byId.id && !byId.closedAt) {
              if (!list.some(x => x.id === byId.id)) list.push(byId);
            }
          } catch {}
        }
      } catch {}
      // Merge branch-wide OPEN list regardless of section filter
      if (status === 'ALL' || status === 'OPEN') {
        try {
          const openRes = await api.shifts.list({ branchId, status: 'OPEN', limit: 50, offset: 0 });
          const openList = Array.isArray(openRes) ? openRes : (Array.isArray(openRes?.items) ? openRes.items : []);
          if (openList.length) {
            const seen = new Set(list.map(x => x.id));
            for (const s of openList) if (s && s.id && !seen.has(s.id)) list.push(s);
          }
        } catch {}
      }
      // Always merge in currently OPEN shifts when viewing OPEN/ALL
      if (status === 'ALL' || status === 'OPEN') {
        const targetSectionIds = sectionId ? [sectionId] : (sections?.map(s => s.id) || []);
        console.debug('[ShiftRegister] current() probe sections', targetSectionIds);
        if (targetSectionIds.length) {
          const settled = await Promise.allSettled(targetSectionIds.map(sec => api.shifts.current({ branchId, sectionId: sec })));
          const openNow = [];
          for (let i = 0; i < settled.length; i++) {
            const r = settled[i];
            if (r.status === 'fulfilled' && r.value && r.value.id && !r.value.closedAt) {
              openNow.push(r.value);
            }
          }
          console.debug('[ShiftRegister] current() openNow', { count: openNow.length });
          if (openNow.length) {
            const seen = new Set(list.map(x => x.id));
            for (const s of openNow) if (!seen.has(s.id)) list.push(s);
          }
        }
        // Also merge current for the authenticated user regardless of section
        try {
          const meCur = await api.shifts.currentMe();
          if (meCur && meCur.id && !meCur.closedAt && !list.some(x => x.id === meCur.id)) list.push(meCur);
        } catch {}
      }
      const withMeta = list.map(s => {
        const secName = (sections.find(x => x.id === s.sectionId)?.name) || 'Section';
        return {
          id: s.id,
          openedBy: s.openedByUsername || s.openedById || '—',
          closedBy: s.closedByUsername || s.closedById || '—',
          openedAt: s.openedAt || s.start || s.createdAt,
          closedAt: s.closedAt || null,
          status: s.status || (s.closedAt ? 'CLOSED' : 'OPEN'),
          sectionId: s.sectionId,
          sectionName: secName,
          expectedCash: s.expectedCash,
        };

  // Load cash drawer movements strictly from backend for the active shift
  const reloadMovements = async (shiftId) => {
    if (!shiftId) { setMovements([]); return; }
    try {
      let res = await api.cashdrawer?.movements?.list?.({ shiftId });
      if (!res && api.shifts?.movements?.list) res = await api.shifts.movements.list({ shiftId });
      const items = Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : []);
      const mapped = items.map(m => ({
        id: m.id,
        type: m.type || (Number(m.amount) >= 0 ? 'PAY_IN' : 'PAY_OUT'),
        amount: Math.abs(Number(m.amount || m.delta || 0)),
        note: m.note || m.reason || '',
        createdAt: m.createdAt || m.date || new Date().toISOString(),
        createdBy: m.createdByUsername || m.createdBy || '—',
      }));
      setMovements(mapped.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)));
    } catch {
      setMovements([]);
    }
  };

  // When active register changes, load movements
  useEffect(() => {
    reloadMovements(activeRegister?.id);
  }, [activeRegister?.id]);
      });
      // Generate stable, informative display IDs: Shift\\<SEC>-<YYMMDD>-<SID4>
      const toCode = (name) => {
        if (!name) return 'SECTION';
        const words = String(name).trim().split(/\s+/);
        const acronym = words.length > 1 ? words.map(w => w[0] || '').join('') : name;
        return acronym.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 10) || 'SECTION';
      };
      const withDisplay = withMeta.map(item => {
        const d = new Date(item.openedAt);
        const yy = String(d.getFullYear()).slice(2);
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const secCode = toCode(item.sectionName);
        const shortId = String(item.id).replace(/-/g, '').toUpperCase().slice(-4);
        const displayId = `Shift\\${secCode}-${yy}${mm}${dd}-${shortId}`;
        return { ...item, displayId };
      });
      if (withDisplay.length === 0) {
        toast({ title: 'No shifts found', description: `Branch=${branchId}, Section=${sectionId || 'ALL'}, Status=${status}` });
      } else {
        console.debug('[ShiftRegister] final rows', { count: withDisplay.length });
      }
      setShifts(withDisplay);
    } catch (e) {
      // Hard fallback path on any error
      try {
        const status = statusFilter || 'ALL';
        if (status === 'CLOSED') { setShifts([]); return; }
        const sectionId = selectedSection && selectedSection !== 'ALL' ? selectedSection : undefined;
        const branch = selectedBranch || user?.branchId;
        const targetSectionIds = sectionId ? [sectionId] : (sections?.map(s => s.id) || []);
        const settled = await Promise.allSettled(targetSectionIds.map(sec => api.shifts.current({ branchId: branch, sectionId: sec })));
        const list = [];
        for (let i = 0; i < settled.length; i++) {
          const r = settled[i];
          if (r.status === 'fulfilled' && r.value && r.value.id && !r.value.closedAt) list.push(r.value);
        }
        const toCode = (name) => {
          if (!name) return 'SECTION';
          const words = String(name).trim().split(/\s+/);
          const acronym = words.length > 1 ? words.map(w => w[0] || '').join('') : name;
          return acronym.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 10) || 'SECTION';
        };
        const withDisplay = list.map(s => {
          const secName = (sections.find(x => x.id === s.sectionId)?.name) || 'Section';
          const d = new Date(s.openedAt);
          const yy = String(d.getFullYear()).slice(2);
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          const secCode = toCode(secName);
          const shortId = String(s.id).replace(/-/g, '').toUpperCase().slice(-4);
          const displayId = `Shift\\${secCode}-${yy}${mm}${dd}-${shortId}`;
          return {
            id: s.id,
            openedBy: s.openedByUsername || s.openedById || '—',
            closedBy: s.closedByUsername || s.closedById || '—',
            openedAt: s.openedAt,
            closedAt: s.closedAt || null,
            status: s.status || 'OPEN',
            sectionId: s.sectionId,
            sectionName: secName,
            displayId,
          };
        });
        setShifts(withDisplay);
      } catch {
        setShifts([]);
      }
    }
  };

  // Reset pagination on filters
  useEffect(() => { setPage(1); }, [search, statusFilter, selectedBranch]);

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
      await reloadShifts();
      toast({ title: "Register Opened!", description: `Shift started with $${cashAmount.toFixed(2)}.` });
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
      await reloadShifts();
      toast({ title: "Register Closed!", description: `Shift ended.` });
      setIsCloseFormOpen(false);
      setClosingTargetId(null);
      setClosingTargetExpected(null);
      // No local storage usage for shift state
    } catch (err) {
      const msg = String(err?.message || err || '').toLowerCase();
      if (msg.includes('already closed')) {
        toast({ title: 'Shift already closed', description: 'Refreshing list…' });
        await reloadShifts();
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

  // Load preferred status filter and page size on init
  useEffect(() => {
    (async () => {
      try {
        const branchId = selectedBranch || user?.branchId;
        const prefs = await (api.userPrefs?.getMany?.({ keys: ['shiftStatusFilter', 'shiftPageSize'], branchId }));
        const byKey = (k) => Array.isArray(prefs) ? prefs.find(p => p.key === k)?.value : prefs?.[k];
        const status = byKey('shiftStatusFilter');
        const size = parseInt(byKey('shiftPageSize'), 10);
        if (status === 'OPEN' || status === 'CLOSED' || status === 'ALL') setStatusFilter(status);
        if (!isNaN(size) && [5,10,20,50].includes(size)) setPageSize(size);
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist status filter and page size when they change
  useEffect(() => {
    (async () => {
      try {
        const branchId = selectedBranch || user?.branchId;
        if (!branchId) return;
        if (api.userPrefs?.setMany) {
          await api.userPrefs.setMany({ branchId, prefs: [
            { key: 'shiftStatusFilter', value: statusFilter },
            { key: 'shiftPageSize', value: String(pageSize) },
          ]});
        } else if (api.userPrefs?.set) {
          await api.userPrefs.set({ branchId, key: 'shiftStatusFilter', value: statusFilter });
          await api.userPrefs.set({ branchId, key: 'shiftPageSize', value: String(pageSize) });
        }
      } catch {}
    })();
  }, [statusFilter, pageSize, selectedBranch, user?.branchId]);

  const handleCloseShift = (shiftId) => {
    setConfirmClose({ open: true, id: shiftId });
  };

  const confirmCloseShift = async () => {
    const id = confirmClose.id;
    if (!id) { setConfirmClose({ open: false, id: null }); return; }
    // Always use the same close modal/flow as POS without switching views
    setClosingTargetId(id);
    try {
      const s = shifts.find(x => x.id === id);
      setClosingTargetExpected(s?.expectedCash ?? null);
    } catch {}
    setClosingCash('');
    setIsCloseFormOpen(true);
    setConfirmClose({ open: false, id: null });
  };
  
  const handleStartNewShift = () => {
    setActiveRegister(null);
    setClosingCash('');
    toast({ title: "Ready for new shift!" });
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  // Safe currency formatting for possibly-string/undefined values
  const fmt = (v) => `$${Number(v || 0).toFixed(2)}`;
  const goBack = () => {
    try {
      if (typeof window !== 'undefined' && window.history && window.history.length > 1) {
        window.history.back();
        return;
      }
    } catch {}
    try { window.location.assign('/dashboard'); } catch {}
  };

  if (activeRegister && activeRegister.closedAt) {
     return (
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-3xl font-bold tracking-tight gradient-text">Shift Register Closed</h2>
              <p className="text-muted-foreground">This shift has ended. Review the summary below.</p>
            </div>
            <Button variant="outline" onClick={goBack}>Back</Button>
          </div>
          <motion.div initial="hidden" animate="visible" variants={cardVariants}>
              <Card className="glass-effect">
                  <CardHeader>
                      <CardTitle>Shift Summary</CardTitle>
                      <CardDescription>Register ID: {activeRegister.id}</CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
                      <InfoItem label="Opened By" value={activeRegister.openedBy || 'User'} />
                      <InfoItem label="Opened At" value={new Date(activeRegister.openedAt).toLocaleString()} />
                      <InfoItem label="Opening Cash" value={fmt(activeRegister.openingCash)} />
                      <InfoItem label="Cash Sales" value={fmt(activeRegister.cashSales)} />
                      <InfoItem label="Expected Cash in Drawer" value={fmt(activeRegister.expectedCash)} />
                      <InfoItem label="Closed By" value={user.username} />
                      <InfoItem label="Closed At" value={new Date(activeRegister.closedAt).toLocaleString()} />
                      <InfoItem label="Counted Cash" value={fmt(activeRegister.closingCash)} />
                      <InfoItem label="Difference" value={fmt(activeRegister.difference)} className={(Number(activeRegister.difference || 0) < 0) ? 'text-destructive' : 'text-green-500'} />
                  </CardContent>
                  <CardContent>
                    <Button onClick={handleStartNewShift} className="w-full mt-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                        Start New Shift
                    </Button>
                  </CardContent>
              </Card>
          </motion.div>
      </div>
    );
  }

  if (activeRegister) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-3xl font-bold tracking-tight gradient-text">Shift in Progress</h2>
            <p className="text-muted-foreground">Register opened by {activeRegister.openedBy || 'User'} at {new Date(activeRegister.openedAt).toLocaleTimeString()}.</p>
          </div>
          <Button variant="outline" onClick={() => { try { window.history.back(); } catch {} }}>Back</Button>
        </div>

        <motion.div initial="hidden" animate="visible" variants={cardVariants}>
            <Card className="glass-effect">
                <CardHeader>
                    <CardTitle>Current Register Status</CardTitle>
                    <CardDescription>Real-time overview of the active shift.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <StatusItem icon={DollarSign} label="Opening Cash" value={fmt(activeRegister.openingCash)} />
                    <StatusItem icon={DollarSign} label="Cash Sales" value={fmt(activeRegister.cashSales)} color="text-green-500"/>
                    <StatusItem icon={DollarSign} label="Card Sales" value={fmt(activeRegister.cardSales)} color="text-blue-500"/>
                    <StatusItem icon={DollarSign} label="Expected in Drawer" value={fmt(activeRegister.expectedCash)} color="text-primary"/>
                </CardContent>
                 <CardContent className="flex gap-4">
                     <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="w-full"><Eye className="w-4 h-4 mr-2"/> View Details</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Shift Details</DialogTitle>
                                <DialogDescription>Detailed breakdown for the current shift.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4 text-sm">
                                <InfoItem label="Register ID" value={activeRegister.id} />
                                <InfoItem label="Opened By" value={activeRegister.openedBy || 'User'} />
                                <InfoItem label="Closed By" value={activeRegister.closedBy || '—'} />
                                <InfoItem label="Opened At" value={new Date(activeRegister.openedAt).toLocaleString()} />
                                <InfoItem label="Closed At" value={activeRegister.closedAt ? new Date(activeRegister.closedAt).toLocaleString() : '—'} />
                                <hr/>
                                <InfoItem label="Opening Cash" value={fmt(activeRegister.openingCash)} />
                                <InfoItem label="Cash Sales" value={fmt(activeRegister.cashSales)} />
                                <InfoItem label="Card Sales" value={fmt(activeRegister.cardSales)} />
                                <hr/>
                                <InfoItem label="Expected Cash in Drawer" value={fmt(activeRegister.expectedCash)} className="font-bold"/>
                            </div>
                        </DialogContent>
                    </Dialog>
                    <Dialog open={isCloseFormOpen} onOpenChange={setIsCloseFormOpen}>
                        <DialogTrigger asChild>
                            <Button className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"><MinusCircle className="w-4 h-4 mr-2" /> Close Register</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Close Shift Register</DialogTitle>
                                <DialogDescription>Count the cash in the drawer and enter the final amount.</DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleCloseRegister} className="space-y-4 pt-4">
                                <p className="text-sm text-muted-foreground">Expected amount: <span className="font-bold text-foreground">{fmt(closingTargetExpected ?? activeRegister?.expectedCash)}</span></p>
                                <div className="space-y-2">
                                    <Label htmlFor="closing-cash">Counted Cash Amount</Label>
                                    <Input id="closing-cash" type="number" step="0.01" value={closingCash} onChange={(e) => setClosingCash(e.target.value)} placeholder="e.g., 4100.50" />
                                </div>
                                <DialogFooter>
                                    <Button type="button" variant="ghost" onClick={() => setIsCloseFormOpen(false)}>Cancel</Button>
                                    <Button type="submit">Confirm & Close Shift</Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                 </CardContent>
            </Card>
        </motion.div>

        <motion.div initial="hidden" animate="visible" variants={cardVariants}>
          <Card className="glass-effect">
            <CardHeader>
              <CardTitle>Cash Movements</CardTitle>
              <CardDescription>Pay-ins and pay-outs during this shift.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setMovementAmount(''); setMovementNote(''); setIsPayInOpen(true); }}>Pay In</Button>
                <Button variant="destructive" onClick={() => { setMovementAmount(''); setMovementNote(''); setIsPayOutOpen(true); }}>Pay Out</Button>
              </div>
              <div className="rounded-md border overflow-hidden">
                <div className="grid grid-cols-12 bg-muted/50 text-xs font-semibold px-3 py-2">
                  <div className="col-span-2">Time</div>
                  <div className="col-span-2">Type</div>
                  <div className="col-span-3">Amount</div>
                  <div className="col-span-3">Note</div>
                  <div className="col-span-2">By</div>
                </div>
                <div className="divide-y text-sm">
                  {movements.length ? movements.map(m => (
                    <div key={m.id} className="grid grid-cols-12 px-3 py-2">
                      <div className="col-span-2">{new Date(m.createdAt).toLocaleTimeString()}</div>
                      <div className="col-span-2">{m.type}</div>
                      <div className="col-span-3 font-semibold">{fmt(m.amount)}</div>
                      <div className="col-span-3 truncate" title={m.note}>{m.note || '—'}</div>
                      <div className="col-span-2">{m.createdBy || '—'}</div>
                    </div>
                  )) : (
                    <div className="px-3 py-4 text-muted-foreground">No movements yet.</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Pay In dialog */}
        <Dialog open={isPayInOpen} onOpenChange={setIsPayInOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Pay In</DialogTitle>
              <DialogDescription>Add cash into the drawer.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Amount</Label>
                <Input type="number" step="0.01" value={movementAmount} onChange={(e) => setMovementAmount(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Note</Label>
                <Input value={movementNote} onChange={(e) => setMovementNote(e.target.value)} placeholder="Reason (optional)" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsPayInOpen(false)}>Cancel</Button>
              <Button onClick={async () => {
                const amt = parseFloat(movementAmount);
                if (isNaN(amt) || amt <= 0) { toast({ title: 'Invalid amount', variant: 'destructive' }); return; }
                try {
                  if (!activeRegister?.id) return;
                  if (api.cashdrawer?.movements?.create) {
                    await api.cashdrawer.movements.create({ shiftId: activeRegister.id, type: 'PAY_IN', amount: String(amt), note: movementNote });
                  } else if (api.shifts?.movements?.create) {
                    await api.shifts.movements.create({ shiftId: activeRegister.id, type: 'PAY_IN', amount: String(amt), note: movementNote });
                  }
                  toast({ title: 'Pay In recorded' });
                  setIsPayInOpen(false);
                  setMovementAmount(''); setMovementNote('');
                  await reloadShifts();
                  await reloadMovements(activeRegister.id);
                } catch (e) {
                  toast({ title: 'Failed to record', description: String(e?.message || e), variant: 'destructive' });
                }
              }}>Record</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Pay Out dialog */}
        <Dialog open={isPayOutOpen} onOpenChange={setIsPayOutOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Pay Out</DialogTitle>
              <DialogDescription>Withdraw cash from the drawer.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Amount</Label>
                <Input type="number" step="0.01" value={movementAmount} onChange={(e) => setMovementAmount(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Note</Label>
                <Input value={movementNote} onChange={(e) => setMovementNote(e.target.value)} placeholder="Reason (optional)" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsPayOutOpen(false)}>Cancel</Button>
              <Button onClick={async () => {
                const amt = parseFloat(movementAmount);
                if (isNaN(amt) || amt <= 0) { toast({ title: 'Invalid amount', variant: 'destructive' }); return; }
                try {
                  if (!activeRegister?.id) return;
                  if (api.cashdrawer?.movements?.create) {
                    await api.cashdrawer.movements.create({ shiftId: activeRegister.id, type: 'PAY_OUT', amount: String(amt), note: movementNote });
                  } else if (api.shifts?.movements?.create) {
                    await api.shifts.movements.create({ shiftId: activeRegister.id, type: 'PAY_OUT', amount: String(amt), note: movementNote });
                  }
                  toast({ title: 'Pay Out recorded' });
                  setIsPayOutOpen(false);
                  setMovementAmount(''); setMovementNote('');
                  await reloadShifts();
                  await reloadMovements(activeRegister.id);
                } catch (e) {
                  toast({ title: 'Failed to record', description: String(e?.message || e), variant: 'destructive' });
                }
              }}>Record</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

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
               <div className="grid grid-cols-12 bg-muted/50 text-sm font-semibold px-3 py-2">
                 <div className="col-span-3">Shift ID</div>
                 <div className="col-span-2">Opened By</div>
                 <div className="col-span-2">Closed By</div>
                 <div className="col-span-2">Opening Time</div>
                 <div className="col-span-2">Closed At</div>
                 <div className="col-span-1 text-right">Status / Action</div>
               </div>
               <div className="divide-y">
                 {shifts
                   .filter(s => (statusFilter === 'ALL' ? true : s.status === statusFilter))
                   .filter(s => (s.openedBy || '').toLowerCase().includes(search.toLowerCase()))
                   .map(s => (
                     <div key={s.id} className="grid grid-cols-12 px-3 py-2 text-sm items-center">
                       <div className="col-span-3 truncate">{s.displayId || s.id}</div>
                       <div className="col-span-2">{s.openedBy || '—'}</div>
                       <div className="col-span-2">{s.closedBy || '—'}</div>
                       <div className="col-span-2">{new Date(s.openedAt).toLocaleString()}</div>
                       <div className="col-span-2">{s.closedAt ? new Date(s.closedAt).toLocaleString() : '—'}</div>
                       <div className="col-span-1 flex items-center justify-end gap-2">
                         <span className={`px-2 py-0.5 rounded-full text-xs ${s.status === 'OPEN' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-700'}`}>{s.status}</span>
                         <DropdownMenu>
                           <DropdownMenuTrigger asChild>
                             <Button size="icon" variant="outline" className="h-7 w-7"><MoreVertical className="h-4 w-4" /></Button>
                           </DropdownMenuTrigger>
                           <DropdownMenuContent align="end" className="w-40">
                             <DropdownMenuItem onClick={() => setViewShift(s)}>View</DropdownMenuItem>
                             <DropdownMenuItem
                               onClick={() => {
                                 try {
                                   setClosingTargetId(s.id);
                                   const t = shifts.find(x => x.id === s.id);
                                   setClosingTargetExpected(t?.expectedCash ?? null);
                                   setClosingCash('');
                                   setIsCloseFormOpen(true);
                                 } catch {}
                               }}
                               disabled={s.status !== 'OPEN'}
                             >
                               Close
                             </DropdownMenuItem>
                           </DropdownMenuContent>
                         </DropdownMenu>
                       </div>
                     </div>
                   ))}
                 {shifts
                   .filter(s => (statusFilter === 'ALL' ? true : s.status === statusFilter))
                   .filter(s => (s.openedBy || '').toLowerCase().includes(search.toLowerCase())).length === 0 && (
                   <div className="px-3 py-6 text-sm text-muted-foreground">No shifts found.</div>
                 )}
               </div>
              </div>
              <div className="flex items-center justify-between mt-3 text-sm">
                <div className="text-muted-foreground">Page {page} of {Math.max(1, Math.ceil(totalCount / pageSize))} • {totalCount} total</div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Label htmlFor="page-size" className="text-sm">Rows</Label>
                  <select id="page-size" value={pageSize} onChange={(e) => { setPage(1); setPageSize(Number(e.target.value) || 10); }} className="h-8 rounded-md border bg-background px-2 text-sm">
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>Prev</Button>
                  {/* Numbered pages (window around current) */}
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
             <InfoItem label="Opened By" value={viewShift?.openedBy || 'Unknown'} />
             <InfoItem label="Closed By" value={viewShift?.closedBy || '—'} />
             <InfoItem label="Section" value={viewShift?.sectionName || ''} />
             <InfoItem label="Opened At" value={viewShift ? new Date(viewShift.openedAt).toLocaleString() : ''} />
             <InfoItem label="Closed At" value={viewShift?.closedAt ? new Date(viewShift.closedAt).toLocaleString() : '—'} />
             <InfoItem label="Status" value={viewShift?.status} />
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