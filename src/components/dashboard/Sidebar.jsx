
import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { AnimatePresence, motion } from 'framer-motion';
import { Home, BarChart2, Package, Users, Shield, ShoppingCart, Utensils, Beer, Building, UserCheck, HardHat, Receipt, Settings, Waypoints, Tag, X, ClipboardList as AddressBook } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { hasAny } from '@/lib/permissions';

const Sidebar = ({ user, activeTab, setActiveTab, isOpen, setOpen, onGoToPOS }) => {
  const perms = Array.isArray(user?.permissions) ? user.permissions : [];
  const isAdmin = String(user?.role || '').toUpperCase() === 'ADMIN';
  // Declare required permissions for each nav entry. If none, entry is public post-login.
  const navItems = [
    { name: 'overview', icon: Home, label: 'Overview', anyOf: [] },
    { name: 'orders', icon: ShoppingCart, label: 'Order Management', anyOf: ['view_all_sales','view_own_sales','view_pos_sell','add_pos_sell','edit_pos_sell'] },
    { name: 'tables', icon: Utensils, label: 'Table Management', anyOf: ['view_tables','add_tables','edit_tables'] },
    { name: 'products', icon: Beer, label: 'Product Management', anyOf: ['view_product','add_product','edit_product'] },
    { name: 'inventory', icon: Package, label: 'Inventory', anyOf: ['purchase_manage_inventory','view_stock_related_reports','view_product_stock_value','view_product'] },
    { name: 'production', icon: HardHat, label: 'Production', anyOf: ['section_pricing','stock_transfer','stock_adjustment'] },
    { name: 'purchase', icon: Receipt, label: 'Purchase', anyOf: ['view_all_purchase','view_own_purchase','add_purchase','edit_purchase'] },
    { name: 'sell', icon: Tag, label: 'Sell Management', anyOf: ['view_pos_sell','add_pos_sell','edit_pos_sell','delete_pos_sell'] },
    { name: 'staff', icon: Users, label: 'User Management', anyOf: ['view_user','add_user','edit_user'] },
    { name: 'contacts', icon: AddressBook, label: 'Contacts', anyOf: ['view_all_customer','view_own_customer','add_supplier','add_customer'] },
    { name: 'roles', icon: Shield, label: 'Roles & Permissions', anyOf: ['view_role','add_role','edit_role'] },
    { name: 'hrm', icon: UserCheck, label: 'HRM', anyOf: ['view_employee','view_shift'] },
    { name: 'shift-register', icon: Waypoints, label: 'Shift Register', anyOf: ['view_cash_register','open_shift_register','close_cash_register'] },
    { name: 'branches', icon: Building, label: 'Branches', anyOf: ['view_branch_section','add_branch_section'] },
    { name: 'reports', icon: BarChart2, label: 'Reports', anyOf: ['view_purchase_sell_report','view_profit_loss_report','view_stock_related_reports'] },
    { name: 'settings', icon: Settings, label: 'Settings', anyOf: ['settings','access_business_settings','access_invoice_settings','access_printers','access_barcode_settings'] }
  ];

  const visibleNav = isAdmin ? navItems : navItems.filter(it => it.anyOf.length === 0 || hasAny(perms, it.anyOf));

  const canPOS = isAdmin || perms.includes('all') || ['view_pos_sell','add_pos_sell','edit_pos_sell','delete_pos_sell'].some(p => perms.includes(p));

  const [biz, setBiz] = useState(() => {
    try { return JSON.parse(localStorage.getItem('businessInfo') || '{}') || {}; } catch { return {}; }
  });
  useEffect(() => {
    let cancelled = false;
    const sync = () => {
      try { if (!cancelled) setBiz(JSON.parse(localStorage.getItem('businessInfo') || '{}') || {}); } catch {}
    };
    const fetchBrand = async () => {
      try {
        let branchId = user?.branchId || undefined;
        if (!branchId) {
          try { branchId = localStorage.getItem('selectedBranchId') || undefined; } catch {}
        }
        if (branchId) {
          const s = await api.settings.get({ branchId });
          const info = {
            name: s?.businessName || '',
            logoUrl: s?.logoUrl || '',
            address: s?.address || '',
            phone: s?.phone || '',
            email: s?.email || '',
            currencySymbol: s?.currencySymbol || s?.currency || '₦',
            currency: s?.currency || 'NGN',
            theme: s?.theme || undefined,
          };
          if (!cancelled) setBiz(info);
          try { localStorage.setItem('businessInfo', JSON.stringify(info)); window.dispatchEvent(new Event('businessInfoUpdated')); } catch {}
        }
      } catch {}
    };
    fetchBrand();
    window.addEventListener('storage', sync);
    window.addEventListener('businessInfoUpdated', sync);
    return () => {
      cancelled = true;
      window.removeEventListener('storage', sync);
      window.removeEventListener('businessInfoUpdated', sync);
    };
  }, [user?.branchId]);
  const brandName = biz.name || '';
  const logoUrl = biz.logoUrl || '';
  return (
    <>
      <div className="hidden lg:block">
        <NavContent navItems={visibleNav} activeTab={activeTab} setActiveTab={setActiveTab} onGoToPOS={onGoToPOS} canPOS={canPOS} />
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="fixed top-0 left-0 h-full w-72 bg-card text-card-foreground z-50 lg:hidden"
            >
              <NavContent navItems={visibleNav} activeTab={activeTab} setActiveTab={setActiveTab} setOpen={setOpen} onGoToPOS={onGoToPOS} canPOS={canPOS} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

const NavContent = ({ navItems, activeTab, setActiveTab, setOpen, onGoToPOS, canPOS }) => {
  const [biz, setBiz] = useState(() => {
    try { return JSON.parse(localStorage.getItem('businessInfo') || '{}') || {}; } catch { return {}; }
  });
  useEffect(() => {
    let cancelled = false;
    const sync = () => {
      try { if (!cancelled) setBiz(JSON.parse(localStorage.getItem('businessInfo') || '{}') || {}); } catch {}
    };
    const fetchBrand = async () => {
      try {
        let branchId = undefined;
        try { branchId = localStorage.getItem('selectedBranchId') || undefined; } catch {}
        if (!branchId) return;
        const s = await api.settings.get({ branchId });
        const info = {
          name: s?.businessName || '',
          logoUrl: s?.logoUrl || '',
          address: s?.address || '',
          phone: s?.phone || '',
          email: s?.email || '',
          currencySymbol: s?.currencySymbol || s?.currency || '₦',
          currency: s?.currency || 'NGN',
          theme: s?.theme || undefined,
        };
        if (!cancelled) setBiz(info);
        try { localStorage.setItem('businessInfo', JSON.stringify(info)); window.dispatchEvent(new Event('businessInfoUpdated')); } catch {}
      } catch {}
    };
    fetchBrand();
    window.addEventListener('storage', sync);
    window.addEventListener('businessInfoUpdated', sync);
    return () => {
      cancelled = true;
      window.removeEventListener('storage', sync);
      window.removeEventListener('businessInfoUpdated', sync);
    };
  }, []);
  const brandName = biz.name || '';
  const logoUrl = biz.logoUrl || '';
  return (
    <div className="h-screen flex flex-col border-r shadow-lg bg-white dark:bg-slate-800">
      <div className="flex items-center justify-between p-4 h-[65px] border-b">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt="logo" className="w-10 h-10 object-contain" />
          ) : (
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <Utensils className="text-white w-6 h-6" />
            </div>
          )}
          <h1 className="text-xl font-bold text-slate-800 dark:text-white">{brandName}</h1>
        </div>
        {setOpen && (
           <Button variant="ghost" size="icon" onClick={() => setOpen(false)} className="lg:hidden">
            <X className="w-5 h-5"/>
           </Button>
        )}
      </div>
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {navItems.map(item => <NavItem key={item.name} item={item} isActive={activeTab === item.name} onClick={() => setActiveTab(item.name)} />)}
      </nav>
      {canPOS && (
        <div className="p-4 border-t">
          <button onClick={() => (onGoToPOS ? onGoToPOS() : setActiveTab('pos'))} className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white h-12 rounded-lg font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
            <BarChart2 className="w-5 h-5" />
            <span>Go to POS</span>
          </button>
        </div>
      )}
    </div>
  );
};


const NavItem = ({ item, isActive, onClick }) => {
  const { icon: Icon, label } = item;
  return (
    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
      <button 
        onClick={onClick} 
        className={`w-full flex items-center h-11 px-4 rounded-lg transition-all duration-200 text-sm ${
          isActive 
            ? 'bg-blue-100 text-blue-600 font-semibold dark:bg-blue-900/50 dark:text-blue-300' 
            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200'
        }`}
      >
        <Icon className="w-5 h-5 mr-4 flex-shrink-0" />
        <span className="truncate">{label}</span>
      </button>
    </motion.div>
  );
};

export default Sidebar;
