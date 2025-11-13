import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import POSInterface from '@/components/pos/POSInterface';
import OpenShiftRegister from '@/components/pos/OpenShiftRegister';
import { api } from '@/lib/api';
import { useCurrentShift } from '@/lib/useCurrentShift';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { this.setState({ info }); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-screen bg-pos-background text-pos-text p-6 overflow-auto">
          <div className="max-w-3xl mx-auto border rounded-md p-4 bg-card">
            <h2 className="text-lg font-bold text-destructive mb-2">Runtime error in POS</h2>
            <pre className="text-xs whitespace-pre-wrap break-words mb-3">{String(this.state.error?.message || this.state.error)}</pre>
            {this.state.info?.componentStack && (
              <details open>
                <summary className="cursor-pointer text-sm mb-2">Component stack</summary>
                <pre className="text-xs whitespace-pre-wrap break-words">{this.state.info.componentStack}</pre>
              </details>
            )}
            <p className="text-sm text-muted-foreground">Fixing this line will restore the POS immediately. If you share this error text, I will patch it now.</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const POSSystem = ({ user, initialShift, onBackToDashboard, onLogout, onOpenProfile, theme, setTheme }) => {
  const [shiftRegister, setShiftRegister] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fatalError, setFatalError] = useState(null);
  const [checkedCurrent, setCheckedCurrent] = useState(false);
  const pinnedShiftIdRef = React.useRef(initialShift?.id || null);

  // Helper component that throws inside ErrorBoundary subtree
  const Thrower = ({ error }) => {
    if (error) { throw error; }
    return null;
  };

  const probeOpenShift = async (branchId) => {
    // First: user-scoped current shift (does not need branchId)
    try {
      const meCur = await api.shifts.currentMe();
      if (meCur && meCur.id && !meCur.closedAt) { console.debug('[POSSystem] probe: current(me) hit'); return meCur; }
    } catch {}
    // Also try generic current without section (auth-scoped)
    try {
      const anyCur = await api.shifts.current({});
      if (anyCur && anyCur.id && !anyCur.closedAt) { console.debug('[POSSystem] probe: current(any) hit'); return anyCur; }
    } catch {}
    if (!branchId) return null;
    // Branch-wide current
    try {
      const curBr = await api.shifts.currentBranch({ branchId });
      if (curBr && curBr.id && !curBr.closedAt) { console.debug('[POSSystem] probe: current(branch) hit'); return curBr; }
    } catch {}
    // Prefer list OPEN
    try {
      const resp = await api.shifts.list({ branchId, status: 'OPEN', limit: 1, offset: 0 });
      const list = Array.isArray(resp) ? resp : (Array.isArray(resp?.items) ? resp.items : []);
      if (list.length && !list[0].closedAt) { console.debug('[POSSystem] probe: OPEN list hit'); return list[0]; }
    } catch {}
    // Fallback to last section
    try {
      const pref = await (api.userPrefs?.get?.({ key: 'lastShiftSection', branchId }));
      const sectionId = (pref && typeof pref === 'object') ? pref.value : pref;
      if (sectionId) {
        const cur = await api.shifts.current({ branchId, sectionId });
        if (cur && !cur.closedAt) { console.debug('[POSSystem] probe: current(lastSection) hit'); return cur; }
      }
    } catch {}
    // Enumerate sections
    try {
      const secs = await api.sections.list({ branchId });
      const ids = (Array.isArray(secs) ? secs : []).map(s => s.id).filter(Boolean);
      if (ids.length) {
        const settled = await Promise.allSettled(ids.map(id => api.shifts.current({ branchId, sectionId: id })));
        for (const r of settled) if (r.status === 'fulfilled' && r.value && !r.value.closedAt) { console.debug('[POSSystem] probe: current(enumerate) hit'); return r.value; }
      }
    } catch {}
    return null;
  };

  useEffect(() => {
    // Early probe that doesn't wait for branchId being present
    (async () => {
      try {
        if (initialShift && initialShift.id && !initialShift.closedAt) {
          pinnedShiftIdRef.current = initialShift.id;
          setShiftRegister(initialShift);
          setCheckedCurrent(true);
          setIsLoading(false);
          console.debug('[POSSystem] mount: using initialShift immediately');
          return; // do not run any probes if user selected a shift
        }
        // Absolute first: consult users.runtime hint if present
        try {
          const rt = await api.users.getRuntime();
          const branchIdRt = rt?.lastShiftBranch || user?.branchId || user?.branch?.id;
          const sectionIdRt = rt?.lastShiftSection || null;
          const shiftIdRt = rt?.lastShiftId || null;
          if (shiftIdRt) {
            try {
              const byId = await api.shifts.get(shiftIdRt);
              if (byId && !byId.closedAt) {
                setShiftRegister(byId);
                setCheckedCurrent(true);
                setIsLoading(false);
                console.debug('[POSSystem] mount: runtime byId hit');
                return;
              }
            } catch {}
          }
          if (branchIdRt && sectionIdRt) {
            const curRt = await api.shifts.current({ branchId: branchIdRt, sectionId: sectionIdRt });
            if (curRt && !curRt.closedAt) {
              setShiftRegister(curRt);
              setCheckedCurrent(true);
              setIsLoading(false);
              console.debug('[POSSystem] mount: runtime hint hit');
              return;
            }
          }
        } catch {}
        // Short-circuit if parent already resolved an initial open shift
        if (!shiftRegister && initialShift && initialShift.id && !initialShift.closedAt) {
          setShiftRegister(initialShift);
          setCheckedCurrent(true);
          setIsLoading(false);
          console.debug('[POSSystem] mount: initialShift provided');
          return;
        }
        console.debug('[POSSystem] mount: early probe start');
        // First, hard-gate on current endpoints to avoid modal flash
        try {
          const meCur0 = await api.shifts.currentMe();
          if (meCur0 && meCur0.id && !meCur0.closedAt) {
            setShiftRegister(meCur0);
            setCheckedCurrent(true);
            setIsLoading(false);
            console.debug('[POSSystem] mount: current(me) immediate hit');
            return;
          }
        } catch {}
        try {
          const anyCur0 = await api.shifts.current({});
          if (anyCur0 && anyCur0.id && !anyCur0.closedAt) {
            setShiftRegister(anyCur0);
            setCheckedCurrent(true);
            setIsLoading(false);
            console.debug('[POSSystem] mount: current(any) immediate hit');
            return;
          }
        } catch {}
        try {
          const branchId = user?.branchId || user?.branch?.id;
          if (branchId) {
            const curBr0 = await api.shifts.currentBranch({ branchId });
            if (curBr0 && curBr0.id && !curBr0.closedAt) {
              setShiftRegister(curBr0);
              setCheckedCurrent(true);
              setIsLoading(false);
              console.debug('[POSSystem] mount: current(branch) immediate hit');
              return;
            }
          }
        } catch {}
        setCheckedCurrent(true);

        const foundEarly = await probeOpenShift(user?.branchId || user?.branch?.id || null);
        if (foundEarly) {
          setShiftRegister(foundEarly);
          setIsLoading(false);
          console.debug('[POSSystem] mount: foundEarly via probes');
          return;
        }
        console.debug('[POSSystem] mount: no early hit');
      } catch {}
    })();

    (async () => {
      try {
        if (initialShift && initialShift.id && !initialShift.closedAt) {
          // Do not override a user-selected shift; consider loading done
          setIsLoading(false);
          return;
        }
        let branchId = user?.branchId || user?.branch?.id;
        if (!branchId) {
          try {
            const me = await api.me();
            branchId = me?.branchId || me?.branch?.id || branchId;
          } catch {}
        }
        if (!branchId) { setIsLoading(false); setShiftRegister(null); return; }
        const found = await probeOpenShift(branchId);
        if (found) {
          if (pinnedShiftIdRef.current && found.id !== pinnedShiftIdRef.current) {
            return;
          }
          setShiftRegister(found);
          return;
        }
        setShiftRegister(null);
      } catch {
        setShiftRegister(null);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [user?.branchId]);

  useEffect(() => {
    // When branch changes, only show loading if we don't already have a pinned/selected shift
    if (pinnedShiftIdRef.current || (shiftRegister && shiftRegister.id)) {
      return;
    }
    setIsLoading(true);
  }, [user?.branchId, shiftRegister?.id]);

  useEffect(() => {
    // Schedule a short re-probe to avoid any race with backend preference or sections load
    const t = setTimeout(async () => {
      try {
        if (shiftRegister || !user?.branchId) return;
        const found = await probeOpenShift(user.branchId);
        if (found) setShiftRegister(found);
      } catch {}
    }, 400);
    return () => clearTimeout(t);
  }, [shiftRegister, user?.branchId]);

  // Single source of truth hook for current shift (refreshes on branch change)
  const { shift: hookShift, loading: hookLoading, refresh } = useCurrentShift({ branchId: user?.branchId || user?.branch?.id });

  // Keep local shiftRegister aligned with hook values
  useEffect(() => {
    if (hookShift && !hookShift.closedAt) {
      if (pinnedShiftIdRef.current && hookShift.id !== pinnedShiftIdRef.current) {
        return;
      }
      setShiftRegister(hookShift);
      setIsLoading(false);
      setCheckedCurrent(true);
    }
  }, [hookShift]);

  useEffect(() => {
    if (!hookShift && checkedCurrent) {
      setShiftRegister(null);
      setIsLoading(false);
    }
  }, [hookShift, checkedCurrent]);

  const handleShiftOpen = (newRegister) => {
    setShiftRegister(newRegister);
    // update global cache too
    try { refresh(true); } catch {}
  };

  const handleShiftClose = () => {
    setShiftRegister(null);
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  };

  const renderContent = () => {
    if (isLoading || !checkedCurrent) {
      return (
        <div className="flex items-center justify-center h-screen bg-pos-background">
          <p className="text-pos-text">Loading...</p>
        </div>
      );
    }

    if (shiftRegister) {
      return (
        <motion.div key="pos-interface" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <POSInterface 
            user={user} 
            toggleTheme={toggleTheme} 
            currentTheme={theme} 
            onBackToDashboard={onBackToDashboard}
            onLogout={onLogout}
            onOpenProfile={onOpenProfile}
            shiftRegister={shiftRegister}
            onShiftClose={handleShiftClose}
          />
        </motion.div>
      );
    }

    return (
      <motion.div key="open-shift" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <OpenShiftRegister onShiftOpen={handleShiftOpen} user={user} />
      </motion.div>
    );
  };

  return (
    <ErrorBoundary>
      <Thrower error={fatalError} />
      <div className="w-full h-screen bg-pos-background text-pos-text overflow-hidden">
        <AnimatePresence mode="wait">
          {renderContent()}
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
};

export default POSSystem;