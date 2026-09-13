import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, PlayCircle, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from '@/lib/api';

const OpenShiftRegister = ({ onShiftOpen, user }) => {
  const [openingCash, setOpeningCash] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [branchSections, setBranchSections] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadSections = async () => {
      try {
        console.debug('[OpenShiftRegister] mount: start checks');
        // Immediate user-scoped/current check to avoid showing modal if a shift is already open
        try {
          const meCur = await api.shifts.currentMe();
          if (meCur && meCur.id && !meCur.closedAt) { console.debug('[OpenShiftRegister] current(me) hit'); try { await api.users.updateRuntime({ lastShiftId: meCur.id, lastShiftSection: meCur.sectionId, lastShiftBranch: meCur.branchId }); await api.userPrefs.set({ key: 'lastShiftSection', value: meCur.sectionId, branchId: meCur.branchId }); } catch {} onShiftOpen(meCur); return; }
        } catch {}
        try {
          const curAny = await api.shifts.current({});
          if (curAny && curAny.id && !curAny.closedAt) { console.debug('[OpenShiftRegister] current(any) hit'); try { await api.users.updateRuntime({ lastShiftId: curAny.id, lastShiftSection: curAny.sectionId, lastShiftBranch: curAny.branchId }); await api.userPrefs.set({ key: 'lastShiftSection', value: curAny.sectionId, branchId: curAny.branchId }); } catch {} onShiftOpen(curAny); return; }
        } catch {}

        // Load sections; allow backend to derive branch if not provided
        let rows = await api.sections.list({ branchId: user?.branchId || undefined });
        if (!Array.isArray(rows) || rows.length === 0) {
          // Try auto-provision default section
          try {
            if (user?.branchId) {
              await api.sections.create({ branchId: user.branchId, name: 'Main' });
              rows = await api.sections.list({ branchId: user.branchId });
            }
          } catch (e) {
            toast({ title: 'No sections found', description: 'Please add a section in Branch Management.', variant: 'destructive' });
          }
        }
        const arr = Array.isArray(rows) ? rows : [];
        setBranchSections(arr);
        if (arr.length > 0 && !selectedSectionId) {
          const preferred = arr.find(s => {
            const n = String(s.name || '').toLowerCase();
            return !(n.includes('store') || n.includes('kitchen'));
          }) || arr[0];
          setSelectedSectionId(preferred.id);
        }
        // After sections load, probe for an already-open shift and auto-enter POS
        try {
          // 0) Try current (me/any) again in case sections finished loading meanwhile
          try {
            const meCur2 = await api.shifts.currentMe();
            if (meCur2 && meCur2.id && !meCur2.closedAt) { console.debug('[OpenShiftRegister] current(me) hit after sections'); try { await api.users.updateRuntime({ lastShiftId: meCur2.id, lastShiftSection: meCur2.sectionId, lastShiftBranch: meCur2.branchId }); await api.userPrefs.set({ key: 'lastShiftSection', value: meCur2.sectionId, branchId: meCur2.branchId }); } catch {} onShiftOpen(meCur2); return; }
          } catch {}
          try {
            const curAny2 = await api.shifts.current({});
            if (curAny2 && curAny2.id && !curAny2.closedAt) { console.debug('[OpenShiftRegister] current(any) hit after sections'); try { await api.users.updateRuntime({ lastShiftId: curAny2.id, lastShiftSection: curAny2.sectionId, lastShiftBranch: curAny2.branchId }); await api.userPrefs.set({ key: 'lastShiftSection', value: curAny2.sectionId, branchId: curAny2.branchId }); } catch {} onShiftOpen(curAny2); return; }
          } catch {}
          // 1) Prefer OPEN list
          const resp = await api.shifts.list({ branchId: user.branchId, status: 'OPEN', limit: 1, offset: 0 });
          const list = Array.isArray(resp) ? resp : (Array.isArray(resp?.items) ? resp.items : []);
          if (list.length && !list[0].closedAt) { console.debug('[OpenShiftRegister] OPEN list hit'); try { await api.users.updateRuntime({ lastShiftId: list[0].id, lastShiftSection: list[0].sectionId, lastShiftBranch: list[0].branchId }); await api.userPrefs.set({ key: 'lastShiftSection', value: list[0].sectionId, branchId: list[0].branchId }); } catch {} onShiftOpen(list[0]); return; }
          // 2) Try current() for selected section
          if (arr.length) {
            const sel = selectedSectionId || arr[0].id;
            try {
              const cur = await api.shifts.current({ branchId: user.branchId, sectionId: sel });
              if (cur && !cur.closedAt) { console.debug('[OpenShiftRegister] current(selected section) hit'); try { await api.users.updateRuntime({ lastShiftId: cur.id, lastShiftSection: cur.sectionId, lastShiftBranch: cur.branchId }); await api.userPrefs.set({ key: 'lastShiftSection', value: cur.sectionId, branchId: cur.branchId }); } catch {} onShiftOpen(cur); return; }
            } catch {}
            // 3) Deep probe across all sections
            const settled = await Promise.allSettled(arr.map(s => api.shifts.current({ branchId: user.branchId, sectionId: s.id })));
            for (const r of settled) {
              if (r.status === 'fulfilled' && r.value && !r.value.closedAt) { console.debug('[OpenShiftRegister] current(enumerate) hit'); try { await api.users.updateRuntime({ lastShiftId: r.value.id, lastShiftSection: r.value.sectionId, lastShiftBranch: r.value.branchId }); await api.userPrefs.set({ key: 'lastShiftSection', value: r.value.sectionId, branchId: r.value.branchId }); } catch {} onShiftOpen(r.value); return; }
            }
          }
        } catch {}
      } catch {
        setBranchSections([]);
      }
    };
    loadSections();
  }, [user?.branchId]);

  const handleOpenRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const cashAmount = parseFloat(openingCash);
    if (isNaN(cashAmount) || cashAmount < 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid opening cash amount.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    if (!selectedSectionId) {
      toast({
        title: "Section Not Selected",
        description: "Please select a section to open the register.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }
    
    const selectedSection = branchSections.find(s => s.id === selectedSectionId);
    try {
      const shift = await api.shifts.open({ branchId: user.branchId, sectionId: selectedSectionId, openingCash: cashAmount });
      // attach sectionName for local UI convenience
      shift.sectionName = selectedSection?.name || shift.sectionName;
      try { await api.users.updateRuntime({ lastShiftId: shift.id, lastShiftSection: selectedSectionId, lastShiftBranch: user.branchId }); await api.userPrefs.set({ key: 'lastShiftSection', value: selectedSectionId, branchId: user.branchId }); } catch {}
      toast({
        title: "Shift Register Opened!",
        description: `Shift started for ${selectedSection.name} with $${cashAmount.toFixed(2)}.`,
      });
      onShiftOpen(shift);
    } catch (err) {
      const msg = String(err?.message || err || '').toLowerCase();
      if (msg.includes('already open')) {
        try {
          // Prefer the canonical current endpoints first
          try {
            const curMe = await api.shifts.currentMe();
            if (curMe && !curMe.closedAt) { onShiftOpen(curMe); return; }
          } catch {}
          try {
            const curAny = await api.shifts.current({});
            if (curAny && !curAny.closedAt) { onShiftOpen(curAny); return; }
          } catch {}
          // Try to retrieve the already-open shift and enter POS immediately
          const resp = await api.shifts.list({ branchId: user.branchId, status: 'OPEN', limit: 1, offset: 0 });
          const list = Array.isArray(resp) ? resp : (Array.isArray(resp?.items) ? resp.items : []);
          if (list.length && !list[0].closedAt) { try { await api.users.updateRuntime({ lastShiftId: list[0].id, lastShiftSection: list[0].sectionId, lastShiftBranch: list[0].branchId }); await api.userPrefs.set({ key: 'lastShiftSection', value: list[0].sectionId, branchId: list[0].branchId }); } catch {} onShiftOpen(list[0]); return; }
          // Fallback to current() on selected section first
          try {
            const cur = await api.shifts.current({ branchId: user.branchId, sectionId: selectedSectionId });
            if (cur && !cur.closedAt) { try { await api.users.updateRuntime({ lastShiftId: cur.id, lastShiftSection: cur.sectionId, lastShiftBranch: cur.branchId }); await api.userPrefs.set({ key: 'lastShiftSection', value: cur.sectionId, branchId: cur.branchId }); } catch {} onShiftOpen(cur); return; }
          } catch {}
          // Deep probe across all branch sections
          const settled = await Promise.allSettled((branchSections || []).map(s => api.shifts.current({ branchId: user.branchId, sectionId: s.id })));
          for (const r of settled) {
            if (r.status === 'fulfilled' && r.value && !r.value.closedAt) { try { await api.users.updateRuntime({ lastShiftId: r.value.id, lastShiftSection: r.value.sectionId, lastShiftBranch: r.value.branchId }); await api.userPrefs.set({ key: 'lastShiftSection', value: r.value.sectionId, branchId: r.value.branchId }); } catch {} onShiftOpen(r.value); return; }
          }
        } catch {}
      }
      toast({ title: 'Failed to open shift', description: String(err?.message || err), variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-50 to-indigo-100 dark:from-slate-900 dark:to-indigo-900">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
      >
        <Card className="w-full max-w-md mx-auto glass-effect shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center mb-4">
              <PlayCircle className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold gradient-text">Open Shift Register</CardTitle>
            <CardDescription>Select a section and enter the starting cash to begin.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleOpenRegister} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="section" className="text-sm">Select Section</Label>
                <Select onValueChange={setSelectedSectionId} value={selectedSectionId} disabled={isLoading}>
                  <SelectTrigger id="section" className="h-12">
                     <Building2 className="mr-2 h-5 w-5 text-muted-foreground" />
                    <SelectValue placeholder="Choose a section..." />
                  </SelectTrigger>
                  <SelectContent>
                    {branchSections.length > 0 ? (
                      branchSections.map(section => (
                        <SelectItem key={section.id} value={section.id}>{section.name}</SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-sections" disabled>No sections available. Please add one in Branch Management.</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="opening-cash" className="text-sm">Opening Cash Amount</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="opening-cash"
                    type="number"
                    step="0.01"
                    value={openingCash}
                    onChange={(e) => setOpeningCash(e.target.value)}
                    placeholder="e.g., 300.00"
                    className="pl-10 h-12 text-lg"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full h-12 text-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700" disabled={isLoading || branchSections.length === 0}>
                {isLoading ? 'Starting Shift...' : 'Start Shift'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default OpenShiftRegister;