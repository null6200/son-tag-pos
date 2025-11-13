import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// mode: 'setup' | 'verify'
// For setup: onSave(pin)
// For verify: onVerify(pin)
// Provide existingPins (array of strings) for uniqueness check in setup
const ServiceStaffPinModal = ({ open, mode = 'setup', onClose, onSave, onVerify, existingPins = [] }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) { setPin(''); setError(''); }
  }, [open]);

  const isThreeDigits = (v) => /^\d{3}$/.test(v);
  const isUnique = useMemo(() => {
    if (!isThreeDigits(pin)) return false;
    return !existingPins.includes(pin);
  }, [pin, existingPins]);

  const handleAutoGenerate = () => {
    // Try up to 50 times to find a unique 3-digit pin
    for (let i = 0; i < 50; i++) {
      const v = String(Math.floor(100 + Math.random() * 900));
      if (!existingPins.includes(v)) { setPin(v); setError(''); return; }
    }
    setError('Unable to generate a unique PIN. Please enter one manually.');
  };

  const handleSave = () => {
    if (!isThreeDigits(pin)) { setError('PIN must be exactly 3 digits.'); return; }
    if (mode === 'setup' && !isUnique) { setError('PIN already in use. Please choose another.'); return; }
    if (mode === 'setup' && onSave) onSave(pin);
    if (mode === 'verify' && onVerify) onVerify(pin);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{mode === 'setup' ? 'Set Service Staff PIN' : 'Enter Service Staff PIN'}</DialogTitle>
          <DialogDescription>
            {mode === 'setup' ? 'Assign a unique 3-digit PIN to this service staff.' : 'Enter the 3-digit PIN to verify this action.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-4 items-center gap-3">
            <Label htmlFor="pin" className="text-right">PIN</Label>
            <Input
              id="pin"
              type="password"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={pin}
              onChange={(e) => { setPin(e.target.value.replace(/[^0-9]/g, '').slice(0,3)); setError(''); }}
              placeholder="•••"
              className="col-span-3 text-center tracking-widest"
            />
          </div>
          {error && <div className="text-sm text-destructive">{error}</div>}
        </div>
        <DialogFooter className="flex items-center justify-between gap-2">
          {mode === 'setup' && (
            <Button type="button" variant="outline" onClick={handleAutoGenerate}>Auto Generate</Button>
          )}
          <div className="ml-auto flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="button" onClick={handleSave}>{mode === 'setup' ? 'Save PIN' : 'Verify'}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ServiceStaffPinModal;
