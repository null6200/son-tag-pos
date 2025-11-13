  
// Normalize prices payload from backend into a simple { [productId]: number } map
function normalizePricesMap(prices) {
  const out = {};
  try {
    if (!prices) return out;
    if (Array.isArray(prices)) {
      for (const row of prices) {
        const pid = String(row?.productId ?? row?.id ?? row?.product?.id ?? '');
        if (!pid) continue;
        const val = Number(row?.price ?? row?.amount ?? row?.value);
        out[pid] = Number.isFinite(val) ? val : 0;
      }
      return out;
    }
    if (typeof prices === 'object') {
      for (const [k, v] of Object.entries(prices)) {
        const key = String(k);
        const val = Number(v);
        out[key] = Number.isFinite(val) ? val : 0;
      }
      return out;
    }
  } catch {}
  return out;
}

    import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Plus, Minus, X, Wifi, WifiOff, Sun, Moon, Bell, Coffee, Wallet, Trash2, ChevronDown, ArrowLeft, Eye, DollarSign, Info, FileText, FolderOpen, CreditCard, Landmark, Layers, Printer, User as UserIcon, ChefHat, Beer, LogOut, Download, Pencil, Image, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import PinModal from '@/components/pos/PinModal';
import OverridePinModal from '@/components/common/OverridePinModal';
import ServiceStaffPinModal from '@/components/common/ServiceStaffPinModal';
import { hasPermission, hasAny } from '@/lib/permissions';
import PaymentModal from '@/components/pos/PaymentModal';
import CashDrawerModal from '@/components/pos/CashDrawerModal';
import CardTerminalModal from '@/components/pos/CardTerminalModal';
import PrintView from '@/components/pos/PrintView';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuGroup,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { api, getApiBaseUrl } from '@/lib/api';

// Lightweight theme applier using CSS variables; supports at least 5 themes
function applyTheme(name) {
  const root = document.documentElement;
  const THEMES = {
    light: {
      '--background': '0 0% 100%',
      '--foreground': '222.2 84% 4.9%',
      '--card': '0 0% 100%',
      '--primary': '221.2 83.2% 53.3%',
      '--accent': '210 40% 96.1%',
      '--pos-background': '0 0% 100%',
    },
    dark: {
      '--background': '224 71% 4%',
      '--foreground': '210 40% 98%',
      '--card': '222.2 84% 4.9%',
      '--primary': '217.2 91.2% 59.8%',
      '--accent': '217.2 32.6% 17.5%',
      '--pos-background': '0 0% 100%',
    },
    emerald: {
      '--background': '0 0% 100%',
      '--foreground': '222.2 84% 4.9%',
      '--card': '0 0% 100%',
      '--primary': '160 84% 43%',
      '--accent': '210 40% 96.1%',
      '--pos-background': '0 0% 100%',
    },
    rose: {
      '--background': '0 0% 100%',
      '--foreground': '24 24% 11%',
      '--card': '0 0% 100%',
      '--primary': '346 77% 58%',
      '--accent': '45 93% 50%',
      '--pos-background': '0 0% 100%',
    },
    slate: {
      '--background': '210 40% 98%',
      '--foreground': '222.2 84% 4.9%',
      '--card': '0 0% 100%',
      '--primary': '215 16% 47%',
      '--accent': '210 40% 96.1%',
      '--pos-background': '0 0% 100%',
    },
  };
}

// Safe money formatter for numbers or numeric strings with business currency
function fmt(v) {
  try {
    const info = JSON.parse(localStorage.getItem('businessInfo') || '{}');
    const code = info?.currency || info?.currencyCode || '';
    const sym = info?.currencySymbol || '';
    const n = Number(v);
    if (!Number.isFinite(n)) return `${sym ? sym + ' ' : ''}0.00`;
    if (code) {
      try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).format(n); } catch {}
    }
    return `${sym ? sym + ' ' : ''}${n.toFixed(2)}`;
  } catch {
    const n = Number(v);
    return Number.isFinite(n) ? n.toFixed(2) : '0.00';
  }
}


const defaultServiceTypes = ['Dine-in', 'Takeaway'];
const customerTypes = ['Walk-in', 'Member', 'VIP', 'Corporate'];

const categories = ['All'];


const POSInterface = ({ user, toggleTheme, currentTheme, onBackToDashboard, onLogout, shiftRegister, onShiftClose, draftToLoad, onClearDraftToLoad }) => {
  const [time, setTime] = useState(new Date());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [cart, setCart] = useState([]);
  const [currentSection, setCurrentSection] = useState('');
  const [branchSections, setBranchSections] = useState([]);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [currentService, setCurrentService] = useState('');
  const [currentCustomer, setCurrentCustomer] = useState(customerTypes[0]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [isPinModalOpen, setPinModalOpen] = useState(false);
  const [isPaymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentMode, setPaymentMode] = useState('cash');
  const [isCashDrawerModalOpen, setCashDrawerModalOpen] = useState(false);
  const [isCardTerminalModalOpen, setCardTerminalModalOpen] = useState(false);
  const [pinAction, setPinAction] = useState(null);
  const [tables, setTables] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [isDraftsOpen, setIsDraftsOpen] = useState(false);
  const [editingDraft, setEditingDraft] = useState(null);
  const [printData, setPrintData] = useState(null);
  const [reservationKey, setReservationKey] = useState(() => {
    try { return `CART|${(crypto && crypto.randomUUID && crypto.randomUUID()) || Math.random().toString(36).slice(2)}`; } catch { return `CART|${Math.random().toString(36).slice(2)}`; }
  });
  const printRef = useRef();
  const cartRef = useRef(cart);
  const sectionRef = useRef(currentSection);
  const reservationKeyRef = useRef(reservationKey);
  const [products, setProducts] = useState([]);
  const [stockLevels, setStockLevels] = useState({});
  const [stockReady, setStockReady] = useState(false);
  const [sectionPrices, setSectionPrices] = useState({});
  const [userPermissions, setUserPermissions] = useState([]);
  const [serviceStaffList, setServiceStaffList] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [isServicePinModalOpen, setServicePinModalOpen] = useState(false);
  const [pendingStaffId, setPendingStaffId] = useState(null);
  const [protectedActions, setProtectedActions] = useState(['decrement', 'void', 'delete_draft', 'approve_credit_sale']);
  const [graceSeconds, setGraceSeconds] = useState(0);
  const [isOverrideOpen, setOverrideOpen] = useState(false);
  const [pendingOverride, setPendingOverride] = useState(null); // { type, payload, onApproved }
  const [pendingCreditSale, setPendingCreditSale] = useState(null);
  const addingLockRef = useRef(new Set());

  // Optimistic stock: schedule a debounced refresh so backend snapshot does not clobber UI instantly
  const scheduleRefreshPricingAndStock = (delayMs = 700) => {
    try { setTimeout(() => { try { refreshPricingAndStock(); } catch {} }, Math.max(0, Number(delayMs) || 0)); } catch {}
  };

  // Optimistically mutate per-section stockLevels for a given product
  const adjustLocalSectionStock = (productId, diff) => {
    try {
      if (!currentSection) return;
      const sectionName = (branchSections || []).find(s => s.id === currentSection)?.name || '';
      setStockLevels(prev => {
        const next = { ...prev };
        const pid = String(productId);
        next[pid] = next[pid] || {};
        const key = sectionName || 'default';
        const cur = Number(next[pid][key] ?? 0);
        const val = cur + Number(diff || 0);
        const safe = Math.max(0, val);
        next[pid][key] = safe;
        if (sectionName) next[pid][sectionName] = safe;
        // Keep fallback aligned to avoid UI using stale 'default' value
        next[pid]['default'] = safe;
        return next;
      });
      try { console.debug('[POS] optimistic section stock', { productId: String(productId), diff, sectionName: sectionName || 'default' }); } catch {}
      setStockReady(true);
    } catch {}
  };

  // Drafts pagination state (must be defined before use)
  const [draftsPage, setDraftsPage] = useState(1);
  const [draftsPageSize, setDraftsPageSize] = useState(20);
  const [draftsTotal, setDraftsTotal] = useState(0);
  const [loadingDrafts, setLoadingDrafts] = useState(false);

  const draftsStorageKey = null;

  // Load user permissions from current user or localStorage for UI gating
  useEffect(() => {
    try {
      let perms = Array.isArray(user?.permissions) ? user.permissions : [];
      if (!perms || perms.length === 0) {
        const raw = localStorage.getItem('loungeUser');
        if (raw) {
          const stored = JSON.parse(raw);
          if (Array.isArray(stored?.permissions)) perms = stored.permissions;
          // ADMIN override handled by hasPermission helper
        }
      }
      setUserPermissions(Array.isArray(perms) ? perms : []);
    } catch { setUserPermissions([]); }
  }, [user?.permissions]);

  useEffect(() => {
    // Always load drafts from backend when context changes
    try { fetchDrafts(1); } catch {}
  }, [currentSection, user?.branchId]);

  // Load business settings (name, logo, currency, address, etc.) and cache for print templates
  useEffect(() => {
    (async () => {
      try {
        const bid = user?.branchId || user?.branch?.id || undefined;
        const s = await api.settings.get(bid ? { branchId: bid } : {});
        if (s) {
          const info = {
            name: s.businessName || '',
            logoUrl: s.logoUrl || '',
            address: s.address || '',
            phone: s.phone || '',
            email: s.email || '',
            currencySymbol: s.currencySymbol || s.currency || '₦',
            receiptFooterNote: s.receiptFooterNote || '',
            invoiceFooterNote: s.invoiceFooterNote || '',
          };
          try { localStorage.setItem('businessInfo', JSON.stringify(info)); window.dispatchEvent(new Event('businessInfoUpdated')); } catch {}
          // Apply admin-configured tax rate if present
          if (typeof s.taxRate === 'number' && !Number.isNaN(s.taxRate)) {
            setTaxRate(Number(s.taxRate));
          }
        }
      } catch {}
    })();
  }, [user?.branchId]);

  // Disable localStorage persistence for drafts; backend is source of truth

  // Helper to map backend drafts to UI shape
  const mapDrafts = (rows) => (rows || []).map(r => ({
    id: r.id,
    backendId: r.id,
    name: r.name,
    invoice: null,
    cart: r.cart || [],
    service: r.serviceType,
    customer: r.customerName,
    customerDetails: r.customerPhone ? { phone: r.customerPhone } : undefined,
    table: r.tableId ? (tables.find(t => t.id === r.tableId) || { id: r.tableId, name: 'Table' }) : null,
    sectionId: r.sectionId || currentSection,
    total: Number(r.total || 0),
    waiter: r.waiterId ? (serviceStaffList.find(s => s.id === r.waiterId)?.username || '') : '',
    waiterId: r.waiterId || null,
    orderId: r.orderId || null,
    discount: { type: 'percentage', value: 0 },
    taxRate: 10,
    isSuspended: r.status === 'SUSPENDED',
    reservationKey: r.reservationKey || null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));

  const fetchDrafts = async (page = 1) => {
    setLoadingDrafts(true);
    try {
      const sec = (branchSections || []).find(s => s.id === currentSection);
      const resolvedBranchId = user?.branchId || user?.branch?.id || sec?.branchId || undefined;
      if (!resolvedBranchId) { // avoid 400s when branch not resolved yet
        setDrafts([]);
        setDraftsTotal(0);
        return;
      }
      const res = await api.drafts.list({ branchId: resolvedBranchId, sectionId: currentSection, page, pageSize: draftsPageSize });
      if (Array.isArray(res)) {
        // Backward compatibility if server returns array
        let items = mapDrafts(res);
        // Enrich suspended drafts with invoice numbers
        try {
          const targets = items.filter(d => d.isSuspended && d.orderId);
          if (targets.length) {
            const settled = await Promise.allSettled(targets.map(d => api.orders.get(String(d.orderId))));
            let idx = 0;
            for (let i = 0; i < items.length; i++) {
              if (items[i].isSuspended && items[i].orderId) {
                const r = settled[idx++];
                if (r?.status === 'fulfilled' && r.value) {
                  const inv = r.value.displayInvoice || r.value.invoice_no || r.value.invoiceNo || r.value.receiptNo || r.value.orderNumber || r.value.id;
                  items[i] = { ...items[i], invoice: inv ? String(inv) : null };
                }
              }
            }
          }
        } catch {}
        setDrafts(items);
        setDraftsTotal(res.length);
      } else if (res && Array.isArray(res.items)) {
        let items = mapDrafts(res.items);
        try {
          const targets = items.filter(d => d.isSuspended && d.orderId);
          if (targets.length) {
            const settled = await Promise.allSettled(targets.map(d => api.orders.get(String(d.orderId))));
            let idx = 0;
            for (let i = 0; i < items.length; i++) {
              if (items[i].isSuspended && items[i].orderId) {
                const r = settled[idx++];
                if (r?.status === 'fulfilled' && r.value) {
                  const inv = r.value.displayInvoice || r.value.invoice_no || r.value.invoiceNo || r.value.receiptNo || r.value.orderNumber || r.value.id;
                  items[i] = { ...items[i], invoice: inv ? String(inv) : null };
                }
              }
            }
          }
        } catch {}
        setDrafts(items);
        setDraftsTotal(Number(res.total || 0));
      } else {
        setDrafts([]);
        setDraftsTotal(0);
      }
      setDraftsPage(page);
    } catch {
      setDrafts([]);
      setDraftsTotal(0);
    } finally {
      setLoadingDrafts(false);
    }
  };

  const releaseReservations = async () => {
    try {
      const sectionId = sectionRef.current;
      const items = Array.isArray(cartRef.current) ? [...cartRef.current] : [];
      for (const it of items) {
        try { await api.inventory.adjustInSection({ productId: it.id, sectionId, delta: +Number(it.qty || 0), reason: `RESV|${reservationKeyRef.current}|RELEASE` }); } catch {}
      }
    } catch {}
  };

  useEffect(() => { cartRef.current = cart; }, [cart]);
  useEffect(() => { sectionRef.current = currentSection; }, [currentSection]);
  useEffect(() => { reservationKeyRef.current = reservationKey; }, [reservationKey]);

  useEffect(() => {
    const handleBeforeUnload = () => { try { releaseReservations(); } catch {} };
    try { window.addEventListener('beforeunload', handleBeforeUnload); } catch {}
    return () => {
      try { releaseReservations(); } catch {}
      try { window.removeEventListener('beforeunload', handleBeforeUnload); } catch {}
    };
  }, []);

  const handleSettleSuspended = async (draft, method) => {
    try {
      if (!hasAny(userPermissions, ['add_pos_sell', 'add_payment'])) {
        toast({ title: 'Not allowed', description: 'You do not have permission to accept payments.', variant: 'destructive' });
        return;
      }
      const orderId = draft?.orderId;
      if (!orderId) { toast({ title: 'No order linked', description: 'This suspended bill has no orderId.', variant: 'destructive' }); return; }
      await api.orders.addPayment(String(orderId), { method: String(method || 'cash'), amount: String(draft.total || 0), reference: undefined });
      await api.orders.updateStatus(String(orderId), { status: 'PAID' });
      // Remove draft locally and in backend
      setDrafts(prev => prev.filter(d => d.id !== draft.id));
      try { const backendId = draft.backendId || draft.id; if (backendId) await api.drafts.remove(String(backendId)); } catch {}
      toast({ title: 'Suspended bill settled', description: `${draft.name} marked as PAID.` });
      try { await fetchDrafts(draftsPage); } catch {}
    } catch (e) {
      toast({ title: 'Settle failed', description: String(e?.message || e), variant: 'destructive' });
    }
  };

  const handleViewSuspended = async (draft) => {
    try {
      if (!draft?.orderId) { toast({ title: 'Order not linked', description: 'No orderId on this draft.' }); return; }
      const order = await api.orders.get(String(draft.orderId));
      setViewOrder({ order, draft });
    } catch (e) {
      toast({ title: 'Load order failed', description: String(e?.message || e), variant: 'destructive' });
    }
  };

  const handleReturnAll = async () => {
    const ctx = returnOrder;
    if (!ctx?.orderId) { setReturnOrder(null); return; }
    try {
      await api.orders.refund(String(ctx.orderId));
      // Remove draft if any
      if (ctx.draft) {
        setDrafts(prev => prev.filter(d => d.id !== ctx.draft.id));
        try { const backendId = ctx.draft.backendId || ctx.draft.id; if (backendId) await api.drafts.remove(String(backendId)); } catch {}
      }
      toast({ title: 'Sale returned', description: 'Order marked as REFUNDED.' });
      setReturnOrder(null);
      try { await fetchDrafts(draftsPage); } catch {}
    } catch (e) {
      toast({ title: 'Return failed', description: String(e?.message || e), variant: 'destructive' });
    }
  };

  const markTableStatus = (tableId, status) => {
    try {
      setTables(prev => prev.map(t => t.id === tableId ? { ...t, status } : t));
    } catch {}
  };

  // (removed) Lock handler moved into CartPanel to avoid scope issues

  // Load drafts from backend for cross-device persistence (and when page/section changes)
  useEffect(() => {
    fetchDrafts(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.branchId, currentSection, branchSections, draftsPageSize]);

  // Whenever the Drafts dialog is opened, fetch fresh drafts from backend
  useEffect(() => {
    if (!isDraftsOpen) return;
    fetchDrafts(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDraftsOpen, currentSection, user?.branchId]);

  // Do not persist drafts to localStorage; backend is the source of truth

  // Reconcile tables with drafts: unlock tables that are marked occupied but have no draft
  useEffect(() => {
    (async () => {
      try {
        if (!currentSection) return;
        // Build set of tableIds referenced by drafts
        const draftTableIds = new Set((drafts || []).map(d => d.table?.id).filter(Boolean));
        // For each occupied table with no draft, attempt unlock
        const selectedId = selectedTable?.id || null;
        const editingDraftTableId = editingDraft?.table?.id || null;
        const toUnlock = (tables || [])
          .filter(t => t.sectionId === currentSection)
          .filter(t => t.status === 'occupied')
          // keep the table user just selected or currently editing; do not auto-unlock these
          .filter(t => t.id !== selectedId && t.id !== editingDraftTableId)
          .filter(t => !draftTableIds.has(t.id));
        for (const t of toUnlock) {
          try { await updateTableStatus(t.id, 'available'); } catch {}
        }
      } catch {}
    })();
  }, [tables, drafts, currentSection, selectedTable?.id, editingDraft?.table?.id]);
  const [lastOverrideAt, setLastOverrideAt] = useState(null);
  const [lastOverrideBy, setLastOverrideBy] = useState(null);
  const [isSalesHistoryOpen, setIsSalesHistoryOpen] = useState(false);
  const [recentSales, setRecentSales] = useState([]);
  const [businessInfo, setBusinessInfo] = useState(() => {
    try { return JSON.parse(localStorage.getItem('businessInfo') || '{}'); } catch { return {}; }
  });
  const [allowOverselling, setAllowOverselling] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [sidebarCategories, setSidebarCategories] = useState(categories);
  const [taxRate, setTaxRate] = useState(10);
  const [discount, setDiscount] = useState({ type: 'percentage', value: 0 });
  const [customers, setCustomers] = useState([]);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [isTaxModalOpen, setIsTaxModalOpen] = useState(false);
  const [viewOrder, setViewOrder] = useState(null); // { order, draft }
  const [returnOrder, setReturnOrder] = useState(null); // { orderId, draft }

  // Helper to read a displayable category name from a product
  const getProductCategoryName = (p) => {
    try {
      const name = p?.category?.name || p?.categoryName || p?.category || p?.station || '';
      return String(name || '').trim();
    } catch { return ''; }
  };

  useEffect(() => {
    const loadFromBackend = async () => {
      try {
        // Load products for the user's branch
        const prods = await api.products.list({ branchId: user?.branchId || undefined });
        const base = getApiBaseUrl();
        const absolutize = (u) => {
          try {
            if (!u) return '';
            if (/^https?:\/\//i.test(u)) return u;
            return `${base}${u.startsWith('/') ? '' : '/'}${u}`;
          } catch { return u || ''; }
        };
        setProducts(prods.map(p => ({
          id: String(p.id),
          name: p.name,
          station: p.category || 'neutral',
          price: p.price ? parseFloat(p.price) : 0,
          imageUrl: absolutize(p.imageUrl || p.image || p.thumbnailUrl || ''),
        })));

        // Load inventory levels for the branch
        const inv = await api.inventory.list({ branchId: user?.branchId || undefined });
        // Initialize section-based prices/stock with defaults; prices will be filled by pricing API
        const currentSavedStockLevels = {};
        inv.forEach(row => {
          const pid = row && row.productId != null ? String(row.productId) : null;
          if (!pid) return;
          currentSavedStockLevels[pid] = currentSavedStockLevels[pid] || {};
          // Use section name later when available; prefill generic stock per current section
          currentSavedStockLevels[pid]['default'] = Number(row.qtyOnHand || 0);
        });
        setStockLevels(currentSavedStockLevels);
        setStockReady(true);
        setSectionPrices({});
      } catch (e) {
        // silent
      }
    };

  

    // Load overselling setting from backend (fallback to localStorage if unavailable)
    (async () => {
      try {
        const bid = user?.branchId || user?.branch?.id || undefined;
        const s = await api.inventory.settings.get(bid ? { branchId: bid } : {});
        if (s && typeof s.allowOverselling === 'boolean') {
          setAllowOverselling(!!s.allowOverselling);
          try { localStorage.setItem('loungeAllowOverselling', String(!!s.allowOverselling)); } catch {}
        } else {
          try { const saved = localStorage.getItem('loungeAllowOverselling'); setAllowOverselling(saved === 'true'); } catch {}
        }
      } catch {
        try { const saved = localStorage.getItem('loungeAllowOverselling'); setAllowOverselling(saved === 'true'); } catch {}
      }
    })();

    loadFromBackend();

    // Sections and tables will be loaded from backend below
  }, [user]);

  // Keep in-memory businessInfo in sync when POS loads branch settings
  useEffect(() => {
    try { const info = JSON.parse(localStorage.getItem('businessInfo') || '{}'); setBusinessInfo(info || {}); } catch {}
  }, [user?.branchId]);

  // Apply theme from business settings
  useEffect(() => {
    if (businessInfo && businessInfo.theme) applyTheme(businessInfo.theme);
  }, [businessInfo?.theme]);

  // Load product categories for the sidebar filter from API, with product-derived fallback
  useEffect(() => {
    (async () => {
      try {
        if (!user?.branchId) return;
        const rows = await api.categories.list({ branchId: user.branchId });
        let names = [];
        try {
          const candidates = [];
          if (Array.isArray(rows?.items)) candidates.push(...rows.items);
          if (Array.isArray(rows?.data)) candidates.push(...rows.data);
          if (Array.isArray(rows?.results)) candidates.push(...rows.results);
          if (Array.isArray(rows)) candidates.push(...rows);
          names = candidates.map(c => (c?.name || c?.title || c?.label || '').toString()).filter(Boolean);
        } catch {}
        const unique = Array.from(new Set(names));
        let next = ['All', ...unique];
        if (next.length <= 1) {
          try {
            const derived = Array.from(new Set((products || []).map(getProductCategoryName).filter(Boolean)));
            next = ['All', ...derived];
          } catch {}
        }
        setSidebarCategories(next.length > 1 ? next : categories);
        setActiveCategory(prev => next.includes(prev) ? prev : 'All');
      } catch {
        setSidebarCategories(categories);
      }
    })();
  }, [user?.branchId]);

  // Derive categories once products are loaded if API did not populate
  useEffect(() => {
    try {
      if (!products?.length) return;
      if (Array.isArray(sidebarCategories) && sidebarCategories.length > 1) return;
      const derived = Array.from(new Set(products.map(getProductCategoryName).filter(Boolean)));
      const next = ['All', ...derived];
      setSidebarCategories(next.length > 1 ? next : categories);
      setActiveCategory(prev => next.includes(prev) ? prev : 'All');
    } catch {}
  }, [products]);

  useEffect(() => {
    try {
      if (!products?.length) return;
      if (Array.isArray(sidebarCategories) && sidebarCategories.length > 1) return;
      const derived = Array.from(new Set(products.map(p => (p?.category?.name || p?.categoryName || p?.category || p?.station || '').toString()).filter(Boolean)));
      const next = ['All', ...derived];
      setSidebarCategories(next.length > 1 ? next : categories);
      setActiveCategory(prev => next.includes(prev) ? prev : 'All');
    } catch {}
  }, [products]);

  // Load override settings from backend
  useEffect(() => {
    (async () => {
      try {
        if (!user?.branchId) return;
        const settings = await api.hrm.overridePin.get({ branchId: user.branchId });
        if (Array.isArray(settings?.protectedActions) && settings.protectedActions.length > 0) {
          setProtectedActions(settings.protectedActions);
        }
        if (typeof settings?.graceSeconds === 'number') setGraceSeconds(settings.graceSeconds);
      } catch {}
    })();
  }, [user?.branchId]);

  // Load customers created by admin for this branch
  useEffect(() => {
    (async () => {
      try {
        if (!user?.branchId) return;
        let rows;
        try {
          rows = await api.customers.list({ branchId: user.branchId });
        } catch (e) {
          // Fallback if user lacks view_all permission
          try { rows = await api.customers.mine({ branchId: user.branchId }); } catch {}
        }
        const items = Array.isArray(rows?.items) ? rows.items : rows; // support both shapes
        setCustomers((items || []).map(c => ({ id: c.id, name: c.name || c.fullName || c.companyName || 'Unnamed' })));
      } catch {}
    })();
  }, [user?.branchId]);

  // Load service staff list
  useEffect(() => {
    (async () => {
      try {
        if (!user?.branchId) { setServiceStaffList([]); return; }
        const list = await api.users.list({ branchId: user.branchId });
        const rows = Array.isArray(list) ? list : [];
        const hasFlag = rows.some(u => typeof u?.isServiceStaff === 'boolean');
        const filtered = hasFlag ? rows.filter(u => u.isServiceStaff) : rows; // fallback: include all if flag missing
        setServiceStaffList(filtered.map(u => ({ id: u.id, username: u.username || u.firstName || u.surname || `user-${u.id}`, service_pin: u.service_pin })));
      } catch { setServiceStaffList([]); }
    })();
  }, [user?.branchId]);

  useEffect(() => {
    const loadSections = async () => {
      try {
        const sections = await api.sections.list({ branchId: user?.branchId || undefined });
        setBranchSections(sections || []);
        const current = String(currentSection || '').trim();
        if (!current) {
          if (shiftRegister && shiftRegister.sectionId) {
            setCurrentSection(shiftRegister.sectionId);
          } else {
            const firstValidSection = (sections || []).find(s => !String(s.name || '').toLowerCase().includes('store') && !String(s.name || '').toLowerCase().includes('kitchen'));
            setCurrentSection(firstValidSection ? firstValidSection.id : ((sections && sections[0]) ? sections[0].id : ''));
          }
        }
      } catch {
        setBranchSections([]);
        setCurrentSection('');
      }
    };
    loadSections();
    // keep drafts and permissions persistent across navigation; do not clear here
    setSelectedStaff(null);
    setRecentSales([]);

  }, [user, shiftRegister]);

  // Load effective prices for the current section so product cards display prices
  useEffect(() => {
    (async () => {
      try {
        if (!currentSection) return;
        const sec = (branchSections || []).find(s => s.id === currentSection);
        const sectionName = sec?.name || '';
        if (!sectionName) return;
        const resolvedBranchId = user?.branchId || user?.branch?.id || sec?.branchId || undefined;
        const map = await api.prices.effective({ branchId: resolvedBranchId, sectionId: currentSection });
        const next = {};
        Object.entries(map || {}).forEach(([pid, price]) => {
          if (!next[pid]) next[pid] = {};
          const n = Number(price);
          next[pid][sectionName] = Number.isFinite(n) ? n : 0;
        });
        setSectionPrices((prev) => ({ ...prev, ...next }));
      } catch {
        // ignore
      }
    })();
  }, [currentSection, user?.branchId, branchSections]);

  // Reprice items in cart when section or its effective prices change
  useEffect(() => {
    try {
      if (!currentSection || !cart?.length) return;
      const sectionName = (branchSections || []).find(s => s.id === currentSection)?.name || '';
      if (!sectionName) return;
      setCart(prev => prev.map(item => {
        const p = Number(sectionPrices?.[item.id]?.[sectionName]);
        if (Number.isFinite(p) && p >= 0) return { ...item, price: p };
        return item;
      }));
    } catch {}
  }, [currentSection, sectionPrices, branchSections]);

  // Ensure per-section stock and prices are refreshed whenever section or branch context changes
  useEffect(() => {
    (async () => {
      try { await refreshPricingAndStock(); } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSection, user?.branchId]);

  // Load service types for the current branch and set a default if none selected
  useEffect(() => {
    (async () => {
      try {
        const branchId = user?.branchId || user?.branchId;
        if (!branchId) return;
        const list = await api.serviceTypes.list({ branchId });
        let names = Array.isArray(list) ? list.map(s => s?.name).filter(Boolean) : [];
        if (!names.length) names = defaultServiceTypes;
        setServiceTypes(names);
        if (!currentService && names.length > 0) setCurrentService(names[0]);
      } catch {}
    })();
  }, [user?.branchId]);

  // Load tables whenever currentSection changes
  useEffect(() => {
    const loadTables = async () => {
      try {
        if (!currentSection) return;
        const rows = await api.tables.list({ sectionId: currentSection });
        const mapped = (rows || []).map(t => ({
          id: t.id,
          name: t.name || t.code || t.id,
          sectionId: t.sectionId || t.section?.id || t.section,
          sectionName: t.section?.name || '',
          status: ((String(t.status || '').toLowerCase() === 'locked') || (String(t.status || '').toLowerCase() === 'occupied') || !!t.locked) ? 'occupied' : 'available',
          updatedAt: t.updatedAt || t.updated_at || null,
        }));
        setTables(mapped);
      } catch {
        // silent
      }
    };
    loadTables();
  }, [currentSection]);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      clearInterval(timer);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (printData) {
      let restored = false;
      const prevTitle = document.title;
      try { document.title = ' '; } catch {}
      const restore = () => {
        if (restored) return;
        restored = true;
        try { document.title = prevTitle; } catch {}
      };
      try { window.addEventListener('afterprint', restore, { once: true }); } catch {}
      const timer = setTimeout(() => {
        window.print();
        setPrintData(null);
        // Fallback restore in case afterprint doesn't fire
        setTimeout(restore, 500);
      }, 100);
      return () => { clearTimeout(timer); restore(); };
    }
  }, [printData]);
  
  // Explicit refresh helper for pricing and per-section stock
  const refreshPricingAndStock = async () => {
    try {
      if (!currentSection) {
        try { console.debug('[POS] skip refreshPricingAndStock: currentSection not set'); } catch {}
        return;
      }
      const sec = (branchSections || []).find(s => s.id === currentSection);
      const resolvedBranchId = user?.branchId || user?.branch?.id || sec?.branchId || undefined;
      if (!resolvedBranchId) return;
      // Refresh prices
      let pricesMap = await api.prices.effective({ branchId: resolvedBranchId, sectionId: currentSection });
      if (!pricesMap || (typeof pricesMap === 'object' && Object.keys(pricesMap).length === 0)) {
        // Fallback: try branch-level prices if section-specific are empty
        try { pricesMap = await api.prices.effective({ branchId: resolvedBranchId }); } catch {}
      }
      const sectionName = branchSections.find(s => s.id === currentSection)?.name || 'default';
      setSectionPrices(prev => {
        const merged = JSON.parse(JSON.stringify(prev || {}));
        const norm = normalizePricesMap(pricesMap);
        Object.entries(norm || {}).forEach(([pid, price]) => {
          merged[pid] = merged[pid] || {};
          const incoming = Number(price) || 0;
          const existing = Number(merged[pid][sectionName] ?? 0) || 0;
          merged[pid][sectionName] = incoming > 0 ? incoming : (existing > 0 ? existing : 0);
        });
        return merged;
      });
    } catch {}
    try {
      if (!currentSection) {
        try { console.debug('[POS] skip stock refresh: currentSection not set'); } catch {}
        return;
      }
      // Refresh stock by section
      const rows = await api.inventory.listBySection({ sectionId: currentSection });
      const secName = branchSections.find(s => s.id === currentSection)?.name || '';
      if (!secName) {
        try { console.debug('[POS] section name unresolved for id', currentSection, rows); } catch {}
        return;
      }
      try { console.debug('[POS] section inventory rows', { sectionId: currentSection, sectionName: secName, rowsCount: (rows||[]).length, sample: (rows||[])[0] }); } catch {}
      setStockLevels(prev => {
        const next = { ...prev };
        const byProduct = {};
        const counts = [];
        (rows || []).forEach(r => {
          const pidRaw = r.productId || (r.product && r.product.id);
          const pid = pidRaw != null ? String(pidRaw) : null;
          if (!pid) return;
          const q = Number(r.qtyOnHand || 0);
          byProduct[pid] = q;
          counts.push(q);
        });
        Object.keys(byProduct).forEach(pid => {
          next[pid] = next[pid] || {};
          next[pid][secName] = byProduct[pid];
          // Keep fallback aligned to the active section to avoid flicker from stale 'default'
          next[pid]['default'] = byProduct[pid];
        });
        return next;
      });
      // Do not fallback to branch totals; if section has no stock, keep it at zero for this section
      setStockReady(true);
    } catch {}
  };
  
  const updateTableStatus = async (tableId, status) => {
    try {
      const current = tables.find(t => t.id === tableId)?.status;
      if (current === status) return true; // no-op
      if (status === 'occupied') await api.tables.lock(tableId);
      if (status === 'available') await api.tables.unlock(tableId);
      // Update UI only on success
      setTables(prevTables => prevTables.map(t => t.id === tableId ? { ...t, status } : t));
      return true;
    } catch (e) {
      const msg = String(e?.message || '');
      // Tolerate idempotent cases from backend and treat as success
      if (status === 'available' && /not locked/i.test(msg)) {
        setTables(prevTables => prevTables.map(t => t.id === tableId ? { ...t, status: 'available' } : t));
        return true;
      }
      if (status === 'occupied' && /already locked/i.test(msg)) {
        setTables(prevTables => prevTables.map(t => t.id === tableId ? { ...t, status: 'occupied' } : t));
        return true;
      }
      // Do not mutate local state on failure; refresh from backend to get true status
      toast({ title: 'Table status not changed', description: (e?.message || 'Please try again.'), variant: 'destructive' });
      try {
        if (currentSection) {
          const rows = await api.tables.list({ sectionId: currentSection });
          setTables((rows || []).map(t => ({
            id: t.id,
            name: t.name || t.code || t.id,
            sectionId: t.sectionId || t.section?.id || t.section,
            sectionName: t.section?.name || '',
            status: (t.locked || String(t.status || '').toLowerCase() === 'locked') ? 'occupied' : 'available',
            updatedAt: t.updatedAt || t.updated_at || null,
          })));
        }
      } catch {}
      return false;
    }
  };

  const handlePinRequest = (action) => {
    // Bypassing PIN for discount if user has permission
    if (action.type === 'edit_discount' && userPermissions.includes('pos.access_discount')) {
      setIsDiscountModalOpen(true);
      return;
    }
    setPinAction(action);
    setPinModalOpen(true);
  };
  
  const handlePinSuccess = (action) => {
    toast({ title: "PIN Verified!", description: `Action '${action.type}' authorized.` });
    if(action.type === 'clear_cart') {
      const prevTable = selectedTable;
      // Release all backend reservations before clearing
      try {
        (async () => {
          const sectionId = currentSection;
          const items = Array.isArray(cart) ? [...cart] : [];
          for (const it of items) {
            try { await api.inventory.adjustInSection({ productId: it.id, sectionId, delta: +Number(it.qty || 0), reason: `RESV|${reservationKey}|RELEASE` }); } catch {}
          }
        })();
      } catch {}
      if (editingDraft && editingDraft.table) {
        updateTableStatus(editingDraft.table.id, 'available');
      } else if (prevTable) {
        updateTableStatus(prevTable.id, 'available');
      }
      setCart([]);
      setEditingDraft(null);
      setSelectedTable(null);
      setCurrentService(serviceTypes[0] || '');
      setCurrentCustomer(customerTypes[0]);
    }
    if (action.type === 'void') {
        setCart(cart.filter(item => item.id !== action.itemId));
    }
    if (action.type === 'decrement') {
        setCart(cart.map(item => item.id === action.itemId ? {...item, qty: Math.max(0, item.qty - 1)} : item).filter(item => item.qty > 0));
    }
    if (action.type === 'edit_discount') {
      setIsDiscountModalOpen(true);
    }
    if (action.type === 'delete_draft') {
      handleDeleteDraft(action.draftId, true);
    }
  };

  const handlePrint = (type, data) => {
    setPrintData({ type, data });
  };

  const handlePrintItem = (item) => {
    let qtyToPrint = item.qty;

    if (editingDraft) {
      const originalItem = editingDraft.cart.find(draftItem => draftItem.id === item.id);
      if (originalItem) {
        qtyToPrint = item.qty - originalItem.qty;
      }
    }

    if (qtyToPrint <= 0) {
      toast({ title: "No new items to print", description: "Quantity has not increased.", variant: "default" });
      return;
    }

    setPrintData({ type: 'item-invoice', data: {
      items: [{ ...item, qty: qtyToPrint }],
      table: selectedTable?.name,
      section: branchSections.find(s => s.id === currentSection)?.name,
      serviceType: currentService,
      user: user?.username || '',
      branch: user?.branch || '',
    }});
  };

  const handlePrintByCategory = (category) => {
    const norm = (s) => String(s || '').trim().toLowerCase();
    const key = norm(category);
    // Robust matching: map common category names to destinations without changing stored data
    const stationMatches = (station, targetKey) => {
      const s = norm(station);
      if (!s) return false;
      if (targetKey === 'bar') {
        return s.includes('bar') || s.includes('drink') || s.includes('beverage') || s.includes('wine') || s.includes('beer');
      }
      if (targetKey === 'grill') {
        return s.includes('grill') || s.includes('grills') || s.includes('bbq') || s.includes('barbecue') || s.includes('suya') || s.includes('roast') || s.includes('kebab');
      }
      if (targetKey === 'kitchen') {
        // Treat typical food categories as kitchen
        return (
          s.includes('kitchen') || s.includes('food') || s.includes('main') || s.includes('dish') || s.includes('soup') ||
          s.includes('starter') || s.includes('salad') || s.includes('rice') || s.includes('noodle') || s.includes('sauce') || s.includes('meal')
        ) && !stationMatches(station, 'grill'); // avoid misclassifying grills into kitchen
      }
      return s.includes(targetKey);
    };

    const itemsInCategory = cart.filter(item => stationMatches(item.station, key));
    if (itemsInCategory.length === 0) {
        const nice = (category || '').charAt(0).toUpperCase() + String(category || '').slice(1);
        toast({ title: `No ${nice} Items`, description: `There are no ${nice.toLowerCase()} items in the cart to print.`, variant: "default" });
        return;
    }

    const itemsToPrint = [];
    itemsInCategory.forEach(currentItem => {
      let qtyToPrint = currentItem.qty;

      if (editingDraft) {
        const originalItem = editingDraft.cart.find(draftItem => draftItem.id === currentItem.id);
        if (originalItem) {
          qtyToPrint = currentItem.qty - originalItem.qty;
        }
      }

      if (qtyToPrint > 0) {
        itemsToPrint.push({ ...currentItem, qty: qtyToPrint });
      }
    });

    if (itemsToPrint.length === 0) {
      toast({ title: `No New ${category.charAt(0).toUpperCase() + category.slice(1)} Items`, description: `No new items or quantity changes to print for this category.`, variant: "default" });
      return;
    }

    setPrintData({ type: 'item-invoice', data: {
        items: itemsToPrint,
        table: selectedTable?.name,
        section: branchSections.find(s => s.id === currentSection)?.name,
        serviceType: currentService,
        user: user?.username || '',
        branch: user?.branch || '',
    }});
    toast({ title: `${category.charAt(0).toUpperCase() + category.slice(1)} Order Sent`, description: `New items have been sent for production.` });
  };

  const addToCart = async (product) => {
    try {
      const pid = String(product?.id || '');
      if (!pid) return;
      if (addingLockRef.current.has(pid)) {
        try { console.debug('[POS] suppress duplicate addToCart', pid); } catch {}
        return;
      }
      addingLockRef.current.add(pid);
      setTimeout(() => { try { addingLockRef.current.delete(pid); } catch {} }, 400);
    } catch {}
    if (!currentSection) {
      toast({ title: 'Section Required', description: 'Please select an operational section.', variant: 'destructive' });
      return;
    }
    const isDineIn = /dine/i.test(String(currentService || '').trim());
    if (isDineIn && !selectedTable) {
      toast({ title: 'Table Required', description: 'Please select a table for Dine-in orders.', variant: 'destructive' });
      return;
    }
    // For Dine-in: lock the table only when the first item is added
    if (isDineIn && selectedTable && selectedTable.status !== 'occupied') {
      const ok = await updateTableStatus(selectedTable.id, 'occupied');
      if (!ok) {
        toast({ title: `Could not lock ${selectedTable.name}`, description: 'Table might be in use. Please choose another table.', variant: 'destructive' });
        return;
      }
      setSelectedTable(prev => prev ? { ...prev, status: 'occupied' } : prev);
    }
    
    const currentSectionName = branchSections.find(s => s.id === currentSection)?.name || '';
    const price = (sectionPrices[product.id]?.[currentSectionName] ?? product.price);

    if (price === undefined || price === null) {
        toast({ title: 'Price Not Set', description: `Price for ${product.name} in ${currentSectionName} is not set.`, variant: 'destructive' });
        return;
    }

    const stock = Number(stockLevels[product.id]?.[currentSectionName] ?? 0);
    const existingCartItem = cart.find(item => item.id === product.id);
    const currentCartQty = existingCartItem ? existingCartItem.qty : 0;

    if (stock <= currentCartQty && !allowOverselling) {
        toast({ title: 'Out of Stock', description: `${product.name} is currently out of stock.`, variant: 'destructive' });
        return;
    }

    // Reserve on backend first, tagged with this cart's reservationKey
    try {
      await api.inventory.adjustInSection({ productId: product.id, sectionId: currentSection, delta: -1, reason: `RESV|${reservationKey}` });
    } catch (e) {
      toast({ title: 'Stock not reserved', description: String(e?.message || 'Failed to reserve stock.'), variant: 'destructive' });
      return;
    }
    try { adjustLocalSectionStock(product.id, -1); } catch {}
    setCart(prev => {
      if (existingCartItem) return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      return [...prev, { ...product, qty: 1, price, station: product.station }];
    });
    // Refresh from backend (debounced) to get authoritative counts without clobbering optimistic UI
    scheduleRefreshPricingAndStock(700);
  };

  const withinGrace = () => {
    if (!lastOverrideAt || !graceSeconds) return false;
    const diff = (Date.now() - lastOverrideAt);
    return diff <= graceSeconds * 1000;
  };

  const requireOverride = (type, payload, onApproved) => {
    if (!protectedActions.includes(type)) { onApproved?.(); return; }
    // Bypass if user has permission
    const perms = Array.isArray(user?.permissions) ? user.permissions : [];
    if (hasPermission(perms, 'pos.override_bypass')) { onApproved?.(); return; }
    // Grace window
    if (withinGrace() && lastOverrideBy === user?.id) { onApproved?.(); return; }
    setPendingOverride({ type, payload, onApproved });
    setOverrideOpen(true);
  };

  // Open service staff PIN modal to verify selection
  const requestSelectStaff = (staffId) => {
    setPendingStaffId(staffId);
    setServicePinModalOpen(true);
  };

  // Called by ServiceStaffPinModal with a PIN to verify for the pending staff selection
  const handleVerifyServicePin = async (pin) => {
    const staffId = pendingStaffId;
    try {
      if (!staffId) { throw new Error('No staff selected'); }
      const res = await api.users.verifyPin({ userId: staffId, pin });
      if (!res || res.ok !== true) { throw new Error('Invalid PIN'); }
      setSelectedStaff(staffId);
      const name = serviceStaffList.find(s => s.id === staffId)?.username;
      if (name) toast({ title: 'Service staff selected', description: name });
      // Close on success
      setServicePinModalOpen(false);
      setPendingStaffId(null);
    } catch (e) {
      toast({ title: 'Invalid service staff PIN', description: 'Please try again.', variant: 'destructive' });
      return; // keep modal open for retry
    }
  };

  const handleOverrideConfirm = async (pin) => {
    try {
      const sec = (branchSections || []).find(s => s.id === currentSection);
      const resolvedBranchId = user?.branchId || user?.branch?.id || sec?.branchId || undefined;
      const res = await api.hrm.overridePin.verify({ branchId: resolvedBranchId, pin });
      if (!res || res.ok !== true) {
        throw new Error('Invalid PIN');
      }
      const action = pendingOverride;
      setOverrideOpen(false);
      setPendingOverride(null);
      setLastOverrideAt(Date.now());
      setLastOverrideBy(user?.id || null);
      if (typeof res.graceSeconds === 'number') setGraceSeconds(res.graceSeconds);
      // Audit log
      try {
        await api.audit.log({
          action: `override:${action?.type || 'unknown'}`,
          userId: user?.id,
          branchId: user?.branchId,
          meta: { staffId: selectedStaff, time: new Date().toISOString(), payload: action?.payload }
        });
      } catch {}
      // Success toast with staff/time
      const staffName = serviceStaffList.find(s => s.id === selectedStaff)?.username || user?.username || '';
      toast({ title: 'Override confirmed', description: `Override confirmed for ${staffName} at ${new Date().toLocaleString()}.` });
      action?.onApproved?.();
    } catch (e) {
      toast({ title: 'Invalid override PIN. Action denied.', variant: 'destructive' });
    }
  };

  const updateQty = async (id, delta) => {
    if (delta < 0) {
      return requireOverride('decrement', { itemId: id }, async () => {
        const item = cart.find(ci => ci.id === id);
        if (!item) return;
        // Backend-first restore to avoid double increments
        try {
          await api.inventory.adjustInSection({ productId: id, sectionId: currentSection, delta: +1, reason: `RESV|${reservationKey}` });
        } catch (e) {
          toast({ title: 'Stock restore failed', description: String(e?.message || 'Could not restore stock.'), variant: 'destructive' });
          return;
        }
        try { adjustLocalSectionStock(id, +1); } catch {}
        setCart(cart.map(ci => ci.id === id ? { ...ci, qty: Math.max(0, ci.qty - 1) } : ci).filter(ci => ci.qty > 0));
        scheduleRefreshPricingAndStock(300);
      });
    }

    const product = products.find(p => p.id === id);
    const currentSectionName = branchSections.find(s => s.id === currentSection)?.name || '';
    const stock = Number(stockLevels[id]?.[currentSectionName] ?? 0);
    const existingCartItem = cart.find(item => item.id === id);
    const currentCartQty = existingCartItem ? existingCartItem.qty : 0;

    if (delta > 0 && stock <= currentCartQty && !allowOverselling) {
        toast({ title: 'Stock Limit Reached', description: `No more ${product.name} in stock.`, variant: 'destructive' });
        return;
    }

    // Backend-first reservation to ensure single depletion (tag with reservationKey)
    try {
      await api.inventory.adjustInSection({ productId: id, sectionId: currentSection, delta: -1, reason: `RESV|${reservationKey}` });
    } catch (e) {
      toast({ title: 'Stock not reserved', description: String(e?.message || 'Failed to reserve stock.'), variant: 'destructive' });
      return;
    }
    try { adjustLocalSectionStock(id, -1); } catch {}
    setCart(cart.map(item => item.id === id ? { ...item, qty: Math.max(0, item.qty + delta) } : item).filter(item => item.qty > 0));
    scheduleRefreshPricingAndStock(300);
  };

  // Set quantity directly (used by editable input in the cart)
  const setQty = async (id, targetQtyRaw) => {
    try {
      const targetQty = Math.max(0, Math.floor(Number(targetQtyRaw || 0)));
      const existing = cart.find(ci => ci.id === id);
      const currentQty = existing ? existing.qty : 0;
      if (targetQty === currentQty) return;

      const product = products.find(p => p.id === id);
      const currentSectionName = branchSections.find(s => s.id === currentSection)?.name || '';
      const stock = Number(stockLevels[id]?.[currentSectionName] ?? 0);
      const delta = targetQty - currentQty;
      if (delta > 0 && (stock < targetQty) && !allowOverselling) {
        toast({ title: 'Stock Limit Reached', description: `${product?.name || 'Item'} only has ${stock} in stock.`, variant: 'destructive' });
        return;
      }
      // Backend-first adjust to maintain reservation integrity
      try {
        if (delta > 0) {
          await api.inventory.adjustInSection({ productId: id, sectionId: currentSection, delta: -delta, reason: `RESV|${reservationKey}` });
          try { adjustLocalSectionStock(id, -delta); } catch {}
        } else if (delta < 0) {
          await api.inventory.adjustInSection({ productId: id, sectionId: currentSection, delta: +(-delta), reason: `RESV|${reservationKey}` });
          try { adjustLocalSectionStock(id, +(-delta)); } catch {}
        }
      } catch (e) {
        toast({ title: 'Quantity update failed', description: String(e?.message || e), variant: 'destructive' });
        return;
      }
      // Update UI
      setCart(prev => {
        if (targetQty === 0) return prev.filter(ci => ci.id !== id);
        if (existing) return prev.map(ci => ci.id === id ? { ...ci, qty: targetQty } : ci);
        // If item not in cart and targetQty > 0, add it using product details
        if (product) {
          const sectionName = branchSections.find(s => s.id === currentSection)?.name || '';
          const price = (sectionPrices[id]?.[sectionName] ?? product.price);
          return [...prev, { ...product, qty: targetQty, price, station: product.station }];
        }
        return prev;
      });
      scheduleRefreshPricingAndStock(300);
    } catch {}
  };

  const handleVoid = (id) => {
    requireOverride('void', { itemId: id }, async () => {
      const item = cart.find(ci => ci.id === id);
      if (!item) return;
      const qty = Number(item.qty || 0);
      // Backend-first restore to avoid double increments
      try {
        await api.inventory.adjustInSection({ productId: id, sectionId: currentSection, delta: +qty, reason: `RESV|${reservationKey}` });
      } catch (e) {
        toast({ title: 'Stock restore failed', description: String(e?.message || 'Could not restore stock.'), variant: 'destructive' });
        return;
      }
      try { adjustLocalSectionStock(id, +qty); } catch {}
      setCart(cart.filter(ci => ci.id !== id));
      scheduleRefreshPricingAndStock(300);
    });
  }

  const handleSaveDraft = async () => {
    if (cart.length === 0) {
      toast({ title: 'Empty Cart', description: 'Cannot save an empty cart as a draft.', variant: 'destructive' });
      return;
    }
    if (!selectedStaff) {
      toast({ title: 'Service staff required', description: 'Please select service staff before saving a draft.', variant: 'destructive' });
      return;
    }
    let updatedDrafts;
    const isDineInNow = /dine/i.test(String(currentService || '').trim());
    const draftTable = isDineInNow ? selectedTable : null;
    const staffMember = serviceStaffList.find(s => s.id === selectedStaff);
    const draftData = {
        cart,
        service: currentService,
        customer: currentCustomer,
        table: draftTable,
        sectionId: currentSection,
        waiter: staffMember ? staffMember.username : (user?.username || ''),
        waiterId: selectedStaff,
        discount: discount,
        taxRate: taxRate,
    };
    
    if (editingDraft) {
      updatedDrafts = drafts.map(d => d.id === editingDraft.id ? { ...d, ...draftData, updatedAt: new Date().toISOString() } : d);
      toast({ title: 'Draft Updated!', description: `Draft "${editingDraft.name}" has been updated.` });
    } else {
      const draftName = `Draft #${drafts.length + 1}`;
      const newDraft = { id: Date.now(), name: draftName, ...draftData, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      updatedDrafts = [...drafts, newDraft];
      toast({ title: 'Draft Saved!', description: `"${draftName}" has been saved.` });
    }
    
    setDrafts(updatedDrafts);
    // Persist to backend (create or update)
    (async () => {
      try {
        const nameToUse = editingDraft ? editingDraft.name : updatedDrafts[updatedDrafts.length - 1].name;
        const backendId = editingDraft?.backendId;
        const payload = {
          branchId: (user?.branchId || user?.branch?.id || (branchSections.find(s => s.id === currentSection)?.branchId) || undefined),
          sectionId: currentSection,
          tableId: draftTable?.id,
          name: nameToUse,
          serviceType: currentService,
          waiterId: selectedStaff || undefined,
          customerName: currentCustomer,
          customerPhone: undefined,
          cart,
          subtotal: Number(subtotal),
          discount: Number(discountValue),
          tax: Number(tax),
          total: Number(total),
          status: 'ACTIVE',
        };
        if (backendId) {
          await api.drafts.update(backendId, payload);
        } else {
          const created = await api.drafts.create(payload);
          if (created?.id) {
            setDrafts(prev => prev.map(d => (d.name === nameToUse && !d.backendId) ? { ...d, backendId: created.id, id: created.id } : d));
          }
        }
      } catch {}
    })();
    
    if (draftTable) {
      const t = tables.find(t => t.id === draftTable.id);
      if (!t || t.status !== 'occupied') {
        const ok = await updateTableStatus(draftTable.id, 'occupied');
        if (!ok) {
          toast({ title: `Could not lock ${draftTable.name}`, description: 'Table might be in use. Please choose another table.', variant: 'destructive' });
        }
        // Reflect in local UI immediately
        if (ok) {
          setSelectedTable(prev => prev && prev.id === draftTable.id ? { ...prev, status: 'occupied' } : prev);
          setTables(prev => prev.map(tt => tt.id === draftTable.id ? { ...tt, status: 'occupied' } : tt));
        }
      }
    }

    handlePrint('table-bill', {
      items: cart,
      table: selectedTable?.name,
      subtotal,
      discount: discountValue,
      tax,
      total,
      waiter: draftData.waiter,
      branch: user?.branch || '',
      section: branchSections.find(s => s.id === currentSection)?.name,
      isDraft: true,
    });

    setCart([]);
    setEditingDraft(null);
    setSelectedTable(null);
    setCurrentService(serviceTypes[0] || defaultServiceTypes[0]);
    setCurrentCustomer(customerTypes[0]);
    setDiscount({ type: 'percentage', value: 0 });
    try { await fetchDrafts(draftsPage); } catch {}
  };

  const handleLoadDraft = async (draft) => {
    let next = { ...draft };
    try {
      const isSusp = !!(draft.isSuspended || String(draft.status || '').toUpperCase() === 'SUSPENDED');
      const needsFetch = isSusp || !Array.isArray(draft.cart) || draft.cart.length === 0;
      const backendId = draft.backendId || draft.id;
      if (needsFetch && backendId && api?.drafts?.get) {
        const fresh = await api.drafts.get(String(backendId));
        if (fresh && Array.isArray(fresh.cart) && fresh.cart.length > 0) {
          next = {
            ...next,
            cart: fresh.cart,
            service: fresh.serviceType || next.service,
            customer: fresh.customerName || next.customer,
            table: fresh.tableId ? (tables.find(t => t.id === fresh.tableId) || next.table) : next.table,
            total: Number(fresh.total || next.total || 0),
            isSuspended: String(fresh.status || next.status || '').toUpperCase() === 'SUSPENDED',
            waiterId: fresh.waiterId || next.waiterId,
          };
        }
      }
    } catch {}
    setCart(Array.isArray(next.cart) ? next.cart : []);
    setCurrentService(next.service || serviceTypes[0] || '');
    setCurrentCustomer(next.customer || customerTypes[0]);
    setSelectedTable(next.table || null);
    setSelectedStaff(next.waiterId || null);
    setEditingDraft(next);
    // Adopt reservation key from draft so subsequent reservations use the same key
    if (next.reservationKey) setReservationKey(next.reservationKey);
    toast({ title: 'Draft Loaded', description: `Draft "${next.name || 'Draft'}" is ready in the POS.` });
    setDiscount(draft.discount || { type: 'percentage', value: 0 });
    setTaxRate(draft.taxRate || 10);
    setIsDraftsOpen(false);
    
  };

  const handleDeleteDraft = async (draftId, pinVerified = false) => {
    if (!pinVerified) {
      requireOverride('delete_draft', { draftId }, () => handleDeleteDraft(draftId, true));
      return;
    }
    
    const draftToDelete = drafts.find(d => d.id === draftId);
    if (!draftToDelete) return;

    // Restore stock
    const newStockLevels = JSON.parse(JSON.stringify(stockLevels));
    const sectionName = branchSections.find(s => s.id === draftToDelete.sectionId)?.name;
    if (sectionName) {
        draftToDelete.cart.forEach(item => {
            if (newStockLevels[item.id] && newStockLevels[item.id][sectionName] !== undefined) {
                newStockLevels[item.id][sectionName] += item.qty;
            }
        });
        setStockLevels(newStockLevels);
        localStorage.setItem('loungeStockLevels', JSON.stringify(newStockLevels));
    }

    if (draftToDelete.table) {
      try { await updateTableStatus(draftToDelete.table.id, 'available'); } catch {}
    }

    const updatedDrafts = drafts.filter(d => d.id !== draftId);
    setDrafts(updatedDrafts);
    toast({ title: 'Draft Deleted', description: 'The saved order has been removed and stock restored.' });
    // Restore in backend inventory and delete draft
    (async () => {
      try {
        const sectionId = draftToDelete.sectionId || currentSection;
        for (const it of draftToDelete.cart) {
          try { await api.inventory.adjustInSection({ productId: it.id, sectionId, delta: +Number(it.qty || 0) }); } catch {}
        }
      } catch {}
      try { const b = draftToDelete.backendId || draftToDelete.id; if (b) await api.drafts.remove(String(b)); await fetchDrafts(draftsPage); } catch {}
    })();
  };

  const handleTakePayment = (mode) => {
    if (cart.length === 0) {
      toast({ title: 'Empty Cart', description: 'Cannot proceed to payment with an empty cart.', variant: 'destructive' });
      return;
    }
    if (!hasAny(userPermissions, ['add_pos_sell', 'add_payment'])) {
      toast({ title: 'Not allowed', description: 'You do not have permission to accept payments.', variant: 'destructive' });
      return;
    }
    if (!selectedStaff) {
      toast({ title: 'Service staff required', description: 'Please select service staff before taking payment.', variant: 'destructive' });
      return;
    }
    setPaymentMode(mode);
    setPaymentModalOpen(true);
  };
  
  const handlePaymentSuccess = async (paymentDetails, skipOverride = false) => {
    try {
      // Normalize
      paymentDetails = paymentDetails || { method: paymentMode };
      if (paymentDetails && typeof paymentDetails === 'object' && !paymentDetails.method) {
        paymentDetails.method = paymentMode;
      }

      // Override for credit-sale
      if (!skipOverride && paymentDetails?.method === 'credit sale' && protectedActions.includes('approve_credit_sale') && !pendingCreditSale) {
        const captured = paymentDetails;
        setPendingCreditSale(captured);
        requireOverride('approve_credit_sale', {}, async () => {
          const details = pendingCreditSale || captured;
          setPendingCreditSale(null);
          await handlePaymentSuccess(details, true);
          setOverrideOpen(false);
          setPaymentModalOpen(false);
          try { await fetchDrafts(draftsPage); } catch {}
        });
        return;
      }

      const staffMember = serviceStaffList.find(s => s.id === selectedStaff);
      const waiterName = (staffMember && staffMember.username)
        || (editingDraft && editingDraft.waiter)
        || (user?.username || '');

      const saleData = {
        items: cart,
        table: selectedTable?.name,
        subtotal,
        discount: discountValue,
        tax,
        total,
        taxRate,
        paymentDetails,
        waiter: waiterName,
        cashier: user?.username || '',
        branch: { id: user?.branchId },
        section: branchSections.find(s => s.id === currentSection)?.name,
        serviceType: currentService,
        id: Date.now(),
        isReceipt: true,
      };

      // Credit sale -> create SUSPENDED order, link draft to orderId, then return
      if (paymentDetails?.method === 'credit sale') {
        const draftTable = currentService === 'Dine-in' ? selectedTable : null;
        const customerName = paymentDetails?.customer?.name || 'Walk-in';
        const customerPhone = paymentDetails?.customer?.phone || null;
        const draftData = { cart, service: currentService, customer: customerName, customerDetails: paymentDetails?.customer || { name: customerName, phone: customerPhone }, table: draftTable, sectionId: currentSection, total, waiter: waiterName, waiterId: selectedStaff, discount, taxRate };
        let updatedDrafts;
        let createdSuspendedOrder = null;
        try {
          createdSuspendedOrder = await api.orders.create({
            branchId: user.branchId,
            sectionId: currentSection,
            items: cart.map(ci => ({ productId: ci.id, qty: String(ci.qty), price: String(ci.price ?? 0) })),
            reservationKey,
            allowOverselling,
            tableId: draftTable?.id,
            status: 'SUSPENDED',
          });
        } catch (e) {
          const msg = e?.message || e;
          toast({ title: 'Credit sale failed to start', description: String(msg), variant: 'destructive' });
          return;
        }
        if (editingDraft) {
          updatedDrafts = drafts.map(d => d.id === editingDraft.id ? { ...d, ...draftData, orderId: (createdSuspendedOrder?.id || d.orderId || null), isSuspended: true, updatedAt: new Date().toISOString() } : d);
          toast({ title: 'Bill Suspended!', description: `Bill for "${editingDraft.name}" has been moved to credit.` });
        } else {
          const draftName = `Suspended: ${customerName}`;
          const newDraft = { id: Date.now(), name: draftName, ...draftData, orderId: createdSuspendedOrder?.id || null, isSuspended: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
          updatedDrafts = [...drafts, newDraft];
          toast({ title: 'Bill Suspended!', description: `"${draftName}" has been saved to pay later.` });
        }
        setDrafts(updatedDrafts);
        try {
          const sec = (branchSections || []).find(s => s.id === currentSection);
          const resolvedBranchId = user?.branchId || user?.branch?.id || sec?.branchId || undefined;
          const draftName = editingDraft ? editingDraft.name : `Suspended: ${customerName}`;
          const payload = { branchId: resolvedBranchId, sectionId: currentSection, tableId: draftTable?.id, orderId: createdSuspendedOrder?.id, name: draftName, serviceType: currentService, waiterId: selectedStaff || undefined, customerName, customerPhone, cart, subtotal: Number(subtotal), discount: Number(discountValue), tax: Number(tax), total: Number(total), status: 'SUSPENDED', reservationKey };
          if (editingDraft?.backendId) { await api.drafts.update(String(editingDraft.backendId), payload); } else { await api.drafts.create(payload); }
          await fetchDrafts(draftsPage);
        } catch {}
        // If an order was previously created in this session and tied to the table, mark it SUSPENDED to auto-release (best-effort, guarded)
        try { if (recentSales?.[0]?.orderId) { await api.orders.updateStatus(String(recentSales[0].orderId), { status: 'SUSPENDED' }); } } catch {}
        // recent sales entry for credit
        try { setRecentSales(prev => [{ ...saleData, paymentDetails: { method: 'credit sale' } }, ...prev].slice(0,50)); } catch {}
        // clear and unlock
        setPaymentModalOpen(false);
        setCart([]);
        setEditingDraft(null);
        setSelectedTable(null);
        setDiscount({ type: 'percentage', value: 0 });
        if (draftTable) { try { await updateTableStatus(draftTable.id, 'available'); } catch {} }
        try { if (currentSection) { const rows = await api.tables.list({ sectionId: currentSection }); setTables((rows || []).map(t => ({ id: t.id, name: t.name || t.code || t.id, sectionId: t.sectionId || t.section?.id || t.section, sectionName: t.section?.name || '', status: ((String(t.status || '').toLowerCase() === 'locked') || (String(t.status || '').toLowerCase() === 'occupied') || !!t.locked) ? 'occupied' : 'available', updatedAt: t.updatedAt || t.updated_at || null, }))); } } catch {}
        try { await refreshPricingAndStock(); } catch {}
        return;
      }

      // Settlement or Normal sale
      let receiptData = null;
      try {
        if (!hasAny(userPermissions, ['add_pos_sell', 'add_payment'])) {
          toast({ title: 'Not allowed', description: 'You do not have permission to accept payments.', variant: 'destructive' });
          return;
        }
        let createdOrder = null;
        if (editingDraft?.isSuspended && (editingDraft?.orderId || editingDraft?.backendId)) {
          const orderId = editingDraft.orderId || null;
          if (orderId) {
            // If split payment, add multiple entries; else single entry
            if (String(paymentDetails?.method || '').toLowerCase() === 'multiple') {
              const src = paymentDetails || {};
              const details = src.details || {};
              // fallback to flat fields or entries
              let cash = Number(details.cash ?? src.cash ?? 0);
              let card = Number(details.card ?? src.card ?? src.pos ?? 0);
              let bank = Number(details.bank ?? src.bank ?? src.transfer ?? 0);
              const entries = src.entries || src.payments;
              if (Array.isArray(entries)) {
                cash = cash || entries.filter(e => String(e.method||'').toLowerCase().includes('cash')).reduce((a,b)=>a+Number(b.amount||0),0);
                card = card || entries.filter(e => /card|pos/i.test(String(e.method||''))).reduce((a,b)=>a+Number(b.amount||0),0);
                bank = bank || entries.filter(e => !(String(e.method||'').toLowerCase().includes('cash') || /card|pos/i.test(String(e.method||'')))).reduce((a,b)=>a+Number(b.amount||0),0);
              }
              if (cash > 0) await api.orders.addPayment(String(orderId), { method: 'cash', amount: String(cash) });
              if (card > 0) await api.orders.addPayment(String(orderId), { method: 'card', amount: String(card) });
              if (bank > 0) await api.orders.addPayment(String(orderId), { method: 'bank', amount: String(bank) });
            } else {
              await api.orders.addPayment(String(orderId), { method: String(paymentDetails?.method || paymentMode), amount: String(total), reference: paymentDetails?.reference || undefined });
            }
            await api.orders.updateStatus(String(orderId), { status: 'PAID' });
            createdOrder = { id: orderId };
          } else {
            // Legacy fallback: create + mark paid
            const isSplit = String(paymentDetails?.method || '').toLowerCase() === 'multiple';
            createdOrder = await api.orders.create({ branchId: user.branchId, sectionId: currentSection, items: cart.map(ci => ({ productId: ci.id, qty: String(ci.qty), price: String(ci.price ?? 0) })), payment: isSplit ? undefined : { method: String(paymentDetails?.method || paymentMode), amount: String(total), reference: paymentDetails?.reference || undefined }, allowOverselling, tableId: selectedTable?.id, status: 'ACTIVE', reservationKey, serviceType: currentService, waiterId: selectedStaff || undefined, subtotal: String(subtotal), discount: String(discountValue), tax: String(tax), total: String(total), taxRate: String(taxRate ?? 0) });
            if (createdOrder?.id && isSplit) {
              const src = paymentDetails || {};
              const details = src.details || {};
              let cash = Number(details.cash ?? src.cash ?? 0);
              let card = Number(details.card ?? src.card ?? src.pos ?? 0);
              let bank = Number(details.bank ?? src.bank ?? src.transfer ?? 0);
              const entries = src.entries || src.payments;
              if (Array.isArray(entries)) {
                cash = cash || entries.filter(e => String(e.method||'').toLowerCase().includes('cash')).reduce((a,b)=>a+Number(b.amount||0),0);
                card = card || entries.filter(e => /card|pos/i.test(String(e.method||''))).reduce((a,b)=>a+Number(b.amount||0),0);
                bank = bank || entries.filter(e => !(String(e.method||'').toLowerCase().includes('cash') || /card|pos/i.test(String(e.method||'')))).reduce((a,b)=>a+Number(b.amount||0),0);
              }
              if (cash > 0) await api.orders.addPayment(String(createdOrder.id), { method: 'cash', amount: String(cash) });
              if (card > 0) await api.orders.addPayment(String(createdOrder.id), { method: 'card', amount: String(card) });
              if (bank > 0) await api.orders.addPayment(String(createdOrder.id), { method: 'bank', amount: String(bank) });
            }
            try { if (createdOrder?.id) await api.orders.updateStatus(String(createdOrder.id), { status: 'PAID' }); } catch {}
          }
          // Fetch backend order for printing
          try {
            const id = editingDraft?.orderId;
            if (id) {
              const ord = await api.orders.get(String(id));
              if (ord) {
                const payments = Array.isArray(ord.payments) ? ord.payments : [];
                let paymentDetailsResolved = null;
                if (payments.length === 1) {
                  const singleMethod = String(payments[0].method || '').toLowerCase();
                  if (singleMethod !== 'multiple') {
                    paymentDetailsResolved = { method: singleMethod, received: Number(payments[0].amount || 0), change: 0 };
                  } // if 'multiple', keep undefined so we fall back to POS-captured breakdown
                } else if (payments.length > 1) {
                  const details = { cash: 0, card: 0, bank: 0 };
                  payments.forEach(p => {
                    const m = String(p.method || '').toLowerCase();
                    const amt = Number(p.amount || 0);
                    if (m.includes('cash')) details.cash += amt; else if (m.includes('card') || m.includes('pos')) details.card += amt; else details.bank += amt;
                  });
                  paymentDetailsResolved = { method: 'multiple', details };
                }
                receiptData = {
                  id: ord.displayInvoice || ord.invoice_no || ord.invoiceNo || ord.receiptNo || ord.orderNumber || ord.id,
                  items: (ord.items || []).map(it => ({
                    id: it.productId || it.product?.id || it.id,
                    name: it.product?.name || it.productName || String(it.productId || ''),
                    qty: Number(it.qty || it.quantity || 0),
                    price: Number(it.price || 0),
                  })),
                  table: ord.table?.name || ord.tableName || saleData.table || selectedTable?.name || undefined,
                  subtotal: Number(ord.subtotal || saleData.subtotal || 0),
                  discount: Number(ord.discount || saleData.discount || 0),
                  tax: Number(ord.tax || saleData.tax || 0),
                  total: Number(ord.total || saleData.total || 0),
                  taxRate: Number(ord.taxRate || saleData.taxRate || taxRate || 0),
                  paymentDetails: paymentDetailsResolved || saleData.paymentDetails || undefined,
                  waiter: ord.waiter?.name || ord.waiterName || (serviceStaffList.find(s => s.id === selectedStaff)?.username) || (editingDraft?.waiter) || undefined,
                  cashier: user?.username || '',
                  branch: user?.branch || '',
                  section: ord.section?.name || undefined,
                  serviceType: ord.serviceType || currentService || undefined,
                  isReceipt: true,
                };
              }
            }
          } catch {}
          toast({ title: 'Payment Successful!', description: 'Suspended bill settled.' });
          try { window.dispatchEvent(new CustomEvent('reports:refresh', { detail: { branchId: user?.branchId } })); } catch {}
          try { window.dispatchEvent(new CustomEvent('orders:changed', { detail: { action: 'settled', orderId: editingDraft?.orderId || null } })); } catch {}
        } else {
          const isSplit = String(paymentDetails?.method || '').toLowerCase() === 'multiple';
          createdOrder = await api.orders.create({ branchId: user.branchId, sectionId: currentSection, items: cart.map(ci => ({ productId: ci.id, qty: String(ci.qty), price: String(ci.price ?? 0) })), payment: isSplit ? undefined : { method: String(paymentDetails?.method || paymentMode), amount: String(total), reference: paymentDetails?.reference || undefined }, allowOverselling, tableId: selectedTable?.id, status: 'ACTIVE', serviceType: currentService, waiterId: selectedStaff || undefined, subtotal: String(subtotal), discount: String(discountValue), tax: String(tax), total: String(total), taxRate: String(taxRate ?? 0) });
          if (createdOrder?.id && isSplit) {
            const src = paymentDetails || {};
            const details = src.details || {};
            let cash = Number(details.cash ?? src.cash ?? 0);
            let card = Number(details.card ?? src.card ?? src.pos ?? 0);
            let bank = Number(details.bank ?? src.bank ?? src.transfer ?? 0);
            const entries = src.entries || src.payments;
            if (Array.isArray(entries)) {
              cash = cash || entries.filter(e => String(e.method||'').toLowerCase().includes('cash')).reduce((a,b)=>a+Number(b.amount||0),0);
              card = card || entries.filter(e => /card|pos/i.test(String(e.method||''))).reduce((a,b)=>a+Number(b.amount||0),0);
              bank = bank || entries.filter(e => !(String(e.method||'').toLowerCase().includes('cash') || /card|pos/i.test(String(e.method||'')))).reduce((a,b)=>a+Number(b.amount||0),0);
            }
            if (cash > 0) await api.orders.addPayment(String(createdOrder.id), { method: 'cash', amount: String(cash) });
            if (card > 0) await api.orders.addPayment(String(createdOrder.id), { method: 'card', amount: String(card) });
            if (bank > 0) await api.orders.addPayment(String(createdOrder.id), { method: 'bank', amount: String(bank) });
          }
          // Fetch backend order for printing
          try {
            if (createdOrder?.id) {
              const ord = await api.orders.get(String(createdOrder.id));
              if (ord) {
                const payments = Array.isArray(ord.payments) ? ord.payments : [];
                let paymentDetailsResolved = null;
                if (payments.length === 1) {
                  paymentDetailsResolved = { method: String(payments[0].method || '').toLowerCase(), received: Number(payments[0].amount || 0), change: 0 };
                } else if (payments.length > 1) {
                  const details = { cash: 0, card: 0, bank: 0 };
                  payments.forEach(p => {
                    const m = String(p.method || '').toLowerCase();
                    const amt = Number(p.amount || 0);
                    if (m.includes('cash')) details.cash += amt; else if (m.includes('card') || m.includes('pos')) details.card += amt; else details.bank += amt;
                  });
                  paymentDetailsResolved = { method: 'multiple', details };
                }
                receiptData = {
                  id: ord.displayInvoice || ord.invoice_no || ord.invoiceNo || ord.receiptNo || ord.orderNumber || ord.id,
                  items: (ord.items || []).map(it => ({
                    id: it.productId || it.product?.id || it.id,
                    name: it.product?.name || it.productName || String(it.productId || ''),
                    qty: Number(it.qty || it.quantity || 0),
                    price: Number(it.price || 0),
                  })),
                  table: ord.table?.name || ord.tableName || saleData.table || selectedTable?.name || undefined,
                  subtotal: Number(ord.subtotal || saleData.subtotal || 0),
                  discount: Number(ord.discount || saleData.discount || 0),
                  tax: Number(ord.tax || saleData.tax || 0),
                  total: Number(ord.total || saleData.total || 0),
                  taxRate: Number(ord.taxRate || saleData.taxRate || taxRate || 0),
                  paymentDetails: paymentDetailsResolved || saleData.paymentDetails || undefined,
                  waiter: ord.waiter?.name || ord.waiterName || (serviceStaffList.find(s => s.id === selectedStaff)?.username) || (editingDraft?.waiter) || undefined,
                  cashier: user?.username || '',
                  branch: user?.branch || '',
                  section: ord.section?.name || undefined,
                  serviceType: ord.serviceType || currentService || undefined,
                  isReceipt: true,
                };
              }
            }
          } catch {}
          toast({ title: 'Payment Successful!', description: 'Order has been processed.' });
          // Mark order as PAID so table auto-releases (status-driven backend)
          try { if (createdOrder?.id) await api.orders.updateStatus(String(createdOrder.id), { status: 'PAID' }); } catch {}
          try { window.dispatchEvent(new CustomEvent('reports:refresh', { detail: { branchId: user?.branchId } })); } catch {}
          try { window.dispatchEvent(new CustomEvent('orders:changed', { detail: { action: 'created', orderId: createdOrder?.id || null } })); } catch {}
        }
        try { const rows = await api.inventory.listBySection({ sectionId: currentSection, autoRelease: true }); const secName = branchSections.find(s => s.id === currentSection)?.name || ''; if (secName) { setStockLevels(prev => { const next = { ...prev }; const byProduct = {}; (rows || []).forEach(r => { byProduct[r.productId] = Number(r.qtyOnHand || 0); }); Object.keys(byProduct).forEach(pid => { next[pid] = next[pid] || {}; next[pid][secName] = byProduct[pid]; }); return next; }); } } catch {}
        if (createdOrder) saleData.id = createdOrder.displayInvoice || createdOrder.invoice_no || createdOrder.invoiceNo || createdOrder.receiptNo || createdOrder.orderNumber || createdOrder.id;
      } catch (e) {
        const msg = e?.message || e; toast({ title: 'Order save failed', description: String(msg), variant: 'destructive' }); return;
      }

      if (editingDraft) {
        try { if (editingDraft.table) await updateTableStatus(editingDraft.table.id, 'available'); } catch {}
        setDrafts(drafts.filter(d => d.id !== editingDraft.id));
        try { const backendId = editingDraft.backendId || editingDraft.id; if (backendId) await api.drafts.remove(String(backendId)); await fetchDrafts(draftsPage); } catch {}
      } else if (selectedTable) {
        try { await updateTableStatus(selectedTable.id, 'available'); } catch {}
      }

      try { if (currentSection) { const rows = await api.tables.list({ sectionId: currentSection }); setTables((rows || []).map(t => ({ id: t.id, name: t.name || t.code || t.id, sectionId: t.sectionId || t.section?.id || t.section, sectionName: t.section?.name || '', status: ((String(t.status || '').toLowerCase() === 'locked') || (String(t.status || '').toLowerCase() === 'occupied') || !!t.locked) ? 'occupied' : 'available', updatedAt: t.updatedAt || t.updated_at || null, }))); } } catch {}

      setRecentSales([receiptData || saleData, ...recentSales].slice(0, 50));
      setPaymentModalOpen(false);
      setTimeout(() => { setPrintData({ type: 'final-receipt', data: receiptData || saleData }); }, 200);
      // If we were finalizing a suspended bill, keep the cart visible with the order items
      if (editingDraft?.isSuspended) {
        setEditingDraft(null);
        setSelectedTable(null);
        setDiscount({ type: 'percentage', value: 0 });
      } else {
        setCart([]);
        setEditingDraft(null);
        setSelectedTable(null);
        setDiscount({ type: 'percentage', value: 0 });
      }
      try { const freedId = (editingDraft && editingDraft.table ? editingDraft.table.id : (selectedTable ? selectedTable.id : null)); if (freedId) setTables(prev => prev.map(t => t.id === freedId ? { ...t, status: 'available' } : t)); } catch {}
      try { if (currentSection) { const rows = await api.tables.list({ sectionId: currentSection }); setTables((rows || []).map(t => ({ id: t.id, name: t.name || t.code || t.id, sectionId: t.sectionId || t.section?.id || t.section, sectionName: t.section?.name || '', status: ((String(t.status || '').toLowerCase() === 'locked') || (String(t.status || '').toLowerCase() === 'occupied') || !!t.locked) ? 'occupied' : 'available', }))); } } catch {}

    } catch (e) {
      console.error(e);
    } finally {
      setPaymentModalOpen(false);
    }
  };

  const handleCashDrawerAction = (details) => {
    console.log("Cash drawer action:", details);
    toast({ title: "Cash Drawer Updated", description: `${details.type === 'in' ? 'Added' : 'Removed'} ${fmt(details.amount)}` });
    setCashDrawerModalOpen(false);
  };

  const handleCardTerminalAction = (details) => {
    console.log("Card terminal action:", details);
    toast({ title: "Card terminal action:", description: `Processed ${details.type} for ${fmt(details.amount)}` });
    setCardTerminalModalOpen(false);
  };

  const handlePrintBill = () => {
    if (cart.length === 0) {
      toast({ title: 'Empty Cart', description: 'Cannot print a bill for an empty cart.', variant: 'destructive' });
      return;
    }
    const staffMember = serviceStaffList.find(s => s.id === selectedStaff);
    const waiterName = (staffMember && staffMember.username)
      || (editingDraft && editingDraft.waiter)
      || (user?.username || '');

    handlePrint('table-bill', {
      items: cart,
      table: selectedTable?.name,
      subtotal,
      discount: discountValue,
      tax,
      total,
      taxRate,
      waiter: waiterName,
      cashier: user?.username || '',
      branch: user?.branch || '',
      section: branchSections.find(s => s.id === currentSection)?.name,
      serviceType: currentService,
      isDraft: false,
    });
  };

  const handleReprint = async (sale) => {
    try {
      const id = sale?.id || sale?.orderId;
      if (!id) {
        setPrintData({ type: 'final-receipt', data: sale });
        return;
      }
      const ord = await api.orders.get(String(id));
      if (ord) {
        const receiptData = {
          id: ord.displayInvoice || ord.invoice_no || ord.invoiceNo || ord.receiptNo || ord.orderNumber || ord.id,
          items: (ord.items || []).map(it => ({
            id: it.productId || it.product?.id || it.id,
            name: it.product?.name || it.productName || String(it.productId || ''),
            qty: Number(it.qty || it.quantity || 0),
            price: Number(it.price || 0),
          })),
          table: ord.table?.name || ord.tableName || undefined,
          subtotal: Number(ord.subtotal || 0),
          discount: Number(ord.discount || 0),
          tax: Number(ord.tax || 0),
          total: Number(ord.total || 0),
          waiter: ord.waiter?.name || ord.waiterName || undefined,
          cashier: user?.username || '',
          branch: user?.branch || '',
          section: ord.section?.name || undefined,
          serviceType: ord.serviceType || undefined,
          isReceipt: true,
        };
        setPrintData({ type: 'final-receipt', data: receiptData });
        return;
      }
    } catch {}
    // Fallback to provided sale payload
    setPrintData({ type: 'final-receipt', data: sale });
  };

  const handleApplyDiscount = (newDiscount) => {
    setDiscount(newDiscount);
    setIsDiscountModalOpen(false);
  };

  const handleApplyTax = (newTaxRate) => {
    setTaxRate(newTaxRate);
    setIsTaxModalOpen(false);
  };


  const currentSectionName = branchSections.find(s => s.id === currentSection)?.name || '';
  const customerOptions = ['Walk-in', ...customers.map(c => c.name).filter(Boolean)];
  const subtotal = cart.reduce((sum, item) => sum + ((item.price || 0) * item.qty), 0);
  const discountValueRaw = discount.type === 'fixed' ? Number(discount.value || 0) : subtotal * (Number(discount.value || 0) / 100);
  const discountValue = Math.max(0, Math.min(Number.isFinite(discountValueRaw) ? discountValueRaw : 0, subtotal));
  const tax = subtotal * (Number(taxRate || 0) / 100);
  const total = subtotal + tax - discountValue;

  const displayedProducts = products
    .filter(p => {
        const resolved = (sectionPrices[p.id]?.[currentSectionName] ?? p.price);
        return resolved !== undefined && resolved !== null;
    })
    .filter(p => {
        if (activeCategory === 'All') return true;
        const cat = getProductCategoryName(p).toLowerCase();
        return cat === activeCategory.toLowerCase();
    })
    .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  
  return (
    <>
      <div className="flex flex-col h-screen font-sans print:hidden bg-white">
        <AppBar 
          time={time} 
          isOnline={isOnline} 
          user={user} 
          toggleTheme={toggleTheme} 
          currentTheme={currentTheme} 
          onBackToDashboard={onBackToDashboard}
          onLogout={onLogout}
          shiftRegister={shiftRegister}
          onShiftClose={onShiftClose}
          recentSales={recentSales}
          products={products}
          handlePrint={handlePrint}
          businessInfo={businessInfo}
        />
        <OverridePinModal
          open={isOverrideOpen}
          onClose={() => { setOverrideOpen(false); setPendingOverride(null); }}
          onConfirm={handleOverrideConfirm}
          title="Global Override Required"
          description="Enter Global Override PIN to confirm this action."
        />
        <ServiceStaffPinModal
          open={isServicePinModalOpen}
          mode="verify"
          onClose={() => { setServicePinModalOpen(false); setPendingStaffId(null); }}
          onVerify={handleVerifyServicePin}
        />
        <div className="flex flex-1 overflow-hidden">
          <ProductSidebar 
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            activeCategory={activeCategory}
            setActiveCategory={setActiveCategory}
            categories={sidebarCategories}
          />
          <CartPanel
            user={user}
            cart={cart}
            onUpdateQty={updateQty}
            onSetQty={setQty}
            onVoid={handleVoid}
            onPrintItem={handlePrintItem}
            subtotal={subtotal}
            discountValue={discountValue}
            tax={tax}
            total={total}
            currentSection={currentSection}
            setCurrentSection={setCurrentSection}
            branchSections={branchSections}
            currentService={currentService}
            setCurrentService={setCurrentService}
            currentCustomer={currentCustomer}
            setCurrentCustomer={setCurrentCustomer}
            customerOptions={customerOptions}
            selectedTable={selectedTable}
            setSelectedTable={setSelectedTable}
            onClearCart={() => handlePinRequest({ type: 'clear_cart' })}
            tables={tables}
            updateTableStatus={updateTableStatus}
            markTableStatus={markTableStatus}
            onSaveDraft={handleSaveDraft}
            onViewDrafts={() => setIsDraftsOpen(true)}
            onOpenCashDrawer={() => setCashDrawerModalOpen(true)}
            onTakePayment={handleTakePayment}
            draftCount={drafts.filter(d => !(d.isSuspended || String(d.status || '').toUpperCase() === 'SUSPENDED')).length}
            editingDraft={editingDraft}
            onPrintBill={handlePrintBill}
            canAcceptPayment={hasAny(userPermissions, ['add_pos_sell', 'add_payment'])}
            serviceStaffList={serviceStaffList}
            selectedStaff={selectedStaff}
            setSelectedStaff={requestSelectStaff}
            onPrintByCategory={handlePrintByCategory}
            onViewSalesHistory={() => setIsSalesHistoryOpen(true)}
            onEditDiscount={() => handlePinRequest({ type: 'edit_discount' })}
            onEditTax={() => setIsTaxModalOpen(true)}
            taxRate={taxRate}
            serviceTypes={serviceTypes}
            currencySymbol={(() => {
              const raw = (businessInfo && (businessInfo.currencySymbol || businessInfo.currency)) || '₦';
              const str = String(raw).trim();
              const symbolMatch = str.match(/[$€£₦¥₹₽﷼₺₩₫]/);
              if (symbolMatch) return symbolMatch[0];
              const code = (str.split(/\s|-|\|/)[0] || '').toUpperCase().slice(0,3);
              const map = { NGN: '₦', USD: '$', EUR: '€', GBP: '£', JPY: '¥', CNY: '¥', INR: '₹' };
              return map[code] || (code && code.length === 3 ? code : '₦');
            })()}
          />
          {(Array.isArray(branchSections) && branchSections.length === 0) && (
            <div className="mx-4 mb-4 p-3 rounded-md bg-yellow-50 text-yellow-800 border border-yellow-200">
              No sections found for this branch. Create at least one section in Settings → Sections to start selling.
            </div>
          )}
          {(Array.isArray(serviceTypes) && serviceTypes.length === 0) && (
            <div className="mx-4 mb-4 p-3 rounded-md bg-blue-50 text-blue-800 border border-blue-200">
              No service types configured. Add service types (e.g., Dine-in, Takeaway) in Settings → Service Types.
            </div>
          )}
          {(currentSection && Array.isArray(tables) && tables.filter(t => t.sectionId === currentSection).length === 0) && (
            <div className="mx-4 mb-4 p-3 rounded-md bg-rose-50 text-rose-800 border border-rose-200">
              No tables in the selected section. Add tables in Settings → Tables or switch to a section that has tables.
            </div>
          )}
          <main className="flex-1 p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4 overflow-y-auto content-start">
            {displayedProducts.map(p => {
              const sectionPriceMap = sectionPrices[p.id] || {};
              const preferred = sectionPriceMap[currentSectionName];
              const anySectionPrice = preferred !== undefined ? preferred : Object.values(sectionPriceMap)[0];
              const resolvedPrice = (anySectionPrice !== undefined && anySectionPrice !== null) ? anySectionPrice : p.price;
              return (
              <ProductCard
                key={p.id}
                product={p}
                sectionName={currentSectionName}
                stockReady={stockReady}
                stock={(stockLevels[p.id]?.[currentSectionName] ?? stockLevels[p.id]?.['default'] ?? 0)}
                price={resolvedPrice}
                onAdd={addToCart}
                allowOverselling={allowOverselling}
              />
            );})}
          </main>
        </div>
        <PinModal
          isOpen={isPinModalOpen}
          onClose={() => setPinModalOpen(false)}
          onSuccess={() => handlePinSuccess(pinAction)}
          user={user}
        />
        <DraftsDialog 
          isOpen={isDraftsOpen}
          onClose={() => setIsDraftsOpen(false)}
          drafts={drafts}
          onLoad={handleLoadDraft}
          onDelete={handleDeleteDraft}
          onViewSuspended={handleViewSuspended}
          onSettleSuspended={handleSettleSuspended}
          onReturnSuspended={(draft) => setReturnOrder({ orderId: draft?.orderId, draft })}
          isLoading={loadingDrafts}
          page={draftsPage}
          pageSize={draftsPageSize}
          total={drafts.filter(d => !(d.isSuspended || String(d.status || '').toUpperCase() === 'SUSPENDED')).length}
          onPageChange={(p) => fetchDrafts(p)}
          onPageSizeChange={(sz) => { setDraftsPageSize(sz); fetchDrafts(1); }}
          onRefresh={() => fetchDrafts(draftsPage)}
        />
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setPaymentModalOpen(false)}
          totalAmount={total}
          onPaymentSuccess={handlePaymentSuccess}
          initialTab={paymentMode}
        />
        <CashDrawerModal
          isOpen={isCashDrawerModalOpen}
          onClose={() => setCashDrawerModalOpen(false)}
          onSubmit={handleCashDrawerAction}
        />
        <CardTerminalModal
          isOpen={isCardTerminalModalOpen}
          onClose={() => setCardTerminalModalOpen(false)}
          onSubmit={handleCardTerminalAction}
        />
        <SalesHistoryDialog
          isOpen={isSalesHistoryOpen}
          onClose={() => setIsSalesHistoryOpen(false)}
          sales={recentSales}
          onReprint={handleReprint}
        />
        <DiscountTaxModal
          isOpen={isDiscountModalOpen}
          onClose={() => setIsDiscountModalOpen(false)}
          onApply={handleApplyDiscount}
          title="Apply Discount"
          type="discount"
          initialValue={discount}
        />
        <DiscountTaxModal
          isOpen={isTaxModalOpen}
          onClose={() => setIsTaxModalOpen(false)}
          onApply={handleApplyTax}
          title="Apply Tax"
          type="tax"
          initialValue={taxRate}
        />
      </div>
      {/* View Suspended Order Modal */}
      {viewOrder && (
        <Dialog open={true} onOpenChange={() => setViewOrder(null)}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Suspended Order</DialogTitle>
              <DialogDescription>Review items for {viewOrder?.draft?.name}</DialogDescription>
            </DialogHeader>
            <div className="max-h-[50vh] overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr><th className="text-left p-2">Item</th><th className="text-right p-2">Qty</th><th className="text-right p-2">Price</th></tr>
                </thead>
                <tbody>
                  {(viewOrder?.order?.items || []).map((it, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="p-2">{it.product?.name || it.productName || it.productId}</td>
                      <td className="p-2 text-right">{it.qty}</td>
                      <td className="p-2 text-right">{fmt(it.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-3 text-right font-semibold">Total: {fmt(viewOrder?.order?.total || viewOrder?.draft?.total)}</div>
            </div>
            <DialogFooter>
              <Button onClick={() => setViewOrder(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {/* Return Suspended Order Modal */}
      {returnOrder && (
        <Dialog open={true} onOpenChange={() => setReturnOrder(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Return Sale</DialogTitle>
              <DialogDescription>Select what to return. For now, you can return all.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Button variant="destructive" onClick={handleReturnAll}>Return All</Button>
            </div>
            <DialogFooter>
              <Button onClick={() => setReturnOrder(null)} variant="outline">Cancel</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {printData && <PrintView ref={printRef} type={printData.type} data={printData.data} />}
    </>
  );
};

const AppBar = ({ time, isOnline, user, toggleTheme, currentTheme, onBackToDashboard, onLogout, shiftRegister, onShiftClose, recentSales, products, handlePrint, businessInfo }) => {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isCloseFormOpen, setIsCloseFormOpen] = useState(false);
  const [closingCash, setClosingCash] = useState('');
  const [isZReportOpen, setIsZReportOpen] = useState(false);
  const [reportData, setReportData] = useState(null);

  const generateReportData = async () => {
    if (!shiftRegister) return null;
    try {
      const payload = { shiftId: shiftRegister.id, branchId: shiftRegister.branchId, sectionId: shiftRegister.sectionId };
      const rep = await api.reports.shift(payload);
      const itemsByCategory = (rep?.items?.byCategory || []).reduce((acc, it) => {
        acc[it.name || 'Unknown'] = [...(acc[it.name || 'Unknown'] || []), { name: it.name || 'Unknown', qty: it.count }];
        return acc;
      }, {});
      const byBrand = (rep?.items?.byBrand || []).reduce((acc, it) => {
        acc[it.name || 'N/A'] = [...(acc[it.name || 'N/A'] || []), { name: it.name || 'N/A', qty: it.count }];
        return acc;
      }, {});
      const paymentBreakdown = {
        cash: rep?.summary?.byMethod?.cash || 0,
        card: rep?.summary?.byMethod?.card || 0,
        transfer: rep?.summary?.byMethod?.transfer || 0,
      };
      const serviceStaff = 'N/A';
      const cashiers = (rep?.staff?.cashiers || []).map(c => c.name).filter(Boolean).join(', ') || 'N/A';
      return {
        items: (rep?.items?.byCategory || []).map(it => ({ id: it.name, name: it.name, qty: it.count, brand: 'N/A', category: it.name })),
        byBrand,
        byCategory: itemsByCategory,
        totalSales: rep?.summary?.totalSales || 0,
        ...paymentBreakdown,
        totalCredit: rep?.summary?.totalCreditSales || 0,
        serviceStaff,
        cashiers,
        shiftRegister,
        user,
        reportType: 'Shift Details'
      };
    } catch {
      return null;
    }
  };

  const handleOpenReport = async (type) => {
    const data = await generateReportData();
    if (data) {
      const reportWithType = {...data, reportType: type};
      setReportData(reportWithType);
      if (type === 'Z-Report') {
        setIsZReportOpen(true);
      } else {
        setIsDetailsOpen(true);
      }
    } else {
      toast({ title: "No active shift", description: "Cannot generate a report without an active shift." });
    }
  };

  const handlePrintReport = () => {
    handlePrint('z-report', reportData); // Re-using z-report print view
  };

  const handleExportReport = () => {
    toast({ title: "Feature coming soon!", description: "Export functionality is not yet implemented." });
  };

  const handleCloseRegister = async (e) => {
    e.preventDefault();
    const cashAmount = parseFloat(closingCash);
    if (isNaN(cashAmount) || cashAmount < 0) {
      toast({ title: "Invalid Amount", description: "Please enter a valid closing cash amount.", variant: "destructive" });
      return;
    }
    try {
      await api.shifts.close(shiftRegister.id, { closingCash: cashAmount });
      toast({ title: "Register Closed!", description: `Shift ended.` });
      setIsCloseFormOpen(false);
      onShiftClose();
      onBackToDashboard();
    } catch (err) {
      toast({ title: 'Failed to close shift', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  const notifications = [
    { id: 2, text: "System updated to version 1.1.0.", time: "Yesterday" },
  ];

  return (
    <header className="flex items-center justify-between h-16 px-4 bg-card border-b shrink-0">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBackToDashboard} aria-label="Back to Dashboard">
          <ArrowLeft className="w-6 h-6 text-primary" />
        </Button>
        {businessInfo?.logoUrl ? (
          <img src={businessInfo.logoUrl} alt="logo" className="h-8 w-auto object-contain" />
        ) : <Coffee className="w-6 h-6 text-primary" />}
        <div className="flex flex-col leading-tight">
          <span className="font-bold text-lg">{businessInfo?.name || 'POS'}</span>
          <span className="text-xs text-muted-foreground">{(user?.branch && (user.branch.name || user.branch)) || ''}</span>
        </div>
      </div>
      <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
        <span>{time.toLocaleTimeString()}</span>
        {isOnline ? <Wifi className="w-4 h-4 text-green-500" /> : <WifiOff className="w-4 h-4 text-destructive" />}
      </div>
      <div className="flex items-center gap-4">
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="View Shift Register Details" onClick={() => handleOpenReport('Shift Details')}>
              <Eye className="w-5 h-5" />
            </Button>
          </DialogTrigger>
          <ReportDialogContent reportData={reportData} onClose={() => setIsDetailsOpen(false)} onPrint={handlePrintReport} onExport={handleExportReport} />
        </Dialog>

        <Dialog open={isCloseFormOpen} onOpenChange={setIsCloseFormOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Close Shift Register">
              <X className="w-5 h-5 text-red-500" />
            </Button>
          </DialogTrigger>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>Close Shift Register</DialogTitle>
                  <DialogDescription>Count the cash in the drawer and enter the final amount.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCloseRegister} className="space-y-4 pt-4">
                  <p className="text-sm text-muted-foreground">Expected amount: <span className="font-bold text-foreground">{fmt(shiftRegister?.expectedCash ?? shiftRegister?.openingCash ?? 0)}</span></p>
                  <div className="space-y-2">
                      <Label htmlFor="closing-cash">Counted Cash Amount</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="closing-cash" type="number" step="0.01" value={closingCash} onChange={(e) => setClosingCash(e.target.value)} placeholder="e.g., 4100.50" className="pl-8" required/>
                      </div>
                  </div>
                  <DialogFooter>
                      <Button type="button" variant="ghost" onClick={() => setIsCloseFormOpen(false)}>Cancel</Button>
                      <Button type="submit" variant="destructive">Confirm & Close Shift</Button>
                  </DialogFooter>
              </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isZReportOpen} onOpenChange={setIsZReportOpen}>
          <DialogTrigger asChild>
             <Button variant="ghost" size="icon" aria-label="Z-Report" onClick={() => handleOpenReport('Z-Report')}>
                <Wallet className="w-5 h-5" />
            </Button>
          </DialogTrigger>
          <ReportDialogContent reportData={reportData} onClose={() => setIsZReportOpen(false)} onPrint={handlePrintReport} onExport={handleExportReport} />
        </Dialog>
        
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Notifications">
                  <Bell className="w-5 h-5" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.length > 0 ? (
                    notifications.map(n => (
                        <DropdownMenuItem key={n.id} className="flex flex-col items-start">
                            <p className="text-sm">{n.text}</p>
                            <p className="text-xs text-muted-foreground">{n.time}</p>
                        </DropdownMenuItem>
                    ))
                ) : (
                    <DropdownMenuItem disabled>No new notifications</DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {currentTheme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </Button>

        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center font-semibold text-primary">
                      {(user?.username?.charAt(0)?.toUpperCase()) || '?'}
                    </div>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    <DropdownMenuItem>
                        <UserIcon className="mr-2 h-4 w-4" />
                        {(() => {
                          const humanRole = user?.appRole?.name || user?.role || '';
                          return <span>{`${user?.username || 'User'}${humanRole ? ` (${humanRole})` : ''}`}</span>;
                        })()}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toast({ title: "🚧 This feature isn't implemented yet—but don't worry! You can request it in your next prompt! 🚀" })}>
                        <Info className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                    </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>

      </div>
    </header>
  )
};

const ReportDialogContent = ({ reportData, onClose, onPrint, onExport }) => (
    <DialogContent className="max-w-3xl">
        <DialogHeader>
            <DialogTitle>{reportData?.reportType || 'Report'}</DialogTitle>
            <DialogDescription>This report summarizes the financial activity for the current shift.</DialogDescription>
        </DialogHeader>
        {reportData ? (
        <div className="max-h-[70vh] overflow-y-auto p-1 text-sm">
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-4">
                <InfoItem label="Section" value={reportData.shiftRegister.sectionName} />
                <InfoItem label="Report Generated By" value={reportData.user?.username || ''} />
                <InfoItem label="Shift Started" value={new Date(reportData.shiftRegister.openedAt).toLocaleString()} />
                <InfoItem label="Report Time" value={new Date().toLocaleString()} />
            </div>

            <h3 className="font-bold text-lg my-4 border-b pb-2">Sales Summary</h3>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                <InfoItem label="Total Sales" value={`${fmt(reportData.totalSales)}`} className="font-bold text-primary" />
                <InfoItem label="Total Credit Sales" value={`${fmt(reportData.totalCredit)}`} />
                <InfoItem label="Paid by Cash" value={`${fmt(reportData.cash)}`} />
                <InfoItem label="Paid by Card" value={`${fmt(reportData.card)}`} />
                <InfoItem label="Paid by Transfer" value={`${fmt(reportData.transfer)}`} />
            </div>
            
            <h3 className="font-bold text-lg my-4 border-b pb-2">Items Sold ({reportData.items.reduce((sum, i) => sum + i.qty, 0)} total)</h3>
            <div className="space-y-1">
                {reportData.items.map(item => <InfoItem key={item.id} label={item.name} value={item.qty} />)}
            </div>

            <h3 className="font-bold text-lg my-4 border-b pb-2">Sales by Category</h3>
            {Object.entries(reportData.byCategory).map(([category, items]) => (
                <div key={category} className="mb-3">
                    <p className="font-semibold mb-1">{category} ({items.reduce((sum, i) => sum + i.qty, 0)} items)</p>
                    <div className="pl-4 space-y-1 border-l">
                        {items.map(item => <InfoItem key={item.id} label={item.name} value={item.qty} />)}
                    </div>
                </div>
            ))}

            <h3 className="font-bold text-lg my-4 border-b pb-2">Sales by Brand</h3>
             {Object.entries(reportData.byBrand).map(([brand, items]) => (
                <div key={brand} className="mb-3">
                    <p className="font-semibold mb-1">{brand} ({items.reduce((sum, i) => sum + i.qty, 0)} items)</p>
                    <div className="pl-4 space-y-1 border-l">
                        {items.map(item => <InfoItem key={item.id} label={item.name} value={item.qty} />)}
                    </div>
                </div>
            ))}

            <h3 className="font-bold text-lg my-4 border-b pb-2">Staff</h3>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                <InfoItem label="Service Staff" value={reportData.serviceStaff || 'N/A'} />
                <InfoItem label="Cashiers" value={reportData.cashiers || 'N/A'} />
            </div>
        </div>
        ) : <p>No active shift register data to display.</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onExport}><Download className="w-4 h-4 mr-2" /> Export</Button>
          <Button onClick={onPrint}><Printer className="w-4 h-4 mr-2" /> Print Report</Button>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
    </DialogContent>
);

const ProductSidebar = ({ searchTerm, setSearchTerm, activeCategory, setActiveCategory, categories: sidebarCats = categories }) => (
  <aside className="w-[320px] bg-card border-r p-4 flex flex-col gap-4">
    <div className="relative">
      <Input 
        placeholder="Search... (⌘K)" 
        className="pl-10" 
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
    </div>
    <div className="flex gap-2 flex-wrap">
      {sidebarCats.map(c => (
        <button
          key={c}
          onClick={() => setActiveCategory(c)}
          className={`px-3 py-1.5 text-xs rounded-full border transition-colors
            ${activeCategory === c
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
        >
          {c}
        </button>
      ))}
    </div>
  </aside>
);

const ProductCard = ({ product, stock, stockReady, price, onAdd, allowOverselling }) => {
  const isOutOfStock = !!stockReady && (stock <= 0) && !allowOverselling;

  const handleClick = () => {
    if (!isOutOfStock) {
      onAdd(product);
    }
  };

  return (
    <motion.div whileHover={!isOutOfStock ? { scale: 1.02 } : {}}>
      <Card 
        className={`rounded-xl shadow-sm hover:shadow overflow-hidden relative aspect-square border border-slate-200 ${isOutOfStock ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
        onClick={handleClick}
      >
        {/* Background image or placeholder covering full card */}
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 w-full h-full bg-muted flex items-center justify-center">
            <Image className="w-10 h-10 text-muted-foreground" />
          </div>
        )}
        {/* Subtle gradient for readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/10 to-black/40" />

        {/* Overlay content */}
        <div className="absolute inset-0 p-2 flex flex-col">
          <div className="flex-1" />
          <div className="space-y-1">
            <h3 className="font-extrabold text-sm leading-tight line-clamp-2 text-white drop-shadow">{product.name}</h3>
            <div className="flex justify-between items-center">
              <span className="text-sm font-extrabold text-white drop-shadow">{fmt(price || 0)}</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-600/80 text-white`}>
                { !stockReady ? '...' : (stock === undefined ? 'N/A' : `Stock: ${stock}`) }
              </span>
            </div>
          </div>
        </div>

        {isOutOfStock && (
          <div className="absolute top-1.5 right-1.5 z-10">
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-amber-500 text-white px-1.5 py-0.5 rounded">
              <AlertTriangle className="w-3 h-3" />
              Out of stock
            </span>
          </div>
        )}
      </Card>
    </motion.div>
  );
};

const CartPanel = ({ user = {}, cart = [], onUpdateQty, onSetQty, onVoid, onPrintItem, subtotal = 0, discountValue = 0, tax = 0, total = 0, currentSection, setCurrentSection, branchSections = [], currentService = '', setCurrentService, currentCustomer = '', setCurrentCustomer, customerOptions = [], selectedTable = null, setSelectedTable, onClearCart, tables = [], updateTableStatus, onSaveDraft, onViewDrafts, onOpenCashDrawer, onTakePayment, draftCount = 0, editingDraft = null, onPrintBill, canAcceptPayment = true, serviceStaffList = [], selectedStaff = null, setSelectedStaff, onPrintByCategory, onViewSalesHistory, onEditDiscount, onEditTax, taxRate = 0, serviceTypes = [], currencySymbol = '₦' }) => {
  const isDineIn = /dine/i.test(String(currentService || '').trim());
  const [editQty, setEditQty] = useState({});
  return (
  <aside className="w-[460px] bg-card border-l flex flex-col">
    <div className="p-4 border-b space-y-3">
       {editingDraft && (
        <div className="p-2 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 rounded-md text-sm text-center">
          Editing: <span className="font-semibold">{editingDraft.name}</span>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="w-full flex justify-between">
              {branchSections.find(s => s.id === currentSection)?.name || 'Select Section'}
              <ChevronDown className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            {branchSections.length > 0 ? branchSections.map(section => (
              <DropdownMenuItem key={section.id} onSelect={() => setCurrentSection(section.id)}>
                {section.name}
              </DropdownMenuItem>
            )) : <DropdownMenuItem disabled>No sections in this branch</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="w-full flex justify-between" disabled={!!editingDraft}>
              {currentService || 'Select Service'}
              <ChevronDown className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            {serviceTypes.map(type => (
              <DropdownMenuItem key={type} onSelect={() => setCurrentService(type)}>
                {type}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="w-full flex justify-between" disabled={!!editingDraft}>
              {currentCustomer || 'Select Customer'}
              <ChevronDown className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            {(customerOptions || ['Walk-in']).map(name => (
              <DropdownMenuItem key={name} onSelect={() => setCurrentCustomer(name)}>
                {name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="w-full flex justify-between items-center" disabled={!!editingDraft}>
              <span className="truncate">{serviceStaffList.find(s => s.id === selectedStaff)?.username || 'service staff'}</span>
              <ChevronDown className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            {serviceStaffList.map(staff => (
              <DropdownMenuItem key={staff.id} onSelect={() => setSelectedStaff(staff.id)}>
                {staff.username}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild disabled={!isDineIn || !!editingDraft}>
            <Button variant="outline" size="sm" className={`w-full flex justify-between ${selectedTable ? 'border-accent text-accent' : ''}`}>
              {selectedTable ? `Table: ${selectedTable.name}` : 'Select Table'}
              <ChevronDown className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            {tables
              .filter(t => t.sectionId === currentSection)
              .map(table => (
              <DropdownMenuItem 
                key={table.id} 
                onSelect={async () => {
                  if (!isDineIn) return;
                  try {
                    // Optimistically set selection to avoid add-to-cart race
                    setSelectedTable({ ...table, status: 'occupied' });
                    const ok = await updateTableStatus(table.id, 'occupied');
                    if (ok) {
                      if (typeof markTableStatus === 'function') {
                        try { markTableStatus(table.id, 'occupied'); } catch {}
                      }
                      toast({ title: `Table ${table.name} locked.` });
                    } else {
                      setSelectedTable(null);
                      toast({ title: `Could not lock ${table.name}`, description: 'Please choose another table.', variant: 'destructive' });
                    }
                  } catch (e) {
                    setSelectedTable(null);
                    toast({ title: `Could not lock ${table.name}`, description: String(e?.message || e), variant: 'destructive' });
                  }
                }}
                disabled={!isDineIn || (table.status === 'occupied' && (!editingDraft || editingDraft.table?.id !== table.id))}
              >
                <span className="flex items-center justify-between w-full">
                  {table.name} 
                  <span className={`text-xs capitalize ${table.status === 'available' ? 'text-green-400' : 'text-red-400'}`}>
                    {table.status}
                  </span>
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {cart.length === 0 ? <p className="text-center text-muted-foreground mt-8">Cart is empty</p> : cart.map(item => (
        <div key={item.id} className="flex items-center bg-background p-2 rounded-lg">
          <div className="flex-1">
            <p className="font-medium">{item.name}</p>
            <p className="text-sm text-muted-foreground">{currencySymbol}{(item.price || 0).toFixed(2)}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onUpdateQty(item.id, -1)}><Minus className="w-4 h-4" /></Button>
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              className="w-14 h-8 text-center"
              value={editQty[item.id] ?? item.qty}
              onChange={(e) => setEditQty(prev => ({ ...prev, [item.id]: e.target.value }))}
              onBlur={() => { const v = editQty[item.id]; if (v !== undefined) { onSetQty?.(item.id, v); setEditQty(prev => { const n = { ...prev }; delete n[item.id]; return n; }); } }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.currentTarget.blur(); } }}
            />
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onUpdateQty(item.id, 1)}><Plus className="w-4 h-4" /></Button>
          </div>
          <p className="w-20 text-right font-semibold">{currencySymbol}{((item.price || 0) * item.qty).toFixed(2)}</p>
          <div className="flex items-center ml-1">
            <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={() => onPrintItem(item)}><Printer className="w-4 h-4" /></Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => onVoid(item.id)}><X className="w-4 h-4" /></Button>
          </div>
        </div>
      ))}
    </div>
    <div className="p-2 border-t space-y-2 bg-background/50">
      <div className="space-y-0.5 text-xs">
        <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{currencySymbol}{subtotal.toFixed(2)}</span></div>
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <span className="text-muted-foreground">Discount</span>
            <Button variant="ghost" size="icon" className="h-4 w-4 ml-1" onClick={onEditDiscount}>
              <Pencil className="h-3 w-3" />
            </Button>
          </div>
          <span className="text-destructive">-{currencySymbol}{discountValue.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <span className="text-muted-foreground">Tax ({taxRate}%)</span>
            <Button variant="ghost" size="icon" className="h-4 w-4 ml-1" onClick={onEditTax}>
              <Pencil className="h-3 w-3" />
            </Button>
          </div>
          <span>{currencySymbol}{tax.toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-bold text-base"><span className="text-foreground">Total</span><span>{currencySymbol}{total.toFixed(2)}</span></div>
      </div>
      <div className="flex gap-1">
        <Button size="sm" variant="destructive" className="flex-1 h-8 text-xs" onClick={onClearCart}><Trash2 className="w-3 h-3 mr-1"/> Clear</Button>
        <Button size="sm" className="flex-1 h-8 text-xs" onClick={onPrintBill}><Printer className="w-3 h-3 mr-1"/> Bill</Button>
        <Button 
          className="flex-1 h-8 text-xs bg-accent hover:bg-accent/90 text-accent-foreground font-bold" 
          onClick={() => onTakePayment('cash')}
          disabled={!canAcceptPayment}
          title={!canAcceptPayment ? "You do not have permission to accept payments" : "Process Payment"}
        >
          Payment
        </Button>
      </div>
      <div className="grid grid-cols-6 gap-1">
        <Button size="icon" variant="secondary" className="h-8 w-full" onClick={onSaveDraft} title="Save Draft"><FileText className="w-4 h-4" /></Button>
        <Button size="icon" variant="secondary" className="h-8 w-full relative" onClick={onViewDrafts} title="View Drafts">
          <FolderOpen className="w-4 h-4" />
          {draftCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {draftCount}
            </span>
          )}
        </Button>
        <Button size="icon" variant="secondary" className="h-8 w-full" onClick={() => onPrintByCategory('bar')} title="Print Bar Items"><Beer className="w-4 h-4" /></Button>
        <Button size="icon" variant="secondary" className="h-8 w-full" onClick={() => onPrintByCategory('kitchen')} title="Print Kitchen Items"><ChefHat className="w-4 h-4" /></Button>
        <Button size="icon" variant="secondary" className="h-8 w-full" onClick={onViewSalesHistory} title="View Sales History"><Wallet className="w-4 h-4" /></Button>
        <Button size="icon" variant="secondary" className="h-8 w-full" onClick={() => onPrintByCategory('grill')} title="Print Grill Items"><Layers className="w-4 h-4" /></Button>
      </div>
    </div>
  </aside>
  );
};

const DraftsDialog = ({ isOpen, onClose, drafts, onLoad, onDelete, onViewSuspended, onSettleSuspended, onReturnSuspended, isLoading, page, pageSize, total, onPageChange, onPageSizeChange, onRefresh }) => (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Saved Drafts</DialogTitle>
        <DialogDescription>Select an item to load, edit, or delete.</DialogDescription>
      </DialogHeader>
      <div className="max-h-[60vh] overflow-y-auto p-1">
        {isLoading ? (
          <p className="text-center text-muted-foreground py-10">Loading drafts...</p>
        ) : drafts.length > 0 ? (
          <div className="space-y-3">
            {drafts.sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt)).map(draft => (
              <div key={draft.id} className={`border rounded-lg p-3 flex justify-between items-center ${draft.isSuspended ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' : ''}`}>
                <div>
                  <p className="font-semibold">{draft.isSuspended ? (draft.invoice ? `#${draft.invoice}` : draft.name) : draft.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {draft.cart.length} items - {draft.service}
                    {draft.table && ` - Table: ${draft.table.name}`}
                    {draft.isSuspended && ` - Total: ${draft.total.toFixed(2)}`}
                    {draft.waiter && ` | Waiter: ${draft.waiter}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Last updated: {new Date(draft.updatedAt).toLocaleString()}
                    {draft.customerDetails?.phone && ` | Phone: ${draft.customerDetails.phone}`}
                  </p>
                </div>
                {draft.isSuspended ? (
                  <div className="flex gap-2 items-center">
                    <Button size="sm" variant="secondary" onClick={() => onViewSuspended?.(draft)}>View</Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="default">Paid ▾</Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {['cash','card','transfer','mobile'].map(m => (
                          <DropdownMenuItem key={m} onClick={() => onSettleSuspended?.(draft, m)}>{m}</DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button size="sm" variant="outline" onClick={() => onReturnSuspended?.(draft)}>Return Sale</Button>
                    <Button size="sm" variant="destructive" onClick={() => onDelete(draft.id)}>Delete</Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => onLoad(draft)}>Load</Button>
                    <Button size="sm" variant="destructive" onClick={() => onDelete(draft.id)}>Delete</Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-10">No saved drafts or suspended bills.</p>
        )}
      </div>
      <div className="flex items-center justify-between px-1 py-2">
        <div className="flex items-center gap-2 text-sm">
          <span>Rows per page</span>
          <select
            className="border rounded px-2 py-1 bg-background"
            value={pageSize}
            onChange={(e) => onPageSizeChange?.(parseInt(e.target.value, 10))}
          >
            {[10,20,50,100].map(sz => <option key={sz} value={sz}>{sz}</option>)}
          </select>
          <span className="ml-3">{Math.min((page-1)*pageSize+1, total)}-{Math.min(page*pageSize, total)} of {total}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => onRefresh?.()} title="Refresh">Refresh</Button>
          <Button variant="outline" size="sm" onClick={() => onPageChange?.(Math.max(1, page-1))} disabled={page <= 1}>Prev</Button>
          <Button variant="outline" size="sm" onClick={() => onPageChange?.(page+1)} disabled={(page*pageSize) >= total}>Next</Button>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={onClose}>Close</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

const SalesHistoryDialog = ({ isOpen, onClose, sales, onReprint }) => (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent className="max-w-3xl">
      <DialogHeader>
        <DialogTitle>Recent Sales</DialogTitle>
        <DialogDescription>View and reprint receipts from recent transactions.</DialogDescription>
      </DialogHeader>
      <div className="max-h-[60vh] overflow-y-auto p-1">
        {sales.length > 0 ? (
          <div className="space-y-3">
            {sales.map(sale => (
              <div key={sale.id} className="border rounded-lg p-3 flex justify-between items-center">
                <div>
                  <p className="font-semibold">Receipt #{sale.id}</p>
                  <p className="text-sm text-muted-foreground">
                    {sale.items.length} items - Total: ${sale.total.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(sale.id).toLocaleString()} | Cashier: {sale.cashier}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => onReprint(sale)}>
                  <Printer className="w-4 h-4 mr-2" />
                  Reprint
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-10">No recent sales to display.</p>
        )}
      </div>
      <DialogFooter>
        <Button onClick={onClose}>Close</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

const DiscountTaxModal = ({ isOpen, onClose, onApply, title, type, initialValue }) => {
  const [currentType, setCurrentType] = useState(type === 'discount' ? initialValue.type : 'percentage');
  const [value, setValue] = useState(type === 'discount' ? initialValue.value : initialValue);

  useEffect(() => {
    if (isOpen) {
      if (type === 'discount') {
        setCurrentType(initialValue.type);
        setValue(initialValue.value);
      } else {
        setValue(initialValue);
      }
    }
  }, [isOpen, initialValue, type]);

  const handleApply = () => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0) {
      toast({ title: 'Invalid Value', description: 'Please enter a non-negative number.', variant: 'destructive' });
      return;
    }
    if (type === 'discount') {
      onApply({ type: currentType, value: numValue });
    } else {
      onApply(numValue);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {type === 'discount' ? 'Set a discount for the current order.' : 'Set the tax rate for the current order.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {type === 'discount' && (
            <ToggleGroup
              type="single"
              value={currentType}
              onValueChange={(val) => { if(val) setCurrentType(val); }}
              className="grid grid-cols-2"
            >
              <ToggleGroupItem value="percentage" aria-label="Percentage discount">
                Percentage (%)
              </ToggleGroupItem>
              <ToggleGroupItem value="fixed" aria-label="Fixed amount discount">
                Fixed ($)
              </ToggleGroupItem>
            </ToggleGroup>
          )}
          <div>
            <Label htmlFor="value-input">{type === 'discount' ? 'Discount Value' : 'Tax Rate (%)'}</Label>
            <Input
              id="value-input"
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={type === 'discount' ? (currentType === 'percentage' ? 'e.g., 10' : 'e.g., 5.00') : 'e.g., 7.5'}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleApply}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


const InfoItem = ({ label, value, className }) => (
  <div className="flex justify-between items-center py-2 border-b border-border/50">
    <p className="text-muted-foreground">{label}</p>
    <p className={`font-semibold ${className}`}>{value}</p>
  </div>
);

export default POSInterface;
  