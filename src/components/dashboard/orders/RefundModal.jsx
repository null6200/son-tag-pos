import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Undo2, X } from 'lucide-react';

const RefundModal = ({ order, isOpen, onClose, onConfirm }) => {
  const [reason, setReason] = useState('');

  if (!order) return null;

  const handleConfirm = () => {
    onConfirm(order.id, reason);
  };

  const invoiceLabel = (() => {
    const raw = order.displayInvoice || order.invoice_no || order.invoiceNo || order.receiptNo || (order.orderNumber != null ? String(order.orderNumber) : null) || (order.id && order.id.slice ? order.id.slice(0,8) : String(order.id));
    if (order.orderNumber != null) return `INV${String(order.orderNumber).padStart(3,'0')}`;
    const s = String(raw || '');
    if (/^inv/i.test(s)) return s;
    if (/^\d+$/.test(s)) return `INV${String(Number(s)).padStart(3,'0')}`;
    return s;
  })();
  const total = Number(order.total ?? order.totalAmount ?? 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md glass-effect">
        <DialogHeader>
          <DialogTitle className="text-amber-600 text-2xl">Process Refund</DialogTitle>
          <DialogDescription>
            Confirm refund for order #{invoiceLabel} totaling ${total.toFixed(2)}. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="my-4 space-y-4">
          <div>
            <Label htmlFor="refund-reason">Reason for Refund (Optional)</Label>
            <Input
              id="refund-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Customer dissatisfaction"
            />
          </div>
          <div className="p-4 bg-amber-100/50 dark:bg-amber-900/30 rounded-lg border border-amber-300 dark:border-amber-700">
            <p className="text-sm text-amber-800 dark:text-amber-300">
              Refunding this order will mark it as 'Refunded' and restock the items in your inventory.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose} variant="outline">
            <X className="mr-2 h-4 w-4" /> Cancel
          </Button>
          <Button onClick={handleConfirm} className="bg-amber-600 hover:bg-amber-700 text-white">
            <Undo2 className="mr-2 h-4 w-4" /> Confirm Refund
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RefundModal;