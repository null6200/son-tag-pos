import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '@/components/dashboard/Sidebar';
import Header from '@/components/dashboard/Header';
import Overview from '@/components/dashboard/Overview';
import POSSystem from '@/components/dashboard/POSSystem';
import { api } from '@/lib/api';
import Inventory from '@/components/dashboard/Inventory';
import UserManagement from '@/components/dashboard/UserManagement';
import UserOverview from '@/components/dashboard/UserOverview';
import Reports from '@/components/dashboard/Reports';
import Branches from '@/components/dashboard/Branches';
import OrderManagement from '@/components/dashboard/OrderManagement';
import TableManagement from '@/components/dashboard/TableManagement';
import HRM from '@/components/dashboard/HRM';
import Production from '@/components/dashboard/Production';
import Purchase from '@/components/dashboard/Purchase';
import Sell from '@/components/dashboard/Sell';
import RolesAndPermissions from '@/components/dashboard/RolesAndPermissions';
import ProductManagement from '@/components/dashboard/ProductManagement';
import Settings from '@/components/dashboard/Settings';
import ShiftRegister from '@/components/dashboard/ShiftRegister';
import SectionManagement from '@/components/dashboard/branches/SectionManagement';
import BusinessSettings from '@/components/dashboard/settings/BusinessSettings';
import TaxSettings from '@/components/dashboard/settings/TaxSettings';
import DiscountSettings from '@/components/dashboard/settings/DiscountSettings';
import SectionFunctionsManagement from '@/components/dashboard/settings/SectionFunctionsManagement';
import ProductTypesManagement from '@/components/dashboard/settings/ProductTypesManagement';
import ServiceTypesManagement from '@/components/dashboard/settings/ServiceTypesManagement';
import CalendarPage from '@/components/dashboard/CalendarPage';
import Contacts from '@/components/dashboard/Contacts';
import Footer from '@/components/dashboard/Footer'; // Import the new Footer component
import { hasAny } from '@/lib/permissions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const Dashboard = ({ user, onLogout, theme, setTheme, initialShift, draftToLoad, onSetDraftToLoad, onClearDraftToLoad }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [managingSectionsFor, setManagingSectionsFor] = useState(null);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [posInitialShift, setPosInitialShift] = useState(initialShift || null);
  const [posEntryModalOpen, setPosEntryModalOpen] = useState(false);
  const [openShifts, setOpenShifts] = useState([]);
  const [selectedShiftId, setSelectedShiftId] = useState(null);

  const handleManageSections = (branch) => {
    setManagingSectionsFor(branch);
    setActiveTab('manage-sections');
  };

  const handleBackToBranches = () => {
    setManagingSectionsFor(null);
    setActiveTab('branches');
  };

  const handleBackToSettings = () => {
    setActiveTab('settings');
  };
  
  const handleSetActiveTab = (tab) => {
    setActiveTab(tab);
    setSidebarOpen(false);
  };

  // Do not auto-enter POS; selection happens via entry modal
  useEffect(() => {
    if (activeTab !== 'pos') return;
    // Keep whatever was chosen in the modal; no probing or overrides here
  }, [activeTab]);

  const goToPOS = async () => {
    try {
      try { if (toast) toast({ title: 'POS', description: 'Choose a shift to enter or open a new one…' }); } catch {}
      // Always show modal with options
      const branchId = user?.branchId || user?.branch?.id;
      let list = [];
      let sectionsById = {};
      try {
        const resp = await api.shifts.list({ branchId, status: 'OPEN', limit: 50, offset: 0 });
        list = Array.isArray(resp) ? resp : (Array.isArray(resp?.items) ? resp.items : []);
      } catch {}
      try {
        if (branchId) {
          const secs = await api.sections.list({ branchId });
          const arr = Array.isArray(secs) ? secs : [];
          sectionsById = Object.fromEntries(arr.map(s => [s.id, s.name]));
          list = list.map(s => ({ ...s, sectionName: s.sectionName || sectionsById[s.sectionId] || 'Section' }));
        }
      } catch {}
      // Include the user's own open shift (if any) and preselect it
      try {
        const meCur = await api.shifts.currentMe();
        if (meCur && meCur.id && !meCur.closedAt) {
          const exists = list.some(x => x.id === meCur.id);
          const withName = { ...meCur, sectionName: meCur.sectionName || sectionsById[meCur.sectionId] || 'Section' };
          if (!exists) list = [withName, ...list];
          setSelectedShiftId(meCur.id);
        } else {
          // Try last-used section from runtime or userPrefs to preselect matching open shift
          let lastSectionId = null;
          try {
            const rt = await api.users.getRuntime();
            lastSectionId = rt?.lastShiftSection || null;
          } catch {}
          if (!lastSectionId && branchId) {
            try {
              const pref = await (api.userPrefs?.get?.({ key: 'lastShiftSection', branchId }));
              lastSectionId = (pref && typeof pref === 'object') ? pref.value : pref;
            } catch {}
          }
          if (lastSectionId) {
            const match = list.find(x => x.sectionId === lastSectionId) || null;
            setSelectedShiftId(match?.id || list?.[0]?.id || null);
          } else {
            setSelectedShiftId(list?.[0]?.id || null);
          }
        }
      } catch {
        // Fallback to last-used section preference if available
        let picked = list?.[0]?.id || null;
        try {
          const rt = await api.users.getRuntime();
          const lastSectionId = rt?.lastShiftSection || null;
          if (lastSectionId) {
            const match = list.find(x => x.sectionId === lastSectionId);
            if (match) picked = match.id;
          }
        } catch {}
        setSelectedShiftId(picked);
      }
      setOpenShifts(list);
      setPosEntryModalOpen(true);
    } catch {}
  };

  const renderContent = () => {
    const perms = Array.isArray(user?.permissions) ? user.permissions : [];
    const canOpenShift = hasAny(perms, ['open_shift_register']);
    const NoAccess = () => (<div className="p-6 text-sm text-muted-foreground">You don't have permission to access this section.</div>);
    const guard = (anyOf, el) => (anyOf && anyOf.length && !hasAny(perms, anyOf) ? <NoAccess /> : el);
    if (activeTab === 'pos') {
      return <POSSystem user={user} initialShift={posInitialShift || initialShift} onBackToDashboard={() => setActiveTab('overview')} onLogout={onLogout} onOpenProfile={() => setActiveTab('user-overview')} theme={theme} setTheme={setTheme} draftToLoad={draftToLoad} onClearDraftToLoad={onClearDraftToLoad} />;
    }

    switch (activeTab) {
      case 'overview':
        return <Overview user={user} setActiveTab={handleSetActiveTab} />;
      case 'inventory':
        return guard(['purchase_manage_inventory','view_stock_related_reports','view_product'], <Inventory user={user} />);
      case 'staff':
        return guard(['view_user','add_user','edit_user'], <UserManagement user={user} />);
      case 'user-overview':
        return <UserOverview user={user} />;
      case 'contacts':
        return guard(['view_all_customer','view_own_customer','add_supplier','add_customer'], <Contacts user={user} />);
      case 'roles':
        return guard(['view_role','add_role','edit_role'], <RolesAndPermissions user={user} />);
      case 'products':
        return guard(['view_product','add_product','edit_product'], <ProductManagement user={user} />);
      case 'reports':
        return guard(['view_purchase_sell_report','view_profit_loss_report','view_stock_related_reports'], <Reports user={user} />);
      case 'branches':
        return guard(['view_branch_section','add_branch_section'], <Branches user={user} onManageSections={handleManageSections} />);
      case 'manage-sections':
        return guard(['view_branch_section','edit_branch_section','add_branch_section'], <SectionManagement branch={managingSectionsFor} onBack={handleBackToBranches} />);
      case 'orders':
        return guard(['view_all_sales','view_own_sales','view_pos_sell','add_pos_sell','edit_pos_sell'], <OrderManagement user={user} />);
      case 'tables':
        return guard(['view_tables','add_tables','edit_tables'], <TableManagement user={user} />);
      case 'hrm':
        return guard(['view_employee','view_shift'], <HRM user={user} />);
      case 'production':
        return guard(['section_pricing','stock_transfer','stock_adjustment'], <Production user={user} />);
      case 'purchase':
        return guard(['view_all_purchase','view_own_purchase','add_purchase','edit_purchase'], <Purchase user={user} />);
      case 'sell':
        return guard(['view_pos_sell','add_pos_sell','edit_pos_sell','delete_pos_sell'], <Sell user={user} setActiveTab={handleSetActiveTab} onSetDraftToLoad={onSetDraftToLoad} onGoToPOS={goToPOS} />);
      case 'shift-register':
        return guard(['view_cash_register','close_cash_register'], <ShiftRegister user={user} />);
      case 'settings':
        return guard(['settings','access_business_settings','access_invoice_settings','access_printers','access_barcode_settings'], <Settings theme={theme} setTheme={setTheme} user={user} setActiveTab={handleSetActiveTab} />);
      case 'business-settings':
        return guard(['access_business_settings'], <BusinessSettings onBack={handleBackToSettings} user={user} />);
      case 'tax-settings':
        return guard(['access_invoice_settings'], <TaxSettings onBack={handleBackToSettings} />);
      case 'discount-settings':
        return guard(['access_invoice_settings'], <DiscountSettings onBack={handleBackToSettings} />);
      case 'settings-section-functions':
        return guard(['view_branch_section','edit_branch_section'], <SectionFunctionsManagement user={user} onBack={handleBackToSettings} />);
      case 'settings-product-types':
        return guard(['purchase_manage_inventory','view_product'], <ProductTypesManagement user={user} onBack={handleBackToSettings} />);
      case 'settings-service-types':
        return guard(['purchase_manage_inventory','view_product'], <ServiceTypesManagement user={user} />);
      case 'calendar':
        return <CalendarPage />;
      default:
        return <Overview user={user} setActiveTab={handleSetActiveTab} />;
    }
  };

  if (activeTab === 'pos') {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex-1 flex flex-col">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="h-screen"
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
      <Sidebar user={user} activeTab={activeTab} setActiveTab={handleSetActiveTab} isOpen={isSidebarOpen} setOpen={setSidebarOpen} onGoToPOS={goToPOS} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={user} onLogout={onLogout} onMenuClick={() => setSidebarOpen(true)} setActiveTab={setActiveTab} onGoToPOS={goToPOS} />
        
        <main className="flex-1 overflow-auto p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>
        <Footer /> {/* Add the Footer component here */}
      </div>
      {/* POS Entry Modal */}
      <Dialog open={posEntryModalOpen} onOpenChange={setPosEntryModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>POS Access</DialogTitle>
            <DialogDescription>
              Choose to open a new shift or continue with an existing open shift.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {hasAny(Array.isArray(user?.permissions)?user.permissions:[], ['open_shift_register']) && (
              <Button className="w-full" onClick={() => { setPosEntryModalOpen(false); setActiveTab('shift-register'); }}>
                Open New Shift
              </Button>
            )}
            <div className="border rounded-md p-3">
              <div className="text-sm mb-2 font-medium">Continue with Open Shifts</div>
              {openShifts && openShifts.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-auto">
                  {openShifts.map(s => (
                    <label key={s.id} className={`flex items-center gap-2 p-2 rounded border ${selectedShiftId === s.id ? 'border-blue-600 bg-blue-50' : 'border-slate-200'}`}>
                      <input type="radio" name="openShift" checked={selectedShiftId === s.id} onChange={() => setSelectedShiftId(s.id)} />
                      <div className="flex-1">
                        <div className="text-sm font-semibold">{s.sectionName || 'Section'}</div>
                        <div className="text-xs text-muted-foreground">Opened by {s.userName || s.openedByName || s.openedBy || 'User'} at {s.openedAt ? new Date(s.openedAt).toLocaleString() : ''}</div>
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No open shifts found in this branch.</div>
              )}
            </div>
          </div>
          <DialogFooter className="justify-between">
            {hasAny(Array.isArray(user?.permissions)?user.permissions:[], ['view_branch_section','add_branch_section','edit_branch_section']) && (
              <Button variant="ghost" onClick={() => { setPosEntryModalOpen(false); setActiveTab('branches'); }}>
                Manage Sections
              </Button>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPosEntryModalOpen(false)}>Cancel</Button>
              <Button disabled={!selectedShiftId} onClick={async () => {
                try {
                  if (!selectedShiftId) return;
                  // Re-validate that the selected shift is still open
                  let latest = null;
                  try { latest = await api.shifts.get(selectedShiftId); } catch {}
                  if (!latest || latest.closedAt) {
                    try { if (toast) toast({ title: 'Shift unavailable', description: 'The selected shift has been closed or is no longer available. Please choose another.', variant: 'destructive' }); } catch {}
                    // Refresh the open shift list in-place
                    try {
                      const branchId = user?.branchId || user?.branch?.id;
                      let list = [];
                      try {
                        const resp = await api.shifts.list({ branchId, status: 'OPEN', limit: 50, offset: 0 });
                        list = Array.isArray(resp) ? resp : (Array.isArray(resp?.items) ? resp.items : []);
                      } catch {}
                      try {
                        if (branchId) {
                          const secs = await api.sections.list({ branchId });
                          const arr = Array.isArray(secs) ? secs : [];
                          const byId = Object.fromEntries(arr.map(s => [s.id, s.name]));
                          list = list.map(s => ({ ...s, sectionName: s.sectionName || byId[s.sectionId] || 'Section' }));
                        }
                      } catch {}
                      setOpenShifts(list);
                      setSelectedShiftId(list?.[0]?.id || null);
                    } catch {}
                    return;
                  }
                  const s = latest || openShifts.find(x => x.id === selectedShiftId);
                  setPosInitialShift(s || null);
                  setPosEntryModalOpen(false);
                  setTimeout(() => setActiveTab('pos'), 0);
                } catch {}
              }}>Continue</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
