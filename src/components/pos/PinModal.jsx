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

const PinModal = ({ isOpen, onClose, onSuccess, user, users }) => {
  const [pin, setPin] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [error, setError] = useState('');
  const [graceWindow, setGraceWindow] = useState(0);
  const [gracePeriodActive, setGracePeriodActive] = useState(false);
  const [graceTimer, setGraceTimer] = useState(null);
  const [overrideUsers, setOverrideUsers] = useState([]);
  const [hasLoadedUsers, setHasLoadedUsers] = useState(false);

  // PERFORMANCE FIX: Only load users once when modal opens, not on every render
  // The previous code had `users = []` default which created new array each render
  useEffect(() => {
    // If users prop is provided and has items, use it
    if (users && users.length > 0) {
      setOverrideUsers(users);
      setHasLoadedUsers(true);
      return;
    }
    
    // Only fetch if modal is open and we haven't loaded yet
    if (!isOpen || hasLoadedUsers) return;
    
    (async () => {
      try {
        if (!user?.branchId) { setOverrideUsers([]); return; }
        const list = await api.users.list({ branchId: user.branchId });
        const rows = Array.isArray(list) ? list : [];
        // Check both appRole.name (custom roles) and role (system role like ADMIN)
        const candidates = rows.filter(u => {
          const appRoleName = u.appRole?.name || '';
          const systemRole = u.role || '';
          const combined = `${appRoleName} ${systemRole}`.toLowerCase();
          return combined.includes('manager') || combined.includes('supervisor') || combined.includes('admin') || combined.includes('accountant');
        });
        setOverrideUsers(candidates.map(u => ({
          id: u.id,
          name: u.username || u.firstName || u.surname || u.email || `user-${u.id}`,
        })));
        setHasLoadedUsers(true);
      } catch { setOverrideUsers([]); }
    })();
  }, [isOpen, user?.branchId, users?.length, hasLoadedUsers]);

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
    if (!selectedUserId) {
      setError('Please select a supervisor.');
      return;
    }
    try {
      const branchId = user?.branchId || user?.branch?.id || undefined;
      const res = await api.hrm.overridePin.verifyUser({ userId: selectedUserId, branchId, pin });
      if (!res || res.ok !== true) throw new Error('Invalid PIN');
      const authorizerName = overrideUsers.find(u => u.id === selectedUserId)?.name || selectedUserId;
      toast({ title: 'PIN Accepted!', description: `Authorized by ${authorizerName}`, variant: 'default' });
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
          <DialogTitle className="text-foreground text-2xl">Supervisor Override Required</DialogTitle>
          <DialogDescription>
            Select a supervisor and enter their override PIN to authorize this action.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col space-y-4 py-4">
          <select
            className="w-full border rounded px-3 py-2 bg-background text-foreground"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
          >
            <option value="">Choose supervisor...</option>
            {(overrideUsers || []).map(u => (
              <option key={u.id} value={u.id}>{u.name || u.id}</option>
            ))}
          </select>
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
          <Button onClick={handleVerify} disabled={!selectedUserId || pin.length !== 4}>OK</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PinModal;