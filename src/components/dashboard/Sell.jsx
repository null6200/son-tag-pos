 import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { api as fullApi } from '@/lib/api';
import { useRealtime } from '@/lib/useRealtime';
import { motion } from 'framer-motion';
import { ShoppingCart, List, PlusCircle, FileText, RotateCcw, Percent, Search, Calendar, User, MoreVertical, Eye, Printer, Trash2, Edit } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import OverridePinModal from '@/components/common/OverridePinModal';
import PrintView from '@/components/pos/PrintView';

// Helper to format numbers with commas (e.g., 1,000,000.00)
const formatAmount = (num) => {
  const n = Number(num);
  if (Number.isNaN(n)) return '0.00';
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const Sell = ({ setActiveTab, onSetDraftToLoad, user, onGoToPOS }) => {
  const [printData, setPrintData] = useState(null);
  const printRef = useRef();
  const [activeSection, setActiveSection] = useState('sales');
  const [filters, setFilters] = useState({
    branchId: user?.branchId || '',
    staff: '',
    userId: '',
    customer: '',
    customerId: '',
    paymentStatus: 'ALL',
    dateFrom: '',
    dateTo: '',
  });
  const [branches, setBranches] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (printData) {
      const timer = setTimeout(() => {
        window.print();
        setPrintData(null);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [printData]);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.branches?.list?.();
        const arr = Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : []);
        setBranches(arr);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const branchId = filters.branchId || user?.branchId || user?.branch?.id;
        if (!branchId) { setCustomers([]); setUsers([]); return; }
        try {
          const c = await api.customers?.list?.({ branchId, limit: 200 });
          const list = Array.isArray(c?.items) ? c.items : (Array.isArray(c) ? c : []);
          setCustomers(list);
        } catch { setCustomers([]); }
        try {
          const u = await api.users?.list?.({ branchId, limit: 200 });
          const listU = Array.isArray(u?.items) ? u.items : (Array.isArray(u) ? u : []);
          setUsers(listU);
        } catch { setUsers([]); }
      } catch {}
    })();
  }, [filters.branchId, user?.branchId, user?.branch?.id]);

  const handlePrint = (type, data) => {
    setPrintData({ type, data });
  };

  // Suspended handlers are defined inside DraftList below.

    return (
      <>
        <div className="space-y-6 print:hidden">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-3xl font-bold gradient-text mb-2">Sell Management</h2>
              <p className="text-muted-foreground">Browse POS sales, drafts, returns, and discounts.</p>
            </div>
            <Button onClick={() => (onGoToPOS ? onGoToPOS() : setActiveTab('pos'))} className="gap-2">
              <PlusCircle className="w-4 h-4" />
              Go to POS
            </Button>
          </div>

          <div className="grid grid-cols-[220px_1fr] gap-6">
            <div className="border rounded-md overflow-hidden bg-card">
              <div className="px-4 py-3 text-sm font-semibold border-b">Sell Menus</div>
              <div className="flex flex-col">
                {[
                  { key: 'sales', label: 'POS Sales' },
                  { key: 'drafts', label: 'Drafts' },
                  { key: 'suspended', label: 'Suspended Bills' },
                  { key: 'returns', label: 'Sell Returns' },
                  { key: 'discounts', label: 'Discounts' },
                ].map(item => (
                  <button
                    key={item.key}
                    onClick={() => setActiveSection(item.key)}
                    className={`text-left px-4 py-3 text-sm transition-colors ${
                      activeSection === item.key
                        ? 'bg-muted font-semibold'
                        : 'hover:bg-muted/60'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="border rounded-md p-3 bg-card">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                  <div className="flex flex-col">
                    <label className="text-xs text-muted-foreground mb-1">Business Location</label>
                    <select
                      className="h-9 rounded-md border bg-background px-2"
                      value={filters.branchId || ''}
                      onChange={(e) => setFilters(prev => ({ ...prev, branchId: e.target.value }))}
                    >
                      <option value="">All</option>
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name || b.id}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs text-muted-foreground mb-1">Customer</label>
                    <select
                      className="h-9 rounded-md border bg-background px-2"
                      value={filters.customerId || ''}
                      onChange={(e) => {
                        const id = e.target.value;
                        const name = customers.find(c => String(c.id) === id)?.name || '';
                        setFilters(prev => ({ ...prev, customerId: id, customer: name }));
                      }}
                    >
                      <option value="">All</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>{c.name || c.businessName || c.id}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs text-muted-foreground mb-1">User</label>
                    <select
                      className="h-9 rounded-md border bg-background px-2"
                      value={filters.userId || ''}
                      onChange={(e) => {
                        const id = e.target.value;
                        const name = users.find(u => String(u.id) === id)?.username || '';
                        setFilters(prev => ({ ...prev, userId: id, staff: name }));
                      }}
                    >
                      <option value="">All</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.username || u.firstName || u.surname || u.email || u.id}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs text-muted-foreground mb-1">Payment Status</label>
                    <select
                      className="h-9 rounded-md border bg-background px-2"
                      value={filters.paymentStatus}
                      onChange={(e) => setFilters(prev => ({ ...prev, paymentStatus: e.target.value }))}
                    >
                      <option value="ALL">All</option>
                      <option value="PAID">PAID</option>
                      <option value="PENDING">PENDING</option>
                      <option value="SUSPENDED">SUSPENDED</option>
                      <option value="REFUNDED">REFUNDED</option>
                    </select>
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs text-muted-foreground mb-1">Date From</label>
                    <input type="date" className="h-9 rounded-md border bg-background px-2" value={filters.dateFrom} onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))} />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs text-muted-foreground mb-1">Date To</label>
                    <input type="date" className="h-9 rounded-md border bg-background px-2" value={filters.dateTo} onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))} />
                  </div>
                </div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {activeSection === 'sales' && (
                  <SalesList onPrint={handlePrint} user={user} filters={filters} />
                )}
                {activeSection === 'drafts' && (
                  <DraftList setActiveTab={setActiveTab} onSetDraftToLoad={onSetDraftToLoad} user={user} mode="drafts" filters={filters} onPrint={handlePrint} />
                )}
                {activeSection === 'suspended' && (
                  <DraftList setActiveTab={setActiveTab} onSetDraftToLoad={onSetDraftToLoad} user={user} mode="suspended" filters={filters} onPrint={handlePrint} />
                )}
                {activeSection === 'returns' && (
                  <SellReturnList user={user} filters={filters} />
                )}
                {activeSection === 'discounts' && (
                  <DiscountList setActiveTab={setActiveTab} user={user} filters={filters} />
                )}
              </motion.div>
            </div>
          </div>
        </div>
        {printData && <PrintView ref={printRef} type={printData.type} data={printData.data} />}
      </>
    );
};

// Resolve the business currency symbol robustly
const getCurrencySymbol = () => {
  try {
    const info = JSON.parse(localStorage.getItem('businessInfo') || '{}');
    let sym = info?.currencySymbol || info?.currency || '₦';
    // Map common currency codes/names to symbols
    const s = String(sym).trim().toUpperCase();
    if (/^NGN$|NAIRA|NIGERIA/i.test(s)) return '₦';
    if (/^USD$|US\s*DOLLAR/i.test(s)) return '$';
    if (/^EUR$|EURO/i.test(s)) return '€';
    if (/^GBP$|POUND|STERLING/i.test(s)) return '£';
    // If it's already a symbol (1-2 chars), use it directly
    if (sym.length <= 2) return sym;
    // Extract symbol from format like "₦ (Nigerian Naira)"
    const match = String(sym).match(/^([^\s(]+)/);
    if (match && match[1]) return match[1];
    return '₦';
  } catch { return '₦'; }
};

// Lazy-load SheetJS for XLSX export
const loadXLSX = () => new Promise((resolve, reject) => {
  try {
    if (typeof window !== 'undefined' && window.XLSX) return resolve(window.XLSX);
    const src = 'https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js';
    const el = document.createElement('script');
    el.src = src;
    el.async = true;
    el.onload = () => resolve(window.XLSX);
    el.onerror = (e) => reject(e);
    document.head.appendChild(el);
  } catch (e) { reject(e); }
});

const exportXlsx = async (filename, rows) => {
  const XLSX = await loadXLSX();
  const ws = XLSX.utils.json_to_sheet(rows || []);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, filename);
};

const SalesList = ({ onPrint, user, filters }) => {
    const [sales, setSales] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSale, setSelectedSale] = useState(null);
    const [isDetailViewOpen, setIsDetailViewOpen] = useState(false);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(15);
    const [pendingReturn, setPendingReturn] = useState(null);
    const [colVis, setColVis] = useState({ invoice: true, date: true, cashier: true, total: true, status: true });

    const fetchSales = async () => {
        try {
            const branchId = filters?.branchId || user?.branchId;
            const res = await api.orders?.list?.(branchId ? { branchId, limit: 200 } : { limit: 200 });
            const list = Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : []);
            const normalized = list.map(s => {
                try {
                    const total = Number(s.total ?? s.totalAmount ?? 0);
                    const payments = Array.isArray(s.payments) ? s.payments : [];
                    const paid = payments.reduce((a, p) => a + Number(p.amount || 0), 0);
                    const currentStatus = String(s.status || '').toUpperCase();
                    const isTerminal = currentStatus === 'REFUNDED' || currentStatus === 'CANCELLED' || currentStatus === 'VOIDED';
                    if (!isTerminal && paid >= total && total > 0) return { ...s, status: 'PAID' };
                } catch {}
                return s;
            });
            setSales(normalized);
        } catch {
            setSales([]);
        }
    };
    useEffect(() => { fetchSales(); }, [user?.branchId, filters?.branchId]);
    useEffect(() => {
        const onChanged = () => { fetchSales(); };
        window.addEventListener('orders:changed', onChanged);
        window.addEventListener('orders:refunded', onChanged);
        return () => {
            window.removeEventListener('orders:changed', onChanged);
            window.removeEventListener('orders:refunded', onChanged);
        };
    }, []);

    // Real-time: auto-refresh when other cashiers create/update sales
    useRealtime(
        ['sale:created', 'sale:status_changed', 'sale:payment_added', 'sale:refunded'],
        () => { fetchSales(); },
        { skipActorId: user?.id }
    );

    const filteredSales = sales.filter(sale => {
        const q = searchTerm.toLowerCase();
        const matchesQuery = (sale.id?.toString().toLowerCase() || '').includes(q) || (sale.cashier?.toLowerCase() || '').includes(q) || (sale.userName?.toLowerCase() || '').includes(q);
        if (!matchesQuery) return false;
        // Payment status filter
        const total = Number(sale.total ?? sale.totalAmount ?? 0);
        const paid = (Array.isArray(sale.payments) ? sale.payments : []).reduce((a,p)=>a+Number(p.amount||0),0);
        const base = String(sale.status || '').toUpperCase();
        const flaggedRefund = sale?.refunded === true || Number(sale?.refundTotal || sale?.refundedAmount || 0) > 0 || base === 'REFUNDED';
        const computed = flaggedRefund ? 'REFUNDED' : (base === 'SUSPENDED' ? 'SUSPENDED' : (base === 'PENDING_PAYMENT' ? 'PENDING' : (paid >= total && total > 0 ? 'PAID' : 'PENDING')));
        const want = String(filters?.paymentStatus || 'ALL').toUpperCase();
        const statusOk = want === 'ALL' || computed === want;
        if (!statusOk) return false;
        // Date range
        const ts = new Date(sale.createdAt || sale.timestamp || sale.updatedAt || Date.now());
        if (filters?.dateFrom) {
          const from = new Date(filters.dateFrom);
          if (ts < from) return false;
        }
        if (filters?.dateTo) {
          const to = new Date(filters.dateTo);
          to.setHours(23,59,59,999);
          if (ts > to) return false;
        }
        // Staff and customer (best-effort)
        if (filters?.staff && !String(sale.cashier || sale.userName || sale.user?.username || '').toLowerCase().includes(String(filters.staff).toLowerCase())) return false;
        if (filters?.customer && !String(sale.customerName || sale.customer?.name || '').toLowerCase().includes(String(filters.customer).toLowerCase())) return false;
        if (filters?.userId && String(sale.userId || sale.user?.id || '') !== String(filters.userId)) return false;
        if (filters?.customerId && String(sale.customerId || sale.customer?.id || '') !== String(filters.customerId)) return false;
        return true;
    });
    const currencySymbol = getCurrencySymbol();
    const total = filteredSales.length;
    const start = total ? (page - 1) * pageSize + 1 : 0;
    const end = total ? Math.min(page * pageSize, total) : 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const pageItems = filteredSales.slice((page - 1) * pageSize, page * pageSize);
    useEffect(() => { setPage(1); }, [searchTerm, sales.length]);
    
    const handleViewDetails = async (sale) => {
        try {
            const full = await api.orders?.get?.(String(sale.id));
            // Prefer full backend order object so relations like table are intact
            const selected = full || sale;
            setSelectedSale(selected);
            setIsDetailViewOpen(true);
        } catch (e) {
            // Fallback to minimal object from list if full fetch fails
            setSelectedSale(sale);
            setIsDetailViewOpen(true);
            toast({ title: 'Could not load full order', description: String(e?.message || e), variant: 'destructive' });
        }
    };

    const handlePrintReceipt = async (sale) => {
        try {
            const full = await api.orders?.get?.(String(sale.id));
            onPrint('final-receipt', { ...(full || sale), isReceipt: true });
        } catch (e) {
            onPrint('final-receipt', { ...sale, isReceipt: true });
            toast({ title: 'Printing with limited data', description: 'Full order could not be loaded. Printed basic receipt.', variant: 'default' });
        }
    };

    const handleSellReturn = async (sale) => {
        try {
            // Ensure order exists (some lists may be partial)
            try { await api.orders?.get?.(String(sale.id)); } catch {}
            await api.orders?.refund?.(String(sale.id));
            toast({ title: 'Sell Return completed', description: `Sale #${sale.id} has been refunded.` });
            setSales(prev => prev.map(s => s.id === sale.id ? { ...s, status: 'REFUNDED' } : s));
            try {
                window.dispatchEvent(new CustomEvent('orders:refunded', { detail: { id: sale.id } }));
                window.dispatchEvent(new CustomEvent('orders:changed', { detail: { id: sale.id, action: 'refund' } }));
            } catch {}
        } catch (e) {
            toast({ title: 'Sell Return failed', description: String(e?.message || e), variant: 'destructive' });
        } finally {
            setPendingReturn(null);
        }
    };

    const exportCsv = (rows) => {
      const cols = ['Invoice','Date','Cashier','Total','Status'];
      const lines = [cols.join(',')];
      for (const s of rows) {
        const invRaw = s.displayInvoice || s.invoice_no || s.invoiceNo || s.receiptNo || (s.orderNumber != null ? `INV${String(s.orderNumber).padStart(3,'0')}` : (s.id && s.id.slice ? s.id.slice(0,8) : String(s.id)));
        const date = new Date(s.createdAt || s.timestamp || s.updatedAt || Date.now()).toLocaleString();
        const total = Number(s.total ?? s.totalAmount ?? 0).toFixed(2);
        const base = String(s.status || '').toUpperCase();
        const paid = (Array.isArray(s.payments) ? s.payments : []).reduce((a,p)=>a+Number(p.amount||0),0);
        const flaggedRefund = s?.refunded === true || Number(s?.refundTotal || s?.refundedAmount || 0) > 0 || base === 'REFUNDED';
        const status = flaggedRefund ? 'REFUNDED' : (base === 'SUSPENDED' ? 'SUSPENDED' : (base === 'PENDING_PAYMENT' ? 'PENDING' : (paid >= Number(s.total ?? s.totalAmount ?? 0) ? 'PAID' : base)));
        const row = [invRaw, date, (s.cashier || s.userName || ''), total, status].map(v => `"${String(v).replace(/"/g,'""')}"`).join(',');
        lines.push(row);
      }
      const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'sales.csv'; a.click(); URL.revokeObjectURL(url);
    };

    const printTable = (rows) => {
      const w = window.open('', 'print');
      if (!w) return;
      const rowsHtml = rows.map(s => `<tr><td>${s.id}</td><td>${new Date(s.createdAt||s.timestamp||s.updatedAt||Date.now()).toLocaleString()}</td><td>${s.cashier||s.userName||''}</td><td>${(Number(s.total??s.totalAmount??0)).toFixed(2)}</td><td>${String(s.status||'').toUpperCase()}</td></tr>`).join('');
      w.document.write(`<html><head><title>Sales</title></head><body><table border="1" cellspacing="0" cellpadding="4"><thead><tr><th>Invoice</th><th>Date</th><th>Cashier</th><th>Total</th><th>Status</th></tr></thead><tbody>${rowsHtml}</tbody></table></body></html>`);
      w.document.close(); w.focus(); w.print(); w.close();
    };

    const exportXlsxRows = (rows) => rows.map(s => {
      const invRaw = s.displayInvoice || s.invoice_no || s.invoiceNo || s.receiptNo || (s.orderNumber != null ? `INV${String(s.orderNumber).padStart(3,'0')}` : (s.id && s.id.slice ? s.id.slice(0,8) : String(s.id)));
      const date = new Date(s.createdAt || s.timestamp || s.updatedAt || Date.now()).toLocaleString();
      const total = Number(s.total ?? s.totalAmount ?? 0).toFixed(2);
      const base = String(s.status || '').toUpperCase();
      const paid = (Array.isArray(s.payments) ? s.payments : []).reduce((a,p)=>a+Number(p.amount||0),0);
      const flaggedRefund = s?.refunded === true || Number(s?.refundTotal || s?.refundedAmount || 0) > 0 || base === 'REFUNDED';
      const status = flaggedRefund ? 'REFUNDED' : (base === 'SUSPENDED' ? 'SUSPENDED' : (base === 'PENDING_PAYMENT' ? 'PENDING' : (paid >= Number(s.total ?? s.totalAmount ?? 0) ? 'PAID' : base)));
      const obj = {};
      if (colVis.invoice) obj.Invoice = invRaw;
      if (colVis.date) obj.Date = date;
      if (colVis.cashier) obj.Cashier = s.cashier || s.userName || '';
      if (colVis.total) obj.Total = total;
      if (colVis.status) obj.Status = status;
      return obj;
    });

    return (
        <>
            <Card className="glass-effect">
                <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2"><List className="w-6 h-6 text-primary" /> Sales List</CardTitle>
                        <CardDescription>A detailed list of sales.</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">Columns</Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuCheckboxItem checked={colVis.invoice} onCheckedChange={(v) => setColVis(prev => ({ ...prev, invoice: !!v }))}>Invoice</DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem checked={colVis.date} onCheckedChange={(v) => setColVis(prev => ({ ...prev, date: !!v }))}>Date</DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem checked={colVis.cashier} onCheckedChange={(v) => setColVis(prev => ({ ...prev, cashier: !!v }))}>Cashier</DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem checked={colVis.total} onCheckedChange={(v) => setColVis(prev => ({ ...prev, total: !!v }))}>Total</DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem checked={colVis.status} onCheckedChange={(v) => setColVis(prev => ({ ...prev, status: !!v }))}>Status</DropdownMenuCheckboxItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button variant="outline" size="sm" onClick={() => exportCsv(filteredSales)}>Export CSV</Button>
                        <Button variant="outline" size="sm" onClick={async () => exportXlsx('sales.xlsx', exportXlsxRows(filteredSales))}>Export XLSX</Button>
                        <Button variant="outline" size="sm" onClick={() => printTable(filteredSales)}>Print</Button>
                      </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="relative mb-4">
                        <Input 
                            placeholder="Search by Receipt ID or Cashier..." 
                            className="pl-10" 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    </div>
                    <div className="space-y-4 h-[36rem] overflow-y-auto pr-2">
                        {pageItems.length > 0 ? pageItems.map(sale => (
                            <div key={sale.id} className="p-4 rounded-lg border bg-background/50 flex justify-between items-center">
                                <div className="flex-1">
                                    {colVis.invoice && (() => {
                                      const raw = sale.displayInvoice || sale.invoice_no || sale.invoiceNo || sale.receiptNo || (sale.orderNumber ? String(sale.orderNumber) : null) || (sale.id && sale.id.slice ? sale.id.slice(0,8) : String(sale.id));
                                      const label = (() => {
                                        if (sale.orderNumber != null) return `INV${String(sale.orderNumber).padStart(3,'0')}`;
                                        const s = String(raw || '');
                                        if (/^inv/i.test(s)) return s; // already prefixed
                                        const numMatch = s.match(/^\d+$/);
                                        if (numMatch) return `INV${String(Number(s)).padStart(3,'0')}`;
                                        return s;
                                      })();
                                      return (<p className="font-bold text-primary">{label}</p>);
                                    })()}
                                    {colVis.cashier && (
                                      <p className="text-sm text-muted-foreground flex items-center gap-2"><User className="w-3 h-3" />{sale.cashier || sale.userName || sale.user?.username}</p>
                                    )}
                                    {colVis.date && (
                                      <p className="text-xs text-muted-foreground mt-1"><Calendar className="w-3 h-3 mr-1.5 inline" />{new Date(sale.createdAt || sale.timestamp || Date.now()).toLocaleString()}</p>
                                    )}
                                </div>
                                <div className="text-right mr-4">
                                    {colVis.total && (<p className="font-bold text-lg">{currencySymbol}{formatAmount(sale.total ?? sale.totalAmount ?? 0)}</p>)}
                                    {colVis.status && (() => {
                                      const status = String(sale.status || '').toUpperCase();
                                      if (status === 'REFUNDED' || status === 'CANCELLED' || sale.refunded === true || Number(sale.refundTotal || sale.refundedAmount || 0) > 0) {
                                        return <span className="px-2 py-1 text-xs rounded-full bg-red-200 text-red-800">Refunded</span>;
                                      }
                                      if (status === 'SUSPENDED' || status === 'PENDING_PAYMENT') {
                                        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-200 text-yellow-900">Pending Payment</span>;
                                      }
                                      return <span className="px-2 py-1 text-xs rounded-full bg-green-200 text-green-800">Completed</span>;
                                    })()}
                                </div>
                                <AlertDialog>
                                  <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="icon"><MoreVertical className="w-5 h-5"/></Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                          <DropdownMenuItem onClick={() => handleViewDetails(sale)}><Eye className="mr-2 h-4 w-4" />View Details</DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => handlePrintReceipt(sale)}><Printer className="mr-2 h-4 w-4" />Print Receipt</DropdownMenuItem>
                                          <DropdownMenuSeparator />
                                          <AlertDialogTrigger asChild>
                                              <DropdownMenuItem disabled={String(sale.status||'').toUpperCase()==='REFUNDED'} className="text-red-600 focus:text-red-600 disabled:opacity-50 disabled:pointer-events-none"><RotateCcw className="mr-2 h-4 w-4" />Sell Return</DropdownMenuItem>
                                          </AlertDialogTrigger>
                                      </DropdownMenuContent>
                                  </DropdownMenu>
                                  <AlertDialogContent>
                                      <AlertDialogHeader>
                                          <AlertDialogTitle>Confirm Sell Return</AlertDialogTitle>
                                          <AlertDialogDescription>
                                              This will process a return for sale #{sale.id}. Continue?
                                          </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction onClick={() => handleSellReturn(sale)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Confirm Return</AlertDialogAction>
                                      </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        )) : (
                            <p className="text-center text-muted-foreground py-8">No sales found.</p>
                        )}
                    </div>
                    <div className="flex items-center justify-between pt-2 text-sm">
                        <div>{start}<span className="px-1">–</span>{end} of {total} <span className="px-2 text-muted-foreground">•</span> {pageSize} per page</div>
                        <div className="space-x-2">
                            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>Previous</Button>
                            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
            <SaleDetailModal isOpen={isDetailViewOpen} onClose={() => setIsDetailViewOpen(false)} sale={selectedSale} onPrint={onPrint} />
        </>
    );
};

const SaleDetailModal = ({ isOpen, onClose, sale, onPrint }) => {
    if (!sale) return null;

    const [userNameMap, setUserNameMap] = useState({});
    const [currentShift, setCurrentShift] = useState(null);
    useEffect(() => {
      (async () => {
        try {
          const res = await api.users?.list?.({ branchId: sale?.branchId, includeArchived: true });
          const arr = Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : []);
          const map = {};
          for (const u of arr) {
            const id = String(u.id);
            const nm = u.username || [u.firstName, u.surname].filter(Boolean).join(' ') || u.email || id;
            map[id] = nm;
          }
          setUserNameMap(map);
        } catch {}
      })();
    }, [isOpen, sale?.branchId]);

    useEffect(() => {
      (async () => {
        try {
          if (!isOpen) { setCurrentShift(null); return; }
          const sh = await api.shifts?.current?.({ branchId: sale?.branchId, sectionId: sale?.sectionId });
          setCurrentShift(sh || null);
        } catch {
          setCurrentShift(null);
        }
      })();
    }, [isOpen, sale?.branchId, sale?.sectionId]);

    const createdAtSafe = sale.createdAt || sale.timestamp || sale.updatedAt || Date.now();
    const payments = Array.isArray(sale.payments) ? sale.payments : [];
    const primaryPayment = payments[0] || {};
    const sectionName = sale.section?.name || sale.section || sale.sectionName || sale.sectionId || '-';
    const cashier = (() => {
      const openerName = currentShift?.openedByUsername;
      const openerId = currentShift?.openedById || currentShift?.openedBy || currentShift?.userId;
      if (openerName && String(openerName).trim()) return openerName;
      if (openerId && userNameMap && userNameMap[String(openerId)]) return userNameMap[String(openerId)];
      return sale.cashier || sale.userName || sale.user?.username || '-';
    })();
    const currencySymbol = getCurrencySymbol();
    const invoiceLabel = (() => {
        const raw = sale.displayInvoice || sale.invoice_no || sale.invoiceNo || sale.receiptNo || (sale.orderNumber != null ? String(sale.orderNumber) : null) || (sale.id && sale.id.slice ? sale.id.slice(0,8) : String(sale.id));
        if (sale.orderNumber != null) return `INV${String(sale.orderNumber).padStart(3,'0')}`;
        const s = String(raw || '');
        if (/^inv/i.test(s)) return s;
        if (/^\d+$/.test(s)) return `INV${String(Number(s)).padStart(3,'0')}`;
        return s;
    })();

    const events = Array.isArray(sale.events)
      ? sale.events
      : Array.isArray(sale.saleEvents)
        ? sale.saleEvents
        : [];
    // Filter out noisy/duplicate events: show a clean timeline like the reference
    const filteredEvents = (events || []).filter((ev) => {
      const a = String(ev.action || '').toUpperCase();
      return !['CREATED_DRAFT','ORDER_CREATED','SALE_ADDED','DELETED_DRAFT'].includes(a);
    });
    // Remove STATUS_CHANGED events that immediately follow ADDED_PAYMENT (redundant "Edited" after "Payment")
    const visibleEvents = filteredEvents.filter((ev, idx, arr) => {
      const a = String(ev.action || '').toUpperCase();
      if (a === 'STATUS_CHANGED' && idx > 0) {
        const prevAction = String(arr[idx - 1]?.action || '').toUpperCase();
        if (prevAction === 'ADDED_PAYMENT') return false; // Skip this redundant STATUS_CHANGED
      }
      return true;
    }).reverse(); // Reverse to show most recent first

    // Precompute a previous-amount override for each event by scanning earlier events
    const toNum = (v) => {
      const n = Number(v);
      return Number.isNaN(n) ? null : n;
    };
    const getNewAmt = (ev) => {
      const m = (ev && ev.meta) || {};
      return toNum(m.newTotal != null ? m.newTotal : m.total);
    };
    const getPrevAmtMeta = (ev) => {
      const m = (ev && ev.meta) || {};
      return toNum(m.prevTotal);
    };

    const renderEvents = visibleEvents.map((ev, idx) => {
      const newAmt = getNewAmt(ev);
      let prevAmtOverride = getPrevAmtMeta(ev);
      if (prevAmtOverride == null || (newAmt != null && prevAmtOverride === newAmt)) {
        for (let j = idx - 1; j >= 0; j -= 1) {
          const pe = visibleEvents[j];
          const cand = getNewAmt(pe);
          if (cand != null && (newAmt == null || cand !== newAmt)) { prevAmtOverride = cand; break; }
        }
      }
      return { ev, prevAmtOverride };
    });

    const draftTotal = Array.isArray(sale.drafts) && sale.drafts.length > 0 && sale.drafts[0]?.total != null
      ? Number(sale.drafts[0].total)
      : null;

    const formatEventActor = (ev) => {
      const meta = ev.meta || {};
      const idName = (id) => {
        const k = id != null ? String(id) : '';
        return k && userNameMap[k] ? userNameMap[k] : null;
      };
      const byName = ev.userName
        || ev.user?.username
        || ev.user?.name
        || meta.actorUserName;
      const byIdName = idName(ev.userId)
        || idName(ev.user?.id)
        || idName(ev.userID)
        || idName(ev.actorUserId)
        || idName(meta.actorUserId)
        || idName(meta.userId)
        || idName(meta.modifiedBy)
        || idName(meta.modifiedByUserId);
      return byName || byIdName || cashier || sale?.waiter || sale?.user?.username || '-';
    };

    // Format the authorizer (supervisor who approved override actions)
    const formatEventAuthorizer = (ev) => {
      const meta = ev.meta || {};
      const action = String(ev.action || '').toLowerCase();
      // Only show authorizer for override actions
      if (!action.startsWith('override:')) return '-';
      // Try to get authorizer name from meta
      const authName = meta.authorizerName;
      if (authName) return authName;
      // Fallback to looking up authorizerId in userNameMap
      const authId = meta.authorizerId;
      if (authId && userNameMap[String(authId)]) return userNameMap[String(authId)];
      if (authId) return `ID: ${String(authId).slice(0, 8)}...`;
      return '-';
    };

    const formatEventWhen = (ev) => {
      const ts = ev.createdAt || ev.timestamp || ev.updatedAt;
      try { return ts ? new Date(ts).toLocaleString() : ''; } catch { return ''; }
    };

    const formatEventStatus = (ev, prevEv = null, prevAmtOverride = null) => {
      const meta = ev.meta || {};
      const rawAction = String(ev.action || '').toUpperCase();

      const prettifyStatus = (s) => {
        const up = String(s || '').toUpperCase();
        if (!up) return '';
        if (up === 'ACTIVE') return 'DRAFT';
        if (up === 'PENDING_PAYMENT') return 'PENDING';
        return up;
      };

      const baseStatusFrom = prettifyStatus(ev.prevStatus);
      const baseStatusTo = prettifyStatus(ev.newStatus);

      const metaPrevTotal = meta.prevTotal != null ? Number(meta.prevTotal) : null;
      const metaNewTotal = meta.newTotal != null ? Number(meta.newTotal) : null;

      const formatLabel = (status, amount) => {
        const s = prettifyStatus(status);
        const hasAmount = amount != null && !Number.isNaN(amount);
        if (!s && !hasAmount) return '';
        if (!hasAmount) return s;
        return `${s} (${currencySymbol}${formatAmount(amount)})`;
      };

      // Special cases with succinct notes first
      if (rawAction === 'ADDED_PAYMENT') {
        const m = (meta.method || '').toString().toUpperCase();
        const amt = Number(meta.amount || 0);
        const paid = Number(meta.paid || 0);
        const total = Number(meta.total || 0);
        const parts = [];
        if (!Number.isNaN(amt) && amt > 0) parts.push(`Amount: ${currencySymbol}${formatAmount(amt)}`);
        const line1 = parts.join(' | ');
        // Also show status transition if present (statuses only)
        const statusChange = (ev.prevStatus || ev.newStatus) ? (() => {
          const left = baseStatusFrom || '';
          const right = baseStatusTo || '';
          if (left && right) return `${left} --> ${right}`;
          return right || left || '';
        })() : '';
        return [line1, statusChange].filter(Boolean).join('\n');
      }

      if (rawAction === 'OVERRIDE_SUSPEND') {
        const actor = meta.actorUserName || meta.actorUserId || '';
        const who = actor ? `Actor: ${actor}` : '';
        const status = baseStatusTo || baseStatusFrom || (meta.status ? String(meta.status).toUpperCase() : 'SUSPENDED');
        const line = formatLabel(status, metaNewTotal ?? metaPrevTotal);
        return [line, who].filter(Boolean).join('\n');
      }

      // Override actions (decrement, void, delete_draft)
      if (rawAction.startsWith('OVERRIDE:')) {
        const itemName = meta.itemName || '';
        // Use deltaQty if available, fallback to itemQty for older events, default to 1 for decrement
        const actionType = meta.actionType || rawAction.replace('OVERRIDE:', '').toLowerCase();
        const qty = meta.deltaQty ?? meta.itemQty ?? (actionType === 'decrement' ? 1 : null);
        if (itemName) {
          // Show as "-1 Item Name" for cleaner display
          const prefix = qty != null ? `-${qty} ` : '';
          return `${prefix}${itemName}`;
        }
        return '-';
      }

      // First creation row: show a single label with status and amount
      if (rawAction === 'CREATED_ORDER') {
        const status = baseStatusTo || baseStatusFrom || prettifyStatus(meta.status || 'DRAFT');
        const amountSource = metaNewTotal != null
          ? metaNewTotal
          : metaPrevTotal != null
            ? metaPrevTotal
            : draftTotal != null
              ? draftTotal
              : Number(sale.total ?? sale.totalAmount ?? 0);
        const main = formatLabel(status, amountSource);
        if (!main) return '';
        return main;
      }

      // Edited row (STATUS_CHANGED): show amounts arrow, then status arrow
      if (rawAction === 'STATUS_CHANGED') {
        const fallbackTotal = Number(sale.total ?? sale.totalAmount ?? (draftTotal != null ? draftTotal : 0));
        const prevFromPrevEvent = (() => {
          if (!prevEv) return null;
          const pm = prevEv.meta || {};
          return pm.newTotal != null ? Number(pm.newTotal) : (pm.prevTotal != null ? Number(pm.prevTotal) : null);
        })();
        const sameAsNew = (metaPrevTotal != null && metaNewTotal != null && Number(metaPrevTotal) === Number(metaNewTotal));
        const prevAmtRaw = (metaPrevTotal != null && !sameAsNew)
          ? Number(metaPrevTotal)
          : (prevAmtOverride != null ? Number(prevAmtOverride)
             : (prevFromPrevEvent != null ? prevFromPrevEvent : (draftTotal != null ? Number(draftTotal) : fallbackTotal)));
        const newAmtRaw = metaNewTotal != null
          ? Number(metaNewTotal)
          : fallbackTotal;
        const prevAmt = !Number.isNaN(prevAmtRaw) ? prevAmtRaw : 0;
        const newAmt = !Number.isNaN(newAmtRaw) ? newAmtRaw : 0;
        const amountLeft = `${currencySymbol}${formatAmount(prevAmt)}`;
        const amountRight = `${currencySymbol}${formatAmount(newAmt)}`;
        const amountLine = [amountLeft, amountRight].filter(Boolean).join(' --> ');
        const statusLeftRaw = ev.prevStatus || (prevEv ? (prevEv.newStatus || prevEv.prevStatus || prevEv?.meta?.status) : (meta.status || 'DRAFT'));
        const statusRightRaw = ev.newStatus || statusLeftRaw;
        const statusLeft = prettifyStatus(statusLeftRaw) || 'DRAFT';
        const statusRight = prettifyStatus(statusRightRaw) || statusLeft;
        const statusLine = [statusLeft, statusRight].filter(Boolean).join(' --> ');
        return [amountLine, statusLine].filter(Boolean).join('\n');
      }

      // Also show a simple Edited row for UPDATED_DRAFT (cart/field details suppressed)
      if (rawAction === 'UPDATED_DRAFT') {
        const fallbackTotal = Number(sale.total ?? sale.totalAmount ?? (draftTotal != null ? draftTotal : 0));
        const prevFromPrevEvent = (() => {
          if (!prevEv) return null;
          const pm = prevEv.meta || {};
          return pm.newTotal != null ? Number(pm.newTotal) : (pm.prevTotal != null ? Number(pm.prevTotal) : null);
        })();
        const sameAsNew = (metaPrevTotal != null && metaNewTotal != null && Number(metaPrevTotal) === Number(metaNewTotal));
        const prevAmtRaw = (metaPrevTotal != null && !sameAsNew)
          ? Number(metaPrevTotal)
          : (prevAmtOverride != null ? Number(prevAmtOverride)
             : (prevFromPrevEvent != null ? prevFromPrevEvent : (draftTotal != null ? Number(draftTotal) : fallbackTotal)));
        const newAmtRaw = metaNewTotal != null
          ? Number(metaNewTotal)
          : fallbackTotal;
        const prevAmt = !Number.isNaN(prevAmtRaw) ? prevAmtRaw : 0;
        const newAmt = !Number.isNaN(newAmtRaw) ? newAmtRaw : 0;
        const amountLeft = `${currencySymbol}${formatAmount(prevAmt)}`;
        const amountRight = `${currencySymbol}${formatAmount(newAmt)}`;
        const amountLine = [amountLeft, amountRight].filter(Boolean).join(' --> ');
        const statusLeft = prettifyStatus(baseStatusFrom) || prettifyStatus(meta.status || 'DRAFT') || 'DRAFT';
        const statusRight = prettifyStatus(baseStatusTo) || statusLeft;
        const statusLine = [statusLeft, statusRight].filter(Boolean).join(' --> ');
        return [amountLine, statusLine].filter(Boolean).join('\n');
      }

      // Fallback: concise labels with amounts
      const fromLabel = formatLabel(baseStatusFrom, metaPrevTotal);
      const toLabel = formatLabel(baseStatusTo, metaNewTotal);
      if (!fromLabel && !toLabel) return '';
      if (!fromLabel && toLabel) return `${toLabel}`;
      if (fromLabel && !toLabel) return `${fromLabel}`;
      return `${fromLabel} --> ${toLabel}`;
    };

    const formatEventAction = (ev) => {
      const action = String(ev.action || '').toUpperCase();
      if (action === 'CREATED_ORDER') return 'Created';
      if (action === 'UPDATED_DRAFT' || action === 'STATUS_CHANGED') return 'Edited';
      if (action === 'ADDED_PAYMENT') return 'Payment';
      if (action === 'OVERRIDE_SUSPEND') return 'Suspended';
      if (action === 'REFUNDED_ORDER' || action === 'REFUND_ITEMS') return 'Refunded';
      // Override actions
      if (action === 'OVERRIDE:DECREMENT') return 'Qty Decreased';
      if (action === 'OVERRIDE:VOID') return 'Item Voided';
      if (action === 'OVERRIDE:DELETE_DRAFT') return 'Draft Deleted';
      if (action.startsWith('OVERRIDE:')) return action.replace('OVERRIDE:', '').replace(/_/g, ' ');
      return action || '';
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-3xl w-full">
                <DialogHeader>
                    <DialogTitle>Sale Details - #{invoiceLabel}</DialogTitle>
                    <DialogDescription>{new Date(createdAtSafe).toLocaleString()}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2 text-sm max-h-[60vh] overflow-y-auto">
                    <InfoItem label="Cashier" value={cashier} />
                    <InfoItem label="Waiter" value={sale.waiter} />
                    {(() => {
                      const branchLabel = sale.branch?.name
                        || sale.branchName
                        || (typeof sale.branch === 'string' && sale.branch ? sale.branch : null)
                        || sale.branchId
                        || '-';
                      return <InfoItem label="Branch" value={branchLabel} />;
                    })()}
                    <InfoItem label="Section" value={sectionName} />
                    <InfoItem label="Service Type" value={sale.serviceType} />
                    {(() => {
                      const tableLabel = sale.table?.name
                        || sale.tableName
                        || (typeof sale.table === 'string' && sale.table ? sale.table : null)
                        || (sale.tableId ? 'Table' : '-');
                      return <InfoItem label="Table" value={tableLabel} />;
                    })()}

                    <h3 className="font-bold pt-4 border-t mt-4">Items ({(sale.items || []).length})</h3>
                    <div className="space-y-2">
                        {(sale.items || []).map(item => {
                          const nm = item?.product?.name || item?.name || item?.title || item?.sku || item?.id || 'Item';
                          return (
                            <div key={item.id ?? `${nm}-${item.qty}` } className="flex justify-between items-center">
                              <span>{nm} x {item.qty}</span>
                              <span className="font-mono">{currencySymbol}{formatAmount(Number(item.price) * Number(item.qty || 0))}</span>
                            </div>
                          );
                        })}
                    </div>

                    <h3 className="font-bold pt-4 border-t mt-4">Totals</h3>
                    <InfoItem label="Subtotal" value={`${currencySymbol}${formatAmount(sale.subtotal ?? 0)}`} />
                    {sale.taxRate != null && !Number.isNaN(Number(sale.taxRate)) && (
                      <InfoItem label="Tax Rate" value={`${Number(sale.taxRate).toFixed(2)}%`} />
                    )}
                    <InfoItem label="Tax" value={`${currencySymbol}${formatAmount(sale.tax ?? 0)}`} />
                    {Number(sale.discount ?? 0) > 0 && <InfoItem label="Discount" value={`-${currencySymbol}${formatAmount(sale.discount ?? 0)}`} className="text-destructive" />}
                    <InfoItem label="Total Amount" value={`${currencySymbol}${formatAmount(sale.total ?? sale.totalAmount ?? 0)}`} className="font-extrabold text-base"/>

                    <h3 className="font-bold pt-4 border-t mt-4">Payment</h3>
                    <InfoItem label="Method" value={(primaryPayment.method || sale.paymentDetails?.method || '').toString().toUpperCase()} />
                    {primaryPayment && primaryPayment.method === 'cash' && (
                        <>
                            <InfoItem label="Cash Received" value={`${currencySymbol}${formatAmount(primaryPayment.amount ?? sale.paymentDetails?.received ?? 0)}`} />
                            <InfoItem label="Change" value={`${currencySymbol}${formatAmount(Math.max(0, Number(primaryPayment.amount ?? sale.paymentDetails?.received ?? 0) - Number(sale.total ?? sale.totalAmount ?? 0)))}`} />
                        </>
                    )}
                    {Array.isArray(payments) && payments.length > 1 && (
                        <>
                          {payments.slice(1).map((p, idx) => (
                            <InfoItem key={idx} label={`+ ${p.method}`} value={`${currencySymbol}${formatAmount(p.amount||0)}`} />
                          ))}
                        </>
                    )}

                    <h3 className="font-bold pt-4 border-t mt-4">Activities</h3>
                    {Array.isArray(events) && events.length > 0 ? (
                      <>
                        <div className="border rounded-md overflow-hidden text-sm">
                          <div className="grid grid-cols-[1.6fr_1fr_1.3fr_1.3fr_2fr] gap-3 px-4 py-3 bg-muted font-semibold text-sm">
                            <span>Date</span>
                            <span>Action</span>
                            <span>By</span>
                            <span>Authorized By</span>
                            <span>Notes</span>
                          </div>
                          <div className="divide-y max-h-64 overflow-y-auto">
                            {renderEvents.map(({ ev, prevAmtOverride }, idx) => {
                              const prevCandidate = (() => {
                                for (let j = idx - 1; j >= 0; j -= 1) {
                                  const pe = renderEvents[j]?.ev;
                                  const pm = (pe && pe.meta) || {};
                                  const hasTotal = pm.newTotal != null || pm.prevTotal != null || pm.total != null;
                                  if (hasTotal) return pe;
                                }
                                return idx > 0 ? renderEvents[idx - 1]?.ev : null;
                              })();
                              // Derive a previous amount from history that is different from current new amount
                              const currentNew = (() => {
                                const m = (ev && ev.meta) || {};
                                if (m.newTotal != null) return Number(m.newTotal);
                                if (m.total != null) return Number(m.total);
                                return NaN;
                              })();
                              const derivedPrevAmount = (() => {
                                if (!Number.isNaN(currentNew)) {
                                  for (let j = idx - 1; j >= 0; j -= 1) {
                                    const pe = renderEvents[j]?.ev;
                                    const pm = (pe && pe.meta) || {};
                                    const candidates = [pm.newTotal, pm.prevTotal, pm.total];
                                    for (const c of candidates) {
                                      if (c == null) continue;
                                      const n = Number(c);
                                      if (!Number.isNaN(n) && n !== currentNew) return n;
                                    }
                                  }
                                }
                                return null;
                              })();
                              const prevForFormat = (() => {
                                if (derivedPrevAmount != null) {
                                  const base = prevCandidate || { meta: {} };
                                  return { ...base, meta: { ...(base.meta || {}), newTotal: derivedPrevAmount } };
                                }
                                return prevCandidate;
                              })();
                              return (
                                <div key={ev.id} className="grid grid-cols-[1.6fr_1fr_1.3fr_1.3fr_2fr] gap-3 px-4 py-3 items-start text-sm">
                                  <span className="break-words whitespace-pre-wrap">{formatEventWhen(ev)}</span>
                                  <span className="break-words whitespace-pre-wrap">{formatEventAction(ev)}</span>
                                  <span className="break-words whitespace-pre-wrap">{formatEventActor(ev)}</span>
                                  <span className="break-words whitespace-pre-wrap">{formatEventAuthorizer(ev)}</span>
                                  <span className="break-words whitespace-pre-wrap">{formatEventStatus(ev, prevForFormat, prevAmtOverride)}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    ) : (
                      <p className="text-muted-foreground text-sm py-2">No activity logs recorded for this sale.</p>
                    )}
                </div>
                <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={onClose}>Close</Button>
                    <Button onClick={() => onPrint('final-receipt', { ...sale, isReceipt: true })}><Printer className="mr-2 h-4 w-4"/>Print</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

const InfoItem = ({ label, value, className }) => (
  <div className="flex justify-between items-center">
    <p className="text-muted-foreground">{label}</p>
    <p className={`font-semibold ${className}`}>{value || '-'}</p>
  </div>
);


const DraftList = ({ setActiveTab, onSetDraftToLoad, user, mode = 'drafts', filters = {}, onPrint }) => {
  const [drafts, setDrafts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [viewOrder, setViewOrder] = useState(null); // { order, draft }
  const [returnOrder, setReturnOrder] = useState(null); // { orderId, draft, order }
  const [returnSelection, setReturnSelection] = useState({}); // productId -> qty
  const [viewSavedSale, setViewSavedSale] = useState(null);
  const [colVis, setColVis] = useState({ name: true, items: true, service: true, total: true, updated: true });

  const [isOverrideOpen, setOverrideOpen] = useState(false);
  const [pendingOverrideRefund, setPendingOverrideRefund] = useState(null); // { type: 'full'|'partial', orderId, items? }
  const [pendingOverrideDelete, setPendingOverrideDelete] = useState(null); // { draftId }
  const [overrideUsers, setOverrideUsers] = useState([]);

  const fetchDrafts = async () => {
    setIsLoading(true);
    try {
      let branchId = (filters?.branchId || user?.branchId || user?.branch?.id);
      if (!branchId && api?.users?.getRuntime) {
        try { const rt = await api.users.getRuntime(); branchId = rt?.lastShiftBranch || rt?.branchId || branchId; } catch {}
      }
      if (!branchId && api.me) {
        try { const me = await api.me(); branchId = me?.branchId || me?.branch?.id || branchId; } catch {}
      }
      if (!branchId && api?.branches?.list) {
        try {
          const list = await api.branches.list();
          const arr = Array.isArray(list) ? list : (Array.isArray(list?.items) ? list.items : []);
          branchId = arr[0]?.id || branchId;
        } catch {}
      }
      if (!branchId) {
        setDrafts([]);
        return;
      }
      const res = await api.drafts?.list?.({ branchId });
      const items = Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : []);
      setDrafts(items);
    } catch {
      setDrafts([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchDrafts(); }, [user?.branchId, user?.branch?.id]);
  // Background retry for first few seconds if list is empty and branch not yet resolved
  useEffect(() => {
    if (drafts.length > 0) return;
    let attempts = 0;
    const id = setInterval(() => {
      attempts += 1;
      if (attempts > 6) { clearInterval(id); return; }
      fetchDrafts();
    }, 3000);
    return () => clearInterval(id);
  }, [drafts.length]);

  // Real-time: auto-refresh when other cashiers create/update/delete drafts
  useRealtime(
    ['draft:created', 'draft:updated', 'draft:deleted'],
    () => { fetchDrafts(); },
    { skipActorId: user?.id }
  );

  // Load override-capable users (manager/supervisor/admin/accountant) for refund overrides
  useEffect(() => {
    (async () => {
      try {
        let branchId = user?.branchId || user?.branch?.id;
        if (!branchId && api?.users?.getRuntime) {
          try { const rt = await api.users.getRuntime(); branchId = rt?.lastShiftBranch || rt?.branchId || branchId; } catch {}
        }
        if (!branchId) { setOverrideUsers([]); return; }

        const list = await api.users.list({ branchId });
        const rows = Array.isArray(list) ? list : [];
        const overrideCandidates = rows.filter(u => {
          const roleName = (u.appRole && u.appRole.name) || u.role || '';
          const r = String(roleName).toLowerCase();
          return r.includes('manager') || r.includes('supervisor') || r.includes('admin') || r.includes('accountant');
        });
        setOverrideUsers(overrideCandidates.map(u => ({
          id: u.id,
          name: u.username || u.firstName || u.surname || u.email || `user-${u.id}`,
        })));
      } catch {
        setOverrideUsers([]);
      }
    })();
  }, [user?.branchId, user?.branch?.id]);

  const handleDeleteDraft = async (draft) => {
    try {
      const isSusp = !!(draft?.isSuspended || String(draft?.status || '').toUpperCase() === 'SUSPENDED');
      if (isSusp) {
        // Require per-user override PIN for suspended (credit) sales deletion
        setPendingOverrideDelete({ draftId: draft.id });
        setOverrideOpen(true);
        return;
      }
      await api.drafts?.remove?.(String(draft?.id || ''));
      // Optionally, if backend expects a table unlock:
      // await api.tables.unlock?.({ draftId });
      setDrafts(prev => prev.filter(d => d.id !== (draft?.id || draft)));
      toast({ title: "Draft Deleted", description: "The saved order has been removed." });
    } catch (e) {
      toast({ title: 'Delete failed', description: String(e?.message || e), variant: 'destructive' });
    }
  };

  const handleLoadDraft = async (draft) => {
    try {
      let data = draft;
      if (!draft?.cart && api.drafts?.get) {
        data = await api.drafts.get(draft.id);
      }
      onSetDraftToLoad(data);
      setActiveTab('pos');
      toast({ title: "Draft Loaded", description: `Draft "${data.name || draft.name}" is ready in the POS.` });
    } catch (e) {
      toast({ title: 'Load failed', description: String(e?.message || e), variant: 'destructive' });
    }
  };

  const handleViewSavedDraft = async (draft) => {
    try {
      // Open immediately with a lightweight snapshot
      const makeSale = (src) => {
        const items = Array.isArray(src?.cart) ? src.cart.map(ci => {
          const pname = ci?.product?.name || ci?.productName || ci?.name || ci?.title || ci?.sku || ci?.productId || ci?.id;
          return {
            id: ci?.id || ci?.productId || pname,
            name: pname,
            product: { name: pname },
            qty: Number(ci?.qty || ci?.quantity || 0),
            price: Number(ci?.price || ci?.unitPrice || 0),
          };
        }) : [];
        const waiter = src?.waiterName || src?.waiter || src?.serviceStaffName || src?.staffName || '';
        const sectionObj = src?.section?.name ? src.section : (src?.sectionName ? { name: src.sectionName } : (src?.section ? { name: src.section } : undefined));
        const branchObj = src?.branch?.name ? src.branch : (src?.branchName ? { id: src?.branchId, name: src.branchName } : (user?.branch ? { id: user?.branch?.id || user?.branchId, name: user?.branch?.name || user?.branchName } : (filters?.branchId ? { id: filters.branchId, name: undefined } : undefined)));
        const taxRateVal = (typeof src?.taxRate === 'number' && !Number.isNaN(src?.taxRate))
          ? Number(src.taxRate)
          : (() => {
              const sub = Number(src?.subtotal || 0);
              const tax = Number(src?.tax || 0);
              return sub > 0 ? (tax / sub) * 100 : null;
            })();
        return {
          id: src?.id,
          orderNumber: src?.orderNumber ?? null,
          createdAt: src?.updatedAt || src?.createdAt || Date.now(),
          cashier: user?.username || user?.email || 'User',
          section: sectionObj,
          table: src?.table ? { name: src.table?.name || src.table } : undefined,
          serviceType: src?.serviceType || src?.service,
          waiter,
          branch: branchObj,
          branchId: src?.branchId || branchObj?.id || filters?.branchId || user?.branchId || user?.branch?.id,
          sectionId: src?.sectionId,
          items,
          subtotal: Number(src?.subtotal || 0),
          discount: Number(src?.discount || 0),
          tax: Number(src?.tax || 0),
          total: Number(src?.total || 0),
          taxRate: taxRateVal != null ? Number(taxRateVal) : undefined,
          status: 'DRAFT',
          payments: [],
          saleEvents: [],
          events: [],
        };
      };
      setViewSavedSale(makeSale(draft));
      // Fetch full draft details when needed and enrich with context (branch/section) and events
      const full = (!draft?.cart && api.drafts?.get) ? await api.drafts.get(draft.id) : draft;
      let sale = makeSale(full);
      // If draft is linked to an order, fetch it to enrich details (events, waiter, branch/section)
      let order = null;
      try {
        if (full?.orderId && api.orders?.get) {
          order = await api.orders.get(String(full.orderId));
        }
      } catch {}

      // Derive branch and section details (prefer order values if present)
      try {
        let branchId = order?.branchId || full?.branchId || sale?.branchId || filters?.branchId || user?.branchId || user?.branch?.id || sale?.branch?.id;
        let branchName = full?.branch?.name || full?.branchName || sale?.branch?.name || null;
        if (!branchName && branchId && api.branches?.list) {
          const bl = await api.branches.list();
          const arr = Array.isArray(bl?.items) ? bl.items : (Array.isArray(bl) ? bl : []);
          const found = arr.find(b => String(b.id) === String(branchId));
          if (found) branchName = found.name || String(branchId);
        }
        if (branchId || branchName) {
          sale = { ...sale, branchId: branchId || sale.branchId, branchName: branchName || sale.branchName, branch: { id: branchId || sale.branchId, name: branchName || sale.branch?.name } };
        }

        let sectionName = sale?.section?.name || sale?.sectionName || full?.sectionName || (typeof full?.section === 'string' ? full.section : null) || null;
        const sectionId = order?.sectionId || full?.sectionId || sale?.sectionId || null;
        if (!sectionName && sectionId && api.sections?.list) {
          const sl = await api.sections.list({ branchId: sale?.branchId || branchId });
          const rows = Array.isArray(sl?.items) ? sl.items : (Array.isArray(sl) ? sl : []);
          const found = rows.find(s => String(s.id) === String(sectionId));
          if (found) sectionName = found.name || String(sectionId);
        }
        if (sectionName || sectionId) {
          sale = { ...sale, sectionId: sectionId || sale.sectionId, sectionName: sectionName || sale.sectionName, section: sectionName ? { name: sectionName } : sale.section };
        }
      } catch {}

      // Enrich Waiter: strictly resolve from waiter fields or waiterId; do NOT fall back to cashier
      try {
        let w = sale?.waiter || full?.waiterName || full?.waiter || order?.waiterName || order?.waiter?.username || order?.waiter?.name || null;
        const waiterId = order?.waiterId || full?.waiterId || sale?.waiterId;
        if (!w && waiterId && api.users?.list) {
          try {
            const ul = await api.users.list({ branchId: sale?.branchId });
            const arr = Array.isArray(ul?.items) ? ul.items : (Array.isArray(ul) ? ul : []);
            const found = arr.find(u => String(u.id) === String(waiterId));
            if (found) w = found.username || found.firstName || found.surname || found.email || String(waiterId);
          } catch {}
        }
        if (w) sale = { ...sale, waiter: w };
      } catch {}

      // Activity logs: prefer server-provided events (from order) for accurate initial amounts
      try {
        const events = order && (Array.isArray(order?.saleEvents) ? order.saleEvents : (Array.isArray(order?.events) ? order.events : null))
          || (Array.isArray(full?.events) ? full.events : (Array.isArray(full?.saleEvents) ? full.saleEvents : null));
        if (events && events.length) {
          sale = { ...sale, saleEvents: events, events };
        } else {
          const createdTs = sale.createdAt || full?.createdAt || Date.now();
          const updatedTs = full?.updatedAt && full.updatedAt !== full.createdAt ? full.updatedAt : null;
          const base = [
            { id: `ev-${sale.id}-c`, action: 'CREATED_ORDER', meta: { status: 'DRAFT', newTotal: Number(sale.total || 0) }, createdAt: createdTs, userName: sale.cashier },
          ];
          if (updatedTs) base.push({ id: `ev-${sale.id}-u`, action: 'UPDATED_DRAFT', meta: { newTotal: Number(sale.total || 0) }, createdAt: updatedTs, userName: sale.cashier });
          sale = { ...sale, saleEvents: base, events: base };
        }
      } catch {}

      setViewSavedSale(sale);
    } catch (e) {
      toast({ title: 'View failed', description: String(e?.message || e), variant: 'destructive' });
    }
  };

  // New: settle, view and return handlers for Suspended bills (local to this component)
  const handleSettleSuspended = async (draft, method) => {
    try {
      const orderId = draft?.orderId;
      if (!orderId) { toast({ title: 'No order linked', description: 'This suspended bill has no orderId.', variant: 'destructive' }); return; }
      await api.orders.addPayment(String(orderId), { method: String(method || 'cash'), amount: String(draft.total || 0) });
      await api.orders.updateStatus(String(orderId), { status: 'PAID' });
      setDrafts(prev => prev.filter(d => d.id !== draft.id));
      try { await api.drafts.remove(String(draft.id)); } catch {}
      toast({ title: 'Suspended bill settled', description: `${draft.name} marked as PAID.` });
      await fetchDrafts();
      try { window.dispatchEvent(new CustomEvent('orders:changed', { detail: { id: orderId, action: 'paid' } })); } catch {}
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

  const openReturnModal = async (draft) => {
    try {
      if (!draft?.orderId) { toast({ title: 'Order not linked', description: 'No orderId on this draft.' }); return; }
      const order = await api.orders.get(String(draft.orderId));
      const sel = {};
      for (const it of (order?.items || [])) {
        const pid = it.productId || it.product?.id || it.id;
        const qty = Number(it.qty || 0);
        if (pid) sel[pid] = qty;
      }
      setReturnSelection(sel);
      setReturnOrder({ orderId: draft.orderId, draft, order });
    } catch (e) {
      toast({ title: 'Load order failed', description: String(e?.message || e), variant: 'destructive' });
    }
  };

  const handleReturnAll = () => {
    const ctx = returnOrder;
    if (!ctx?.orderId) { setReturnOrder(null); return; }
    setPendingOverrideRefund({ type: 'full', orderId: ctx.orderId });
    setOverrideOpen(true);
  };

  const handleReturnSelected = async () => {
    const ctx = returnOrder;
    if (!ctx?.orderId || !ctx?.order) { setReturnOrder(null); return; }

    const items = (ctx.order.items || []).map(it => {
      const pid = it.productId || it.product?.id || it.id;
      const max = Number(it.qty || 0);
      const qty = Math.max(0, Math.min(max, Number(returnSelection?.[pid] || 0)));
      return pid && qty > 0 ? { productId: pid, qty } : null;
    }).filter(Boolean);
    if (!items.length) {
      toast({ title: 'Nothing selected', description: 'Choose at least one item to return.' });
      return;
    }
    setPendingOverrideRefund({ type: 'partial', orderId: ctx.orderId, items });
    setOverrideOpen(true);
  };

  const handleOverrideConfirm = async ({ userId: overrideOwnerId, pin }) => {
    const ctx = pendingOverrideRefund;
    // If deleting a suspended draft, perform that flow first
    if (pendingOverrideDelete && pendingOverrideDelete.draftId && overrideOwnerId && pin) {
      try {
        await api.drafts.remove(String(pendingOverrideDelete.draftId), { overrideOwnerId, overridePin: pin });
        setDrafts(prev => prev.filter(d => d.id !== pendingOverrideDelete.draftId));
        toast({ title: 'Suspended bill deleted', description: 'Draft removed with supervisor authorization.' });
      } catch (e) {
        toast({ title: 'Delete failed', description: String(e?.message || e), variant: 'destructive' });
      } finally {
        setOverrideOpen(false);
        setPendingOverrideDelete(null);
        setPendingOverrideRefund(null);
      }
      return;
    }
    if (!ctx || !ctx.orderId || !overrideOwnerId || !pin) {
      setOverrideOpen(false);
      setPendingOverrideRefund(null);
      return;
    }
    try {
      let branchId = user?.branchId || user?.branch?.id;
      if (!branchId && api?.users?.getRuntime) {
        try { const rt = await api.users.getRuntime(); branchId = rt?.lastShiftBranch || rt?.branchId || branchId; } catch {}
      }
      if (!branchId) throw new Error('Branch not resolved');

      // Verify override PIN via HRM
      await fullApi.hrm.overridePin.verifyUser({ userId: overrideOwnerId, branchId, pin });

      if (ctx.type === 'full') {
        await api.orders.refund(String(ctx.orderId), { overrideOwnerId });

        if (returnOrder?.draft?.id) {
          setDrafts(prev => prev.filter(d => d.id !== returnOrder.draft.id));
          try { await api.drafts.remove(String(returnOrder.draft.id)); } catch {}
        }
        setReturnOrder(null);
        await fetchDrafts();
        toast({ title: 'Sale returned', description: 'Order marked as REFUNDED.' });
        try { window.dispatchEvent(new CustomEvent('orders:refunded', { detail: { id: ctx.orderId } })); } catch {}

      } else if (ctx.type === 'partial') {
        const items = ctx.items || [];
        await api.orders.refundItems(String(ctx.orderId), items, { overrideOwnerId });

        if (returnOrder?.draft?.id) {
          try {
            const selMap = Object.fromEntries(items.map(i => [i.productId, i.qty]));
            const origCart = Array.isArray(returnOrder.draft.cart) ? returnOrder.draft.cart : [];
            const newCart = [];
            let newSubtotal = 0;
            let newTotal = 0;
            for (const ci of origCart) {
              const pid = ci.productId || ci.id || ci.product?.id;
              const price = Number(ci.price || ci.unitPrice || 0);
              const qty = Number(ci.qty || ci.quantity || 0);
              const returned = Number(selMap[pid] || 0);
              const remain = Math.max(0, qty - returned);
              if (remain > 0) {
                const nc = { ...ci, qty: remain, quantity: remain };
                newCart.push(nc);
                newSubtotal += price * remain;
              }
            }
            newTotal = newSubtotal;
            if (newCart.length === 0) {
              setDrafts(prev => prev.filter(d => d.id !== returnOrder.draft.id));
              try { await api.drafts.remove(String(returnOrder.draft.id)); } catch {}
            } else {
              await api.drafts.update(String(returnOrder.draft.id), {
                cart: newCart,
                subtotal: String(newSubtotal),
                total: String(newTotal),
                itemCount: newCart.reduce((a,b)=>a+Number(b.qty||b.quantity||0),0),
                status: 'SUSPENDED',
              });
            }
          } catch {}
        }

        setReturnOrder(null);
        await fetchDrafts();
        toast({ title: 'Items returned', description: 'Selected items have been refunded.' });
        try { window.dispatchEvent(new CustomEvent('orders:refunded', { detail: { id: ctx.orderId } })); } catch {}
      }
    } catch (e) {
      toast({ title: 'Override failed', description: String(e?.message || e), variant: 'destructive' });
    } finally {
      setOverrideOpen(false);
      setPendingOverrideRefund(null);
    }
  };

  const items = Array.isArray(drafts) ? drafts : [];
  const withFlags = items.map(d => ({
    ...d,
    isSuspended: d.isSuspended || String(d.status || '').toUpperCase() === 'SUSPENDED'
  }));
  const savedDrafts = withFlags.filter(d => !d.isSuspended);
  const suspendedBills = withFlags.filter(d => d.isSuspended);

  const inRange = (dt) => {
    try {
      const t = new Date(dt || Date.now());
      if (filters?.dateFrom) { const from = new Date(filters.dateFrom); if (t < from) return false; }
      if (filters?.dateTo) { const to = new Date(filters.dateTo); to.setHours(23,59,59,999); if (t > to) return false; }
      return true;
    } catch { return true; }
  };
  const savedFiltered = savedDrafts.filter(d => inRange(d.updatedAt || d.createdAt));
  const suspFiltered = suspendedBills.filter(d => inRange(d.updatedAt || d.createdAt));

  const [savedPage, setSavedPage] = useState(1);
  const [savedPageSize, setSavedPageSize] = useState(15);
  const savedTotal = savedFiltered.length;
  const savedStart = savedTotal ? (savedPage - 1) * savedPageSize + 1 : 0;
  const savedEnd = savedTotal ? Math.min(savedPage * savedPageSize, savedTotal) : 0;
  const savedTotalPages = Math.max(1, Math.ceil(savedTotal / savedPageSize));
  const savedItems = savedFiltered.slice((savedPage - 1) * savedPageSize, savedPage * savedPageSize);
  useEffect(() => { setSavedPage(1); }, [drafts.length]);

  const [suspPage, setSuspPage] = useState(1);
  const [suspPageSize, setSuspPageSize] = useState(15);
  const suspTotal = suspFiltered.length;
  const suspStart = suspTotal ? (suspPage - 1) * suspPageSize + 1 : 0;
  const suspEnd = suspTotal ? Math.min(suspPage * suspPageSize, suspTotal) : 0;
  const suspTotalPages = Math.max(1, Math.ceil(suspTotal / suspPageSize));
  const suspItems = suspFiltered.slice((suspPage - 1) * suspPageSize, suspPage * suspPageSize);
  useEffect(() => { setSuspPage(1); }, [drafts.length]);

  const exportCsvDrafts = (rows) => {
    const cols = ['Name','Items','Service','Total','Updated'];
    const lines = [cols.join(',')];
    for (const d of rows) {
      const items = Array.isArray(d.cart) ? d.cart.length : Number(d.itemCount||0);
      const total = Number(d.total||0).toFixed(2);
      const date = new Date(d.updatedAt || d.createdAt || Date.now()).toLocaleString();
      const row = [d.name, items, (d.service||d.serviceType||''), total, date].map(v => `"${String(v).replace(/"/g,'""')}"`).join(',');
      lines.push(row);
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = (mode==='suspended'?'suspended':'drafts')+'.csv'; a.click(); URL.revokeObjectURL(url);
  };
  const printDrafts = (rows) => {
    const w = window.open('', 'print'); if (!w) return;
    const rowsHtml = rows.map(d => `<tr><td>${d.name}</td><td>${Array.isArray(d.cart)?d.cart.length:(Number(d.itemCount||0))}</td><td>${d.service||d.serviceType||''}</td><td>${Number(d.total||0).toFixed(2)}</td><td>${new Date(d.updatedAt||d.createdAt||Date.now()).toLocaleString()}</td></tr>`).join('');
    w.document.write(`<html><head><title>${mode==='suspended'?'Suspended Bills':'Drafts'}</title></head><body><table border="1" cellspacing="0" cellpadding="4"><thead><tr><th>Name</th><th>Items</th><th>Service</th><th>Total</th><th>Updated</th></tr></thead><tbody>${rowsHtml}</tbody></table></body></html>`); w.document.close(); w.focus(); w.print(); w.close();
  };

  const exportXlsxRows = (rows) => rows.map(d => {
    const obj = {};
    if (colVis.name) obj.Name = d.name;
    if (colVis.items) obj.Items = Array.isArray(d.cart) ? d.cart.length : Number(d.itemCount||0);
    if (colVis.service) obj.Service = d.service || d.serviceType || '';
    if (colVis.total) obj.Total = Number(d.total||0).toFixed(2);
    if (colVis.updated) obj.Updated = new Date(d.updatedAt || d.createdAt || Date.now()).toLocaleString();
    return obj;
  });

  const DraftCard = ({ title, description, list, range, onPrev, onNext, disablePrev, disableNext }) => (
    <Card className="glass-effect">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2"><FileText className="w-6 h-6 text-primary" /> {title}</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchDrafts} disabled={isLoading}>{isLoading ? 'Refreshing…' : 'Refresh'}</Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">Columns</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuCheckboxItem checked={colVis.name} onCheckedChange={(v) => setColVis(prev => ({ ...prev, name: !!v }))}>Name</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={colVis.items} onCheckedChange={(v) => setColVis(prev => ({ ...prev, items: !!v }))}>Items</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={colVis.service} onCheckedChange={(v) => setColVis(prev => ({ ...prev, service: !!v }))}>Service</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={colVis.total} onCheckedChange={(v) => setColVis(prev => ({ ...prev, total: !!v }))}>Total</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={colVis.updated} onCheckedChange={(v) => setColVis(prev => ({ ...prev, updated: !!v }))}>Updated</DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="sm" onClick={() => exportCsvDrafts(list)}>Export CSV</Button>
            <Button variant="outline" size="sm" onClick={async () => exportXlsx((title.includes('Suspended')?'suspended':'drafts')+'.xlsx', exportXlsxRows(list))}>Export XLSX</Button>
            <Button variant="outline" size="sm" onClick={() => printDrafts(list)}>Print</Button>
          </div>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-h-[36rem] overflow-y-auto pr-2">
          {list.length > 0 ? list.map(draft => (
            <div key={draft.id} className={`p-4 rounded-lg border ${title.includes('Suspended') ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' : 'bg-background/50' } flex justify-between items-center`}>
              <div>
                {colVis.name && (<p className="font-bold">{draft.name}</p>)}
                <p className="text-sm text-muted-foreground">
                  {colVis.items && (<span>{Array.isArray(draft.cart) ? draft.cart.length : (Number(draft.itemCount||0))} items</span>)}
                  {colVis.service && (<span>{colVis.items ? ' - ' : ''}{draft.service || draft.serviceType || '-'}</span>)}
                  {draft.table && (<span> - Table: {draft.table.name || draft.table}</span>)}
                  {colVis.total && title.includes('Suspended') && (<span> - Total: ${Number(draft.total||0).toFixed(2)}</span>)}
                </p>
                {colVis.updated && (<p className="text-xs text-muted-foreground mt-1"><Calendar className="w-3 h-3 mr-1.5 inline" />{new Date(draft.updatedAt || draft.createdAt || Date.now()).toLocaleString()}</p>)}
              </div>
              <AlertDialog>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon"><MoreVertical className="w-5 h-5"/></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {title.includes('Suspended') ? (
                      <>
                        <DropdownMenuItem onClick={() => handleViewSuspended(draft)}><Eye className="mr-2 h-4 w-4" />View</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSettleSuspended(draft, 'cash')}><FileText className="mr-2 h-4 w-4" />Paid (Cash)</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSettleSuspended(draft, 'card')}><FileText className="mr-2 h-4 w-4" />Paid (Card)</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSettleSuspended(draft, 'transfer')}><FileText className="mr-2 h-4 w-4" />Paid (Transfer)</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openReturnModal(draft)}><RotateCcw className="mr-2 h-4 w-4" />Return Sale</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem className="text-red-500 focus:text-red-500"><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                        </AlertDialogTrigger>
                      </>
                    ) : (
                      <>
                        <DropdownMenuItem onClick={() => handleViewSavedDraft(draft)} onSelect={() => handleViewSavedDraft(draft)}><Eye className="mr-2 h-4 w-4" />View</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleLoadDraft(draft)}><ShoppingCart className="mr-2 h-4 w-4" />Load & Edit</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem className="text-red-500 focus:text-red-500"><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                        </AlertDialogTrigger>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete "{draft.name}".
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDeleteDraft(draft.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )) : (
            <p className="text-center text-muted-foreground py-8">No items.</p>
          )}
        </div>
        <div className="flex items-center justify-between pt-2 text-sm">
          <div>{range}</div>
          <div className="space-x-2">
            <Button variant="outline" size="sm" onClick={onPrev} disabled={disablePrev}>Previous</Button>
            <Button variant="outline" size="sm" onClick={onNext} disabled={disableNext}>Next</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (mode === 'suspended') {
    return (
      <div className="grid grid-cols-1 gap-6">
        <DraftCard
          title="Suspended Bills"
          description="Credit/held bills awaiting completion."
          list={suspItems}
          range={`${suspStart}–${suspEnd} of ${suspTotal} • ${suspPageSize} per page`}
          onPrev={() => setSuspPage(p => Math.max(1, p - 1))}
          onNext={() => setSuspPage(p => Math.min(suspTotalPages, p + 1))}
          disablePrev={suspPage <= 1}
          disableNext={suspPage >= suspTotalPages}
        />
        {/* Suspended-only modals */}
        <ViewSuspendedModal open={!!viewOrder} onClose={() => setViewOrder(null)} order={viewOrder?.order} draft={viewOrder?.draft} />
        <ReturnSelectModal
          open={!!returnOrder}
          onClose={() => setReturnOrder(null)}
          order={returnOrder?.order}
          selection={returnSelection}
          setSelection={setReturnSelection}
          onReturnAll={handleReturnAll}
          onConfirm={handleReturnSelected}
        />
        <OverridePinModal
          open={isOverrideOpen}
          onClose={() => { setOverrideOpen(false); setPendingOverrideRefund(null); }}
          onConfirm={handleOverrideConfirm}
          title="Supervisor Override Required"
          description="Select a supervisor and enter their override PIN to authorize this return."
          users={overrideUsers}
        />
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-6">
      <DraftCard
        title="Saved Drafts"
        description="Manage your saved or in-progress orders."
        list={savedItems}
        range={`${savedStart}–${savedEnd} of ${savedTotal} • ${savedPageSize} per page`}
        onPrev={() => setSavedPage(p => Math.max(1, p - 1))}
        onNext={() => setSavedPage(p => Math.min(savedTotalPages, p + 1))}
        disablePrev={savedPage <= 1}
        disableNext={savedPage >= savedTotalPages}
      />
      <SaleDetailModal isOpen={!!viewSavedSale} onClose={() => setViewSavedSale(null)} sale={viewSavedSale} onPrint={onPrint} />
    </div>
  );
};

const SellReturnList = ({ user, filters = {} }) => {
    const [returns, setReturns] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(15);
    const [colVis, setColVis] = useState({ invoice: true, date: true, amount: true });

    const fetchReturns = async () => {
        setIsLoading(true);
        try {
            const branchId = filters?.branchId || user?.branchId || user?.branch?.id;
            const resp = await api.orders?.list?.(branchId ? { branchId } : {});
            const list = Array.isArray(resp?.items) ? resp.items : (Array.isArray(resp) ? resp : []);
            const filtered = list.filter(o => {
                const status = String(o?.status || '').toUpperCase();
                const flagged = o?.refunded === true || Number(o?.refundTotal || o?.refundedAmount || 0) > 0;
                const negativeTotal = Number(o?.totalAmount ?? o?.total ?? 0) < 0;
                const type = String(o?.type || '').toUpperCase();
                return status === 'REFUNDED' || status === 'CANCELLED' || flagged || negativeTotal || type === 'RETURN';
            });
            const inRange = (dt) => {
              try {
                const t = new Date(dt || Date.now());
                if (filters?.dateFrom) { const from = new Date(filters.dateFrom); if (t < from) return false; }
                if (filters?.dateTo) { const to = new Date(filters.dateTo); to.setHours(23,59,59,999); if (t > to) return false; }
                return true;
              } catch { return true; }
            };
            setReturns(filtered.filter(r => inRange(r.createdAt || r.updatedAt || r.id)));
        } catch {
            setReturns([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchReturns(); }, [user?.branchId, user?.branch?.id]);
    useEffect(() => {
        const onRefund = () => fetchReturns();
        try { window.addEventListener('orders:refunded', onRefund); } catch {}
        return () => { try { window.removeEventListener('orders:refunded', onRefund); } catch {} };
    }, []);

    const total = returns.length;
    const start = total ? (page - 1) * pageSize + 1 : 0;
    const end = total ? Math.min(page * pageSize, total) : 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const pageItems = returns.slice((page - 1) * pageSize, page * pageSize);
    useEffect(() => { setPage(1); }, [returns.length]);

    const exportCsv = (rows) => {
      const cols = ['Invoice','Date','Amount'];
      const lines = [cols.join(',')];
      for (const d of rows) {
        const invRaw = d.displayInvoice || d.invoice_no || d.invoiceNo || d.receiptNo || (d.orderNumber != null ? `INV${String(d.orderNumber).padStart(3,'0')}` : (d.id && d.id.slice ? d.id.slice(0,8) : String(d.id)));
        const row = [invRaw, new Date(d.createdAt || d.updatedAt || d.id).toLocaleString(), -Math.abs(Number(d.refundTotal ?? d.refundedAmount ?? d.totalAmount ?? d.total ?? 0)).toFixed(2)].map(v => `"${String(v).replace(/"/g,'""')}"`).join(',');
        lines.push(row);
      }
      const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'returns.csv'; a.click(); URL.revokeObjectURL(url);
    };
    const printTable = (rows) => {
      const w = window.open('', 'print'); if (!w) return;
      const rowsHtml = rows.map(r => `<tr><td>${r.displayInvoice || r.invoice_no || r.invoiceNo || r.receiptNo || (r.orderNumber != null ? `INV${String(r.orderNumber).padStart(3,'0')}` : (r.id && r.id.slice ? r.id.slice(0,8) : String(r.id)))}</td><td>${new Date(r.createdAt || r.updatedAt || r.id).toLocaleString()}</td><td>${-Math.abs(Number(r.refundTotal ?? r.refundedAmount ?? r.totalAmount ?? r.total ?? 0)).toFixed(2)}</td></tr>`).join('');
      w.document.write(`<html><head><title>Returns</title></head><body><table border=\"1\" cellspacing=\"0\" cellpadding=\"4\"><thead><tr><th>Invoice</th><th>Date</th><th>Amount</th></tr></thead><tbody>${rowsHtml}</tbody></table></body></html>`); w.document.close(); w.focus(); w.print(); w.close();
    };

    const exportXlsxRows = (rows) => rows.map(r => {
      const invRaw = r.displayInvoice || r.invoice_no || r.invoiceNo || r.receiptNo || (r.orderNumber != null ? `INV${String(r.orderNumber).padStart(3,'0')}` : (r.id && r.id.slice ? r.id.slice(0,8) : String(r.id)));
      const obj = {};
      if (colVis.invoice) obj.Invoice = invRaw;
      if (colVis.date) obj.Date = new Date(r.createdAt || r.updatedAt || r.id).toLocaleString();
      if (colVis.amount) obj.Amount = -Math.abs(Number(r.refundTotal ?? r.refundedAmount ?? r.totalAmount ?? r.total ?? 0)).toFixed(2);
      return obj;
    });

    return (
        <Card className="glass-effect">
            <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2"><RotateCcw className="w-6 h-6 text-primary" /> Sales Returns</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={fetchReturns} disabled={isLoading}>{isLoading ? 'Refreshing…' : 'Refresh'}</Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">Columns</Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuCheckboxItem checked={colVis.invoice} onCheckedChange={(v) => setColVis(prev => ({ ...prev, invoice: !!v }))}>Invoice</DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem checked={colVis.date} onCheckedChange={(v) => setColVis(prev => ({ ...prev, date: !!v }))}>Date</DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem checked={colVis.amount} onCheckedChange={(v) => setColVis(prev => ({ ...prev, amount: !!v }))}>Amount</DropdownMenuCheckboxItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button variant="outline" size="sm" onClick={() => exportCsv(pageItems)}>Export CSV</Button>
                    <Button variant="outline" size="sm" onClick={async () => exportXlsx('returns.xlsx', exportXlsxRows(pageItems))}>Export XLSX</Button>
                    <Button variant="outline" size="sm" onClick={() => printTable(pageItems)}>Print</Button>
                  </div>
                </div>
                <CardDescription>Track all returned items and refunds.</CardDescription>
            </CardHeader>
            <CardContent>
                {pageItems.length > 0 ? (
                  <div className="space-y-3 h-[24rem] overflow-y-auto pr-2">
                    {pageItems.map((ret) => (
                      <div key={ret.id} className="p-3 rounded-lg border bg-background/50 flex justify-between items-center">
                        <div>
                          {(() => {
                            const raw = ret.displayInvoice || ret.invoice_no || ret.invoiceNo || ret.receiptNo || (ret.orderNumber != null ? String(ret.orderNumber) : null) || (ret.id && ret.id.slice ? ret.id.slice(0,8) : String(ret.id));
                            const label = (() => {
                              if (ret.orderNumber != null) return `INV${String(ret.orderNumber).padStart(3,'0')}`;
                              const s = String(raw || '');
                              if (/^inv/i.test(s)) return s;
                              if (/^\d+$/.test(s)) return `INV${String(Number(s)).padStart(3,'0')}`;
                              return s;
                            })();
                            return colVis.invoice ? (<p className="font-semibold">#{label}</p>) : null;
                          })()}
                          {colVis.date && (<p className="text-sm text-muted-foreground">{new Date(ret.createdAt || ret.updatedAt || ret.id).toLocaleString()}</p>)}
                        </div>
                        <div className="text-right">
                          {colVis.amount && (<p className="font-bold">- {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(Math.abs(Number(ret.refundTotal ?? ret.refundedAmount ?? ret.totalAmount ?? ret.total ?? 0)))}</p>)}
                          <span className="px-2 py-1 text-xs rounded-full bg-red-200 text-red-800">Refunded</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                      <p>No sales returns found.</p>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 text-sm">
                    <div>{start}<span className="px-1">–</span>{end} of {total} <span className="px-2 text-muted-foreground">•</span> {pageSize} per page</div>
                    <div className="space-x-2">
                        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>Previous</Button>
                        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

const DiscountList = ({ setActiveTab, user, filters = {} }) => {
    const [appliedDiscounts, setAppliedDiscounts] = useState([]);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(15);
    const [colVis, setColVis] = useState({ saleId: true, date: true, cashier: true, discount: true, amount: true });

    useEffect(() => {
        (async () => {
            try {
                // Prefer a discounts report if available
                let list = [];
                if (api.reports?.discounts?.list) {
                    const res = await api.reports.discounts.list({ branchId: (filters?.branchId || user?.branchId) });
                    list = Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : []);
                    const mapped = list.map(r => ({
                        saleId: r.orderId || r.saleId,
                        cashier: r.cashier || r.user || '',
                        discountName: r.discountName || r.name || '',
                        discountAmount: Number(r.amount || r.value || 0),
                        date: r.createdAt || r.date || Date.now(),
                    }));
                    setAppliedDiscounts(mapped);
                    return;
                }
                // Fallback: scan orders and extract discount info
                const res = await api.orders?.list?.((filters?.branchId || user?.branchId) ? { branchId: (filters?.branchId || user.branchId), limit: 200 } : { limit: 200 });
                const orders = Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : []);
                const discounts = orders
                    .filter(sale => sale.discountInfo && Number(sale.discountInfo.amount) > 0)
                    .map(sale => ({
                        saleId: sale.id,
                        cashier: sale.cashier,
                        discountName: sale.discountInfo.name,
                        discountAmount: Number(sale.discountInfo.amount || 0),
                        date: sale.createdAt || sale.id,
                    }));
                setAppliedDiscounts(discounts);
            } catch {
                setAppliedDiscounts([]);
            }
        })();
    }, [user?.branchId, filters?.branchId]);

    const inRange = (dt) => {
      try {
        const t = new Date(dt || Date.now());
        if (filters?.dateFrom) { const from = new Date(filters.dateFrom); if (t < from) return false; }
        if (filters?.dateTo) { const to = new Date(filters.dateTo); to.setHours(23,59,59,999); if (t > to) return false; }
        return true;
      } catch { return true; }
    };
    const filteredDiscounts = appliedDiscounts.filter(d => inRange(d.date));
    const total = filteredDiscounts.length;
    const start = total ? (page - 1) * pageSize + 1 : 0;
    const end = total ? Math.min(page * pageSize, total) : 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const pageItems = filteredDiscounts.slice((page - 1) * pageSize, page * pageSize);
    useEffect(() => { setPage(1); }, [appliedDiscounts.length, filters?.dateFrom, filters?.dateTo]);

    const exportCsv = (rows) => {
      const cols = ['Sale ID','Date','Cashier','Discount','Amount'];
      const lines = [cols.join(',')];
      for (const d of rows) {
        const row = [d.saleId, new Date(d.date).toLocaleString(), d.cashier, d.discountName, d.discountAmount.toFixed(2)].map(v => `"${String(v).replace(/"/g,'""')}"`).join(',');
        lines.push(row);
      }
      const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'discounts.csv'; a.click(); URL.revokeObjectURL(url);
    };
    const printTable = (rows) => {
      const w = window.open('', 'print'); if (!w) return;
      const rowsHtml = rows.map(d => `<tr><td>${d.saleId}</td><td>${new Date(d.date).toLocaleString()}</td><td>${d.cashier}</td><td>${d.discountName}</td><td>${d.discountAmount.toFixed(2)}</td></tr>`).join('');
      w.document.write(`<html><head><title>Discounts</title></head><body><table border=\"1\" cellspacing=\"0\" cellpadding=\"4\"><thead><tr><th>Sale ID</th><th>Date</th><th>Cashier</th><th>Discount</th><th>Amount</th></tr></thead><tbody>${rowsHtml}</tbody></table></body></html>`);
      w.document.close(); w.focus(); w.print(); w.close();
    };

    const exportXlsxRows = (rows) => rows.map(d => {
      const obj = {};
      if (colVis.saleId) obj['Sale ID'] = d.saleId;
      if (colVis.date) obj.Date = new Date(d.date).toLocaleString();
      if (colVis.cashier) obj.Cashier = d.cashier;
      if (colVis.discount) obj.Discount = d.discountName;
      if (colVis.amount) obj.Amount = d.discountAmount.toFixed(2);
      return obj;
    });

    return (
        <Card className="glass-effect">
            <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2"><Percent className="w-6 h-6 text-primary" /> Applied Discounts</CardTitle>
                  <div className="flex gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">Columns</Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuCheckboxItem checked={colVis.saleId} onCheckedChange={(v) => setColVis(prev => ({ ...prev, saleId: !!v }))}>Sale ID</DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem checked={colVis.date} onCheckedChange={(v) => setColVis(prev => ({ ...prev, date: !!v }))}>Date</DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem checked={colVis.cashier} onCheckedChange={(v) => setColVis(prev => ({ ...prev, cashier: !!v }))}>Cashier</DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem checked={colVis.discount} onCheckedChange={(v) => setColVis(prev => ({ ...prev, discount: !!v }))}>Discount</DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem checked={colVis.amount} onCheckedChange={(v) => setColVis(prev => ({ ...prev, amount: !!v }))}>Amount</DropdownMenuCheckboxItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button variant="outline" size="sm" onClick={() => exportCsv(pageItems)}>Export CSV</Button>
                    <Button variant="outline" size="sm" onClick={async () => exportXlsx('discounts.xlsx', exportXlsxRows(pageItems))}>Export XLSX</Button>
                    <Button variant="outline" size="sm" onClick={() => printTable(pageItems)}>Print</Button>
                  </div>
                </div>
                <CardDescription>A log of all discounts applied to sales.</CardDescription>
            </CardHeader>
            <CardContent>
                {pageItems.length > 0 ? (
                    <div className="space-y-3 h-[36rem] overflow-y-auto pr-2">
                        {pageItems.map((discount, index) => (
                            <div key={index} className="p-3 rounded-lg border bg-background/50 flex justify-between items-center">
                                <div>
                                    {colVis.discount && (<p className="font-semibold">{discount.discountName}</p>)}
                                    <p className="text-sm text-muted-foreground">
                                      {colVis.saleId && (<span>Sale #{discount.saleId}</span>)}
                                      {colVis.cashier && (<span>{colVis.saleId ? ' by ' : ''}{discount.cashier}</span>)}
                                    </p>
                                    {colVis.date && (<p className="text-xs text-muted-foreground mt-1"><Calendar className="w-3 h-3 mr-1.5 inline" />{new Date(discount.date).toLocaleString()}</p>)}
                                </div>
                                {colVis.amount && (<p className="font-bold text-lg text-destructive">-${discount.discountAmount.toFixed(2)}</p>)}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center text-muted-foreground py-8">
                        <p>No discounts have been applied to sales yet.</p>
                    </div>
                )}
                <div className="flex items-center justify-between pt-2 text-sm">
                    <div>{start}<span className="px-1">–</span>{end} of {total} <span className="px-2 text-muted-foreground">•</span> {pageSize} per page</div>
                    <div className="space-x-2">
                        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>Previous</Button>
                        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</Button>
                    </div>
                </div>
                <div className="flex justify-center mt-4">
                    <Button variant="link" onClick={() => setActiveTab('discount-settings')}>View & Manage Discounts</Button>
                </div>
            </CardContent>
        </Card>
    );
};

// Lightweight modals used by DraftList for Suspended bills
const ViewSuspendedModal = ({ open, onClose, order, draft }) => (
  <Dialog open={open} onOpenChange={onClose}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Suspended Order</DialogTitle>
        <DialogDescription>Review items for {draft?.name}</DialogDescription>
      </DialogHeader>
      <div className="space-y-2 max-h-[50vh] overflow-y-auto text-sm">
        <div className="font-semibold">Total: {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(Number(order?.total ?? draft?.total ?? 0))}</div>
        <div className="border-t pt-2">
          {(order?.items || []).map((it, idx) => (
            <div key={idx} className="flex justify-between py-1">
              <span>{it.product?.name || it.productName || it.productId}</span>
              <span>x{it.qty} — {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(Number(it.price || 0))}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Close</Button>
      </div>
    </DialogContent>
  </Dialog>
);

const ReturnAllModal = ({ open, onClose, onConfirm }) => (
  <Dialog open={open} onOpenChange={onClose}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Return Sale</DialogTitle>
        <DialogDescription>Return the entire sale amount.</DialogDescription>
      </DialogHeader>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button variant="destructive" onClick={onConfirm}>Return All</Button>
      </div>
    </DialogContent>
  </Dialog>
);

// Return selection modal (supports partial returns)
const ReturnSelectModal = ({ open, onClose, order, selection, setSelection, onReturnAll, onConfirm }) => {
  const items = Array.isArray(order?.items) ? order.items : [];
  const fmt = (n) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(Number(n||0));
  const handleQty = (pid, max, val) => {
    const num = Math.max(0, Math.min(max, Number(val || 0)));
    setSelection(prev => ({ ...prev, [pid]: num }));
  };
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Return Sale</DialogTitle>
          <DialogDescription>Select items and quantities to return, or use Return All.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[50vh] overflow-y-auto space-y-2 text-sm">
          {items.length === 0 ? (
            <p className="text-muted-foreground">No items found for this order.</p>
          ) : (
            items.map((it, idx) => {
              const pid = it.productId || it.product?.id || it.id;
              const max = Number(it.qty || 0);
              const val = Number(selection?.[pid] ?? max);
              return (
                <div key={idx} className="flex items-center justify-between border-b py-2">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{it.product?.name || it.productName || it.productId}</div>
                    <div className="text-xs text-muted-foreground">Sold: {max} × {fmt(it.price)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="number" className="w-20 border rounded px-2 py-1 bg-background"
                      min={0} max={max} value={val}
                      onChange={(e) => handleQty(pid, max, e.target.value)} />
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div className="flex items-center justify-between pt-2">
          <Button variant="secondary" onClick={onReturnAll}>Return All</Button>
          <Button onClick={onConfirm}>Confirm Selection</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default Sell;
