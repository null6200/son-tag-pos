import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Props:
// - open: boolean
// - onClose: fn()
// - onConfirm: fn(pin: string)
// - title?: string
// - description?: string
const OverridePinModal = ({ open, onClose, onConfirm, title = 'Override Required', description = 'Enter Global Override PIN to confirm this action.' }) => {
  const [pin, setPin] = useState('');

  useEffect(() => {
    if (!open) setPin('');
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Enter PIN"
            className="text-center tracking-widest"
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onConfirm(pin)}>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OverridePinModal;
