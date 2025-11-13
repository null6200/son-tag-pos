import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
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
import PrintView from '@/components/pos/PrintView';

const Sell = ({ setActiveTab, onSetDraftToLoad, user, onGoToPOS }) => {
    const [printData, setPrintData] = useState(null);
    const printRef = useRef();

    useEffect(() => {
        if (printData) {
            const timer = setTimeout(() => {
                window.print();
                setPrintData(null);
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [printData]);

    const handlePrint = (type, data) => {
        setPrintData({ type, data });
    };

    // Suspended handlers are defined inside DraftList below.

    return (
        <>
            <div className="space-y-8 print:hidden">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-3xl font-bold gradient-text mb-2">Sell Management</h2>
                        <p className="text-muted-foreground">Track all sales, drafts, returns, and discounts.</p>
                    </div>
                    <Button onClick={() => (onGoToPOS ? onGoToPOS() : setActiveTab('pos'))} className="gap-2">
                        <PlusCircle className="w-4 h-4" />
                        Go to POS
                    </Button>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, staggerChildren: 0.1 }}
                    className="space-y-8"
                >
                    <SalesList onPrint={handlePrint} user={user} />
                    <DraftList setActiveTab={setActiveTab} onSetDraftToLoad={onSetDraftToLoad} user={user} />
                    <SellReturnList user={user} />
                    <DiscountList setActiveTab={setActiveTab} user={user} />
                </motion.div>
            </div>
            {printData && <PrintView ref={printRef} type={printData.type} data={printData.data} />}
        </>
    );
};

const SalesList = ({ onPrint, user }) => {
    const [sales, setSales] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSale, setSelectedSale] = useState(null);
    const [isDetailViewOpen, setIsDetailViewOpen] = useState(false);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(15);
    const [pendingReturn, setPendingReturn] = useState(null);

    const fetchSales = async () => {
        try {
            const branchId = user?.branchId;
            const res = await api.orders?.list?.(branchId ? { branchId, limit: 100 } : { limit: 100 });
            const list = Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : []);
            const normalized = list.map(s => {
                try {
                    const total = Number(s.total ?? s.totalAmount ?? 0);
                    const payments = Array.isArray(s.payments) ? s.payments : [];
                    const paid = payments.reduce((a, p) => a + Number(p.amount || 0), 0);
                    if (paid >= total && total > 0) return { ...s, status: 'PAID' };
                } catch {}
                return s;
            });
            setSales(normalized);
        } catch {
            setSales([]);
        }
    };
    useEffect(() => { fetchSales(); }, [user?.branchId]);
    useEffect(() => {
        const onChanged = () => { fetchSales(); };
        window.addEventListener('orders:changed', onChanged);
        window.addEventListener('orders:refunded', onChanged);
        return () => {
            window.removeEventListener('orders:changed', onChanged);
            window.removeEventListener('orders:refunded', onChanged);
        };
    }, []);

    const filteredSales = sales.filter(sale => 
        (sale.id?.toString().toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (sale.cashier?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );
    const total = filteredSales.length;
    const start = total ? (page - 1) * pageSize + 1 : 0;
    const end = total ? Math.min(page * pageSize, total) : 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const pageItems = filteredSales.slice((page - 1) * pageSize, page * pageSize);
    useEffect(() => { setPage(1); }, [searchTerm, sales.length]);
    
    const handleViewDetails = async (sale) => {
        try {
            const full = await api.orders?.get?.(String(sale.id));
            const merged = { ...sale, ...(full || {}) };
            setSelectedSale(merged);
            setIsDetailViewOpen(true);
        } catch (e) {
            // fallback to minimal object
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

    return (
        <>
            <Card className="glass-effect">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><List className="w-6 h-6 text-primary" /> Sales List</CardTitle>
                    <CardDescription>A detailed list of all completed sales.</CardDescription>
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
                                    {(() => {
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
                                    <p className="text-sm text-muted-foreground flex items-center gap-2"><User className="w-3 h-3" />{sale.cashier || sale.userName || sale.user?.username}</p>
                                    <p className="text-xs text-muted-foreground mt-1"><Calendar className="w-3 h-3 mr-1.5 inline" />{new Date(sale.createdAt || sale.timestamp || Date.now()).toLocaleString()}</p>
                                </div>
                                <div className="text-right mr-4">
                                    <p className="font-bold text-lg">${Number(sale.total ?? sale.totalAmount ?? 0).toFixed(2)}</p>
                                    {(() => {
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

    const createdAtSafe = sale.createdAt || sale.timestamp || sale.updatedAt || Date.now();
    const payments = Array.isArray(sale.payments) ? sale.payments : [];
    const primaryPayment = payments[0] || {};
    const sectionName = sale.section?.name || sale.section || '-';
    const cashier = sale.cashier || sale.userName || sale.user?.username || '-';
    const invoiceLabel = (() => {
        const raw = sale.displayInvoice || sale.invoice_no || sale.invoiceNo || sale.receiptNo || (sale.orderNumber != null ? String(sale.orderNumber) : null) || (sale.id && sale.id.slice ? sale.id.slice(0,8) : String(sale.id));
        if (sale.orderNumber != null) return `INV${String(sale.orderNumber).padStart(3,'0')}`;
        const s = String(raw || '');
        if (/^inv/i.test(s)) return s;
        if (/^\d+$/.test(s)) return `INV${String(Number(s)).padStart(3,'0')}`;
        return s;
    })();

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Sale Details - #{invoiceLabel}</DialogTitle>
                    <DialogDescription>{new Date(createdAtSafe).toLocaleString()}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2 text-sm max-h-[60vh] overflow-y-auto">
                    <InfoItem label="Cashier" value={cashier} />
                    <InfoItem label="Waiter" value={sale.waiter} />
                    <InfoItem label="Branch" value={sale.branch?.name} />
                    <InfoItem label="Section" value={sectionName} />
                    <InfoItem label="Service Type" value={sale.serviceType} />
                    {sale.table && <InfoItem label="Table" value={sale.table?.name || sale.table} />}

                    <h3 className="font-bold pt-4 border-t mt-4">Items ({(sale.items || []).length})</h3>
                    <div className="space-y-2">
                        {(sale.items || []).map(item => (
                            <div key={item.id ?? `${item.product?.name || item.name}-${item.qty}` } className="flex justify-between items-center">
                                <span>{item.product?.name || item.name} x {item.qty}</span>
                                <span className="font-mono">${(Number(item.price) * Number(item.qty || 0)).toFixed(2)}</span>
                            </div>
                        ))}
                    </div>

                    <h3 className="font-bold pt-4 border-t mt-4">Totals</h3>
                    <InfoItem label="Subtotal" value={`$${Number(sale.subtotal ?? 0).toFixed(2)}`} />
                    <InfoItem label="Tax" value={`$${Number(sale.tax ?? 0).toFixed(2)}`} />
                    {Number(sale.discount ?? 0) > 0 && <InfoItem label="Discount" value={`-$${Number(sale.discount ?? 0).toFixed(2)}`} className="text-destructive" />}
                    <InfoItem label="Total Amount" value={`$${Number(sale.total ?? sale.totalAmount ?? 0).toFixed(2)}`} className="font-extrabold text-base"/>

                    <h3 className="font-bold pt-4 border-t mt-4">Payment</h3>
                    <InfoItem label="Method" value={(primaryPayment.method || sale.paymentDetails?.method || '').toString().toUpperCase()} />
                    {primaryPayment && primaryPayment.method === 'cash' && (
                        <>
                            <InfoItem label="Cash Received" value={`$${Number(primaryPayment.amount ?? sale.paymentDetails?.received ?? 0).toFixed(2)}`} />
                            <InfoItem label="Change" value={`$${Number(sale.paymentDetails?.change ?? 0).toFixed(2)}`} />
                        </>
                    )}
                    {Array.isArray(payments) && payments.length > 1 && (
                        <>
                          {payments.slice(1).map((p, idx) => (
                            <InfoItem key={idx} label={`+ ${p.method}`} value={`$${Number(p.amount||0).toFixed(2)}`} />
                          ))}
                        </>
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


const DraftList = ({ setActiveTab, onSetDraftToLoad, user }) => {
    const [drafts, setDrafts] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [viewOrder, setViewOrder] = useState(null); // { order, draft }
    const [returnOrder, setReturnOrder] = useState(null); // { orderId, draft, order }
    const [returnSelection, setReturnSelection] = useState({}); // productId -> qty

    const fetchDrafts = async () => {
        setIsLoading(true);
        try {
            let branchId = user?.branchId || user?.branch?.id;
            if (!branchId && api?.users?.getRuntime) {
                try { const rt = await api.users.getRuntime(); branchId = rt?.lastShiftBranch || rt?.branchId || branchId; } catch {}
            }
            if (!branchId && api.me) {
                try { const me = await api.me(); branchId = me?.branchId || me?.branch?.id || branchId; } catch {}
            }
            if (!branchId && api?.branches?.list) {
                try { const list = await api.branches.list(); const arr = Array.isArray(list) ? list : (Array.isArray(list?.items) ? list.items : []); branchId = arr[0]?.id || branchId; } catch {}
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

    const handleDeleteDraft = async (draftId) => {
        try {
            await api.drafts?.remove?.(String(draftId));
            // Optionally, if backend expects a table unlock:
            // await api.tables.unlock?.({ draftId });
            setDrafts(prev => prev.filter(d => d.id !== draftId));
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

    const handleReturnAll = async () => {
        const ctx = returnOrder;
        if (!ctx?.orderId) { setReturnOrder(null); return; }
        try {
            await api.orders.refund(String(ctx.orderId));
            // Remove any linked draft immediately (UI) and backend
            if (ctx.draft?.id) {
              setDrafts(prev => prev.filter(d => d.id !== ctx.draft.id));
              try { await api.drafts.remove(String(ctx.draft.id)); } catch {}
            }
            setReturnOrder(null);
            await fetchDrafts();
            toast({ title: 'Sale returned', description: 'Order marked as REFUNDED.' });
            try { window.dispatchEvent(new CustomEvent('orders:refunded', { detail: { id: ctx.orderId } })); } catch {}
        } catch (e) {
            toast({ title: 'Return failed', description: String(e?.message || e), variant: 'destructive' });
        }
    };

    const handleReturnSelected = async () => {
        const ctx = returnOrder;
        if (!ctx?.orderId || !ctx?.order) { setReturnOrder(null); return; }
        try {
            const items = (ctx.order.items || []).map(it => {
                const pid = it.productId || it.product?.id || it.id;
                const max = Number(it.qty || 0);
                const qty = Math.max(0, Math.min(max, Number(returnSelection?.[pid] || 0)));
                return pid && qty > 0 ? { productId: pid, qty } : null;
            }).filter(Boolean);
            if (!items.length) { toast({ title: 'Nothing selected', description: 'Choose at least one item to return.' }); return; }
            await api.orders.refundItems(String(ctx.orderId), items);
            // Update or remove draft to reflect returned quantities
            if (ctx.draft?.id) {
              try {
                const selMap = Object.fromEntries(items.map(i => [i.productId, i.qty]));
                const origCart = Array.isArray(ctx.draft.cart) ? ctx.draft.cart : [];
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
                newTotal = newSubtotal; // taxes/discounts could be re-applied if stored; simplest sum
                if (newCart.length === 0) {
                  // remove draft entirely
                  setDrafts(prev => prev.filter(d => d.id !== ctx.draft.id));
                  try { await api.drafts.remove(String(ctx.draft.id)); } catch {}
                } else {
                  await api.drafts.update(String(ctx.draft.id), {
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
        } catch (e) {
            toast({ title: 'Partial return failed', description: String(e?.message || e), variant: 'destructive' });
        }
    };

    const items = Array.isArray(drafts) ? drafts : [];
    const withFlags = items.map(d => ({
        ...d,
        isSuspended: d.isSuspended || String(d.status || '').toUpperCase() === 'SUSPENDED'
    }));
    const savedDrafts = withFlags.filter(d => !d.isSuspended);
    const suspendedBills = withFlags.filter(d => d.isSuspended);

    const [savedPage, setSavedPage] = useState(1);
    const [savedPageSize, setSavedPageSize] = useState(15);
    const savedTotal = savedDrafts.length;
    const savedStart = savedTotal ? (savedPage - 1) * savedPageSize + 1 : 0;
    const savedEnd = savedTotal ? Math.min(savedPage * savedPageSize, savedTotal) : 0;
    const savedTotalPages = Math.max(1, Math.ceil(savedTotal / savedPageSize));
    const savedItems = savedDrafts.slice((savedPage - 1) * savedPageSize, savedPage * savedPageSize);
    useEffect(() => { setSavedPage(1); }, [drafts.length]);

    const [suspPage, setSuspPage] = useState(1);
    const [suspPageSize, setSuspPageSize] = useState(15);
    const suspTotal = suspendedBills.length;
    const suspStart = suspTotal ? (suspPage - 1) * suspPageSize + 1 : 0;
    const suspEnd = suspTotal ? Math.min(suspPage * suspPageSize, suspTotal) : 0;
    const suspTotalPages = Math.max(1, Math.ceil(suspTotal / suspPageSize));
    const suspItems = suspendedBills.slice((suspPage - 1) * suspPageSize, suspPage * suspPageSize);
    useEffect(() => { setSuspPage(1); }, [drafts.length]);

    const DraftCard = ({ title, description, list, range, onPrev, onNext, disablePrev, disableNext }) => (
        <Card className="glass-effect">
            <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2"><FileText className="w-6 h-6 text-primary" /> {title}</CardTitle>
                  <Button variant="outline" size="sm" onClick={fetchDrafts} disabled={isLoading}>{isLoading ? 'Refreshing…' : 'Refresh'}</Button>
                </div>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4 max-h-[36rem] overflow-y-auto pr-2">
                    {list.length > 0 ? list.map(draft => (
                        <div key={draft.id} className={`p-4 rounded-lg border ${title.includes('Suspended') ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' : 'bg-background/50' } flex justify-between items-center`}>
                            <div>
                                <p className="font-bold">{draft.name}</p>
                                <p className="text-sm text-muted-foreground">
                                    {Array.isArray(draft.cart) ? draft.cart.length : (Number(draft.itemCount||0))} items - {draft.service || draft.serviceType || '-'}
                                    {draft.table && ` - Table: ${draft.table.name || draft.table}`}
                                    {title.includes('Suspended') && ` - Total: $${Number(draft.total||0).toFixed(2)}`}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1"><Calendar className="w-3 h-3 mr-1.5 inline" />{new Date(draft.updatedAt || draft.createdAt || Date.now()).toLocaleString()}</p>
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

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
            {/* Lightweight modals for View and Return All */}
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
        </div>
    );
};

const SellReturnList = ({ user }) => {
    const [returns, setReturns] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(15);

    const fetchReturns = async () => {
        setIsLoading(true);
        try {
            const branchId = user?.branchId || user?.branch?.id;
            const resp = await api.orders?.list?.(branchId ? { branchId } : {});
            const list = Array.isArray(resp?.items) ? resp.items : (Array.isArray(resp) ? resp : []);
            const filtered = list.filter(o => {
                const status = String(o?.status || '').toUpperCase();
                const flagged = o?.refunded === true || Number(o?.refundTotal || o?.refundedAmount || 0) > 0;
                const negativeTotal = Number(o?.totalAmount ?? o?.total ?? 0) < 0;
                const type = String(o?.type || '').toUpperCase();
                return status === 'REFUNDED' || status === 'CANCELLED' || flagged || negativeTotal || type === 'RETURN';
            });
            setReturns(filtered);
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

    return (
        <Card className="glass-effect">
            <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2"><RotateCcw className="w-6 h-6 text-primary" /> Sales Returns</CardTitle>
                  <Button variant="outline" size="sm" onClick={fetchReturns} disabled={isLoading}>{isLoading ? 'Refreshing…' : 'Refresh'}</Button>
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
                            return (<p className="font-semibold">#{label}</p>);
                          })()}
                          <p className="text-sm text-muted-foreground">{new Date(ret.createdAt || ret.updatedAt || ret.id).toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">- {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(Math.abs(Number(ret.refundTotal ?? ret.refundedAmount ?? ret.totalAmount ?? ret.total ?? 0)))}</p>
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

const DiscountList = ({ setActiveTab, user }) => {
    const [appliedDiscounts, setAppliedDiscounts] = useState([]);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(15);

    useEffect(() => {
        (async () => {
            try {
                // Prefer a discounts report if available
                let list = [];
                if (api.reports?.discounts?.list) {
                    const res = await api.reports.discounts.list({ branchId: user?.branchId });
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
                const res = await api.orders?.list?.(user?.branchId ? { branchId: user.branchId, limit: 200 } : { limit: 200 });
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
    }, [user?.branchId]);

    const total = appliedDiscounts.length;
    const start = total ? (page - 1) * pageSize + 1 : 0;
    const end = total ? Math.min(page * pageSize, total) : 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const pageItems = appliedDiscounts.slice((page - 1) * pageSize, page * pageSize);
    useEffect(() => { setPage(1); }, [appliedDiscounts.length]);

    return (
        <Card className="glass-effect">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Percent className="w-6 h-6 text-primary" /> Applied Discounts</CardTitle>
                <CardDescription>A log of all discounts applied to sales.</CardDescription>
            </CardHeader>
            <CardContent>
                {pageItems.length > 0 ? (
                    <div className="space-y-3 h-[36rem] overflow-y-auto pr-2">
                        {pageItems.map((discount, index) => (
                            <div key={index} className="p-3 rounded-lg border bg-background/50 flex justify-between items-center">
                                <div>
                                    <p className="font-semibold">{discount.discountName}</p>
                                    <p className="text-sm text-muted-foreground">Sale #{discount.saleId} by {discount.cashier}</p>
                                    <p className="text-xs text-muted-foreground mt-1"><Calendar className="w-3 h-3 mr-1.5 inline" />{new Date(discount.date).toLocaleString()}</p>
                                </div>
                                <p className="font-bold text-lg text-destructive">-${discount.discountAmount.toFixed(2)}</p>
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
