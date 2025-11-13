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
  const printRef = useRef();

  useEffect(() => {
    const load = async () => {
      try {
        if (!user?.branchId) { setOrders([]); return; }
        const rows = await api.orders.list({ branchId: user.branchId });
        setOrders(rows || []);
      } catch (_) {
        setOrders([]);
      }
    };
    load();
  }, [user?.branchId]);

  const refreshOrders = async () => {
    if (!user?.branchId) { setOrders([]); return; }
    const rows = await api.orders.list({ branchId: user.branchId });
    setOrders(rows || []);
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

  // Auto-print when printData is set
  useEffect(() => {
    if (printData) {
      const t = setTimeout(() => {
        try { window.print(); } catch {}
        setPrintData(null);
      }, 100);
      return () => clearTimeout(t);
    }
  }, [printData]);

  const handleViewDetails = async (order) => {
    try {
      const full = await api.orders.get(String(order.id));
      setViewingOrder({ ...order, ...(full || {}) });
    } catch (_) {
      setViewingOrder(order);
    }
  };

  const handlePrintReceipt = async (order) => {
    try {
      const full = await api.orders.get(String(order.id));
      setPrintData({ type: 'final-receipt', data: { ...(full || order), isReceipt: true } });
    } catch (_) {
      setPrintData({ type: 'final-receipt', data: { ...order, isReceipt: true } });
      toast({ title: 'Printing with limited data', description: 'Full order could not be loaded.' });
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