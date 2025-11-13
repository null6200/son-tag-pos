import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';

const PinModal = ({ isOpen, onClose, onSuccess, user }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [graceWindow, setGraceWindow] = useState(0);
  const [gracePeriodActive, setGracePeriodActive] = useState(false);
  const [graceTimer, setGraceTimer] = useState(null);

  useEffect(() => {
    // No local override. Backend is source of truth.
    setGraceWindow(0);
  }, []);

  useEffect(() => {
    if (gracePeriodActive) {
      const timer = setTimeout(() => {
        setGracePeriodActive(false);
        toast({ title: "Grace Period Expired", description: "PIN required for next action." });
      }, graceWindow * 1000);
      setGraceTimer(timer);
    } else {
      if (graceTimer) clearTimeout(graceTimer);
    }
    return () => {
      if (graceTimer) clearTimeout(graceTimer);
    };
  }, [gracePeriodActive, graceWindow]);

  const handlePinChange = (value) => {
    if (pin.length < 4) {
      setPin(pin + value);
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
  };

  const handleVerify = async () => {
    if (gracePeriodActive) {
      onSuccess();
      return;
    }
    try {
      const branchId = user?.branchId || user?.branch?.id || undefined;
      const res = await api.hrm.overridePin.verify({ branchId, pin });
      if (!res || res.ok !== true) throw new Error('Invalid PIN');
      toast({ title: 'PIN Accepted!', variant: 'default' });
      const seconds = Number(res.graceSeconds || 0);
      if (seconds > 0) {
        setGraceWindow(seconds);
        setGracePeriodActive(true);
      }
      onSuccess();
      closeModal();
    } catch (e) {
      setError('Invalid PIN. Please try again.');
      setPin('');
      toast({ title: 'Invalid PIN', variant: 'destructive' });
    }
  };

  const closeModal = () => {
    setPin('');
    setError('');
    onClose();
  };

  useEffect(() => {
    if (isOpen && gracePeriodActive) {
      onSuccess();
      closeModal();
    }
  }, [isOpen, gracePeriodActive]);

  if (isOpen && gracePeriodActive) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={closeModal}>
      <DialogContent className="sm:max-w-[425px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground text-2xl">Global Override Required</DialogTitle>
          <DialogDescription>
            Please enter the global override PIN to authorize this action.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col space-y-4 py-4">
          <Input
            type="password"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="••••"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, '').slice(0,4))}
            onKeyDown={(e) => { if (e.key === 'Enter') handleVerify(); if (e.key === 'Backspace') setError(''); }}
            className="text-center tracking-widest text-xl"
          />
          {error && <p className="text-destructive text-sm text-center">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={closeModal}>Cancel</Button>
          <Button onClick={handleVerify} disabled={pin.length !== 4}>OK</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PinModal;