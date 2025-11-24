import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ListOrdered, Clock, CheckCircle, RefreshCw, XCircle, MoreVertical, Eye, Printer, Coins as HandCoins, Undo2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import OrderDetailsModal from '@/components/dashboard/orders/OrderDetailsModal';
import RefundModal from '@/components/dashboard/orders/RefundModal';
import PrintView from '@/components/pos/PrintView';
import { api } from '@/lib/api';

const OrderManagement = ({ user }) => {
  const [orders, setOrders] = useState([]);
  const [viewingOrder, setViewingOrder] = useState(null);
  const [refundingOrder, setRefundingOrder] = useState(null);
  const [printData, setPrintData] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  const printRef = useRef();

  useEffect(() => {
    const load = async () => {
      try {
        if (!user?.branchId) { setOrders([]); setTotalCount(0); return; }
        const res = await api.orders.list({ branchId: user.branchId, page, pageSize });
        const items = Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : []);
        const total = typeof res?.total === 'number' ? res.total : items.length;
        setOrders(items || []);
        setTotalCount(total || 0);
      } catch (_) {
        setOrders([]);
        setTotalCount(0);
      }
    };
    load();
  }, [user?.branchId, page, pageSize]);

  const refreshOrders = async () => {
    if (!user?.branchId) { setOrders([]); setTotalCount(0); return; }
    const res = await api.orders.list({ branchId: user.branchId, page: 1, pageSize });
    const items = Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : []);
    const total = typeof res?.total === 'number' ? res.total : items.length;
    setOrders(items || []);
    setTotalCount(total || 0);
    setPage(1);
  };

  const handleConfirmRefund = async (orderId, reason) => {
    try {
      await api.orders.refund(orderId);
      await refreshOrders();
      setRefundingOrder(null);
      toast({ title: 'Refund Processed', description: `Order ${orderId} refunded and stock updated.` });
    } catch (e) {
      toast({ title: 'Refund failed', description: String(e?.message || e), variant: 'destructive' });
    }
  };

  const getStatusVisuals = (status) => {
    switch (status) {
      case 'Paid':
        return { icon: CheckCircle, color: 'text-green-500', bgColor: 'bg-green-100 dark:bg-green-900/50' };
      case 'Pending':
        return { icon: Clock, color: 'text-orange-500', bgColor: 'bg-orange-100 dark:bg-orange-900/50' };
      case 'Cancelled':
        return { icon: XCircle, color: 'text-red-500', bgColor: 'bg-red-100 dark:bg-red-900/50' };
      case 'Refunded':
        return { icon: Undo2, color: 'text-amber-600', bgColor: 'bg-amber-100 dark:bg-amber-900/50' };
      default:
        return { icon: RefreshCw, color: 'text-blue-500', bgColor: 'bg-blue-100 dark:bg-blue-900/50' };
    }
  };

  const pageCount = Math.max(1, Math.ceil((totalCount || 0) / pageSize));
  const safePage = Math.min(page, pageCount);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = startIndex + (orders?.length || 0);

  return (
    <>
      {printData && (
        <PrintView ref={printRef} type={printData.type} data={printData.data} />
      )}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold gradient-text mb-2">Order Management</h2>
            <p className="text-gray-600 dark:text-gray-400">View and manage all customer orders</p>
          </div>
        </div>
        
        <Card className="glass-effect border-2 border-white/30 dark:border-slate-700/50">
          <CardHeader>
            <CardTitle className="gradient-text">All Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {orders.map((order, index) => {
                const rawStatus = String(order.status || '');
                const statusUpper = rawStatus.toUpperCase();
                const statusLabel = statusUpper === 'PAID' ? 'Paid' : (statusUpper === 'CANCELLED' ? 'Refunded' : rawStatus);
                const { icon: Icon, color, bgColor } = getStatusVisuals(statusLabel);
                const invoice = order.displayInvoice || order.invoice_no || order.invoiceNo || order.receiptNo || (order.orderNumber ? `#${order.orderNumber}` : null) || order.id;
                const sectionName = order.sectionName || order.section?.name;
                const branchName = order.branchName || order.branch?.name;
                return (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 rounded-xl bg-white/60 dark:bg-slate-800/30 border border-white/30 dark:border-slate-700/50 hover:bg-white/80 dark:hover:bg-slate-800/60 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-lg ${bgColor} flex items-center justify-center`}>
                          <ListOrdered className={`w-6 h-6 ${color}`} />
                        </div>
                        <div>
                          <p className="font-bold text-gray-800 dark:text-gray-200 text-lg">{invoice}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(order.createdAt || order.timestamp).toLocaleString()}</p>
                          {(branchName || sectionName) && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">{branchName ? `${branchName}` : ''}{branchName && sectionName ? ' • ' : ''}{sectionName ? `${sectionName}` : ''}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                         <p className="font-bold gradient-text text-xl">${(parseFloat(String(order.total ?? 0)) || 0).toFixed(2)}</p>
                         <div className="flex items-center justify-end gap-2 mt-1">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${bgColor} ${color}`}>{statusLabel}</span>
                            {order.staff && <span className="text-xs text-gray-500 dark:text-gray-400">by {order.staff}</span>}
                         </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-5 h-5"/>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewDetails(order)}>
                                <Eye className="mr-2 h-4 w-4" />
                                <span>View Details</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handlePrintReceipt(order)}>
                                <Printer className="mr-2 h-4 w-4" />
                                <span>Print Receipt</span>
                            </DropdownMenuItem>
                            {(['Paid','PAID'].includes(rawStatus)) && (
                              <DropdownMenuItem onClick={() => setRefundingOrder(order)} className="text-amber-600 focus:text-amber-600">
                                  <HandCoins className="mr-2 h-4 w-4" />
                                  <span>Process Refund</span>
                              </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {totalCount > 0 && (
              <div className="flex flex-col md:flex-row items-center justify-between gap-3 mt-6 pt-4 border-t">
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <span>
                    Showing {startIndex + 1}–{Math.min(endIndex, totalCount)} of {totalCount} orders
                  </span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      const next = parseInt(e.target.value, 10) || 10;
                      setPageSize(next);
                      setPage(1);
                    }}
                    className="h-8 rounded-md border bg-background px-2 text-xs"
                  >
                    <option value={10}>10 / page</option>
                    <option value={20}>20 / page</option>
                    <option value={50}>50 / page</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={safePage <= 1}
                  >
                    Prev
                  </Button>
                  {(() => {
                    const buttons = [];
                    const windowSize = 3;
                    const start = Math.max(1, safePage - windowSize);
                    const end = Math.min(pageCount, safePage + windowSize);
                    if (start > 1) {
                      buttons.push(
                        <Button
                          key={1}
                          variant={safePage === 1 ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setPage(1)}
                        >
                          1
                        </Button>
                      );
                      if (start > 2) buttons.push(<span key="left-ellipsis" className="px-1">…</span>);
                    }
                    for (let i = start; i <= end; i++) {
                      buttons.push(
                        <Button
                          key={i}
                          variant={safePage === i ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setPage(i)}
                        >
                          {i}
                        </Button>
                      );
                    }
                    if (end < pageCount) {
                      if (end < pageCount - 1) buttons.push(<span key="right-ellipsis" className="px-1">…</span>);
                      buttons.push(
                        <Button
                          key={pageCount}
                          variant={safePage === pageCount ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setPage(pageCount)}
                        >
                          {pageCount}
                        </Button>
                      );
                    }
                    return buttons;
                  })()}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => (p < pageCount ? p + 1 : p))}
                    disabled={safePage >= pageCount}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {viewingOrder && (
          <OrderDetailsModal
            order={viewingOrder}
            isOpen={!!viewingOrder}
            onClose={() => setViewingOrder(null)}
          />
        )}

        {refundingOrder && (
          <RefundModal
            order={refundingOrder}
            isOpen={!!refundingOrder}
            onClose={() => setRefundingOrder(null)}
            onConfirm={handleConfirmRefund}
          />
        )}
      </div>
    </>
  );
};

export default OrderManagement;