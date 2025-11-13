import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { X } from 'lucide-react';

const OrderDetailsModal = ({ order, isOpen, onClose }) => {
  if (!order) return null;

  const createdAt = order.createdAt || order.timestamp || order.updatedAt || Date.now();
  const staff = order.cashier || order.userName || order.user?.username || order.staff;
  const items = Array.isArray(order.items) ? order.items : [];
  const total = Number(order.total ?? order.totalAmount ?? 0);
  const invoiceLabel = (() => {
    const raw = order.displayInvoice || order.invoice_no || order.invoiceNo || order.receiptNo || (order.orderNumber != null ? String(order.orderNumber) : null) || (order.id && order.id.slice ? order.id.slice(0,8) : String(order.id));
    if (order.orderNumber != null) return `INV${String(order.orderNumber).padStart(3,'0')}`;
    const s = String(raw || '');
    if (/^inv/i.test(s)) return s;
    if (/^\d+$/.test(s)) return `INV${String(Number(s)).padStart(3,'0')}`;
    return s;
  })();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg glass-effect">
        <DialogHeader>
          <DialogTitle className="gradient-text text-2xl">Order Details - #{invoiceLabel}</DialogTitle>
          <DialogDescription>
            {new Date(createdAt).toLocaleString()} {staff ? `by ${staff}` : ''}
          </DialogDescription>
        </DialogHeader>
        <div className="my-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-semibold">Status</p>
              <p>{order.status}</p>
            </div>
            <div>
              <p className="font-semibold">Payment Method</p>
              <p>{order.paymentMethod || order.paymentDetails?.method || '-'}</p>
            </div>
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-center">Qty</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => {
                const name = item?.name || item?.product?.name || item?.title || item?.productName || '';
                const qty = Number(item?.qty ?? item?.quantity ?? 0);
                const price = Number(item?.price ?? item?.unitPrice ?? 0);
                const sub = price * qty;
                return (
                <TableRow key={index}>
                  <TableCell>{name}</TableCell>
                  <TableCell className="text-center">{qty}</TableCell>
                  <TableCell className="text-right">${price.toFixed(2)}</TableCell>
                  <TableCell className="text-right">${sub.toFixed(2)}</TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <div className="flex justify-end items-center text-lg font-bold">
            <span className="text-muted-foreground mr-4">Total:</span>
            <span className="gradient-text">${total.toFixed(2)}</span>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose} variant="outline">
            <X className="mr-2 h-4 w-4" /> Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OrderDetailsModal;