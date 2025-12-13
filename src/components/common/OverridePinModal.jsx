import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

// Props:
// - open: boolean
// - onClose: fn()
// - onConfirm: fn({ userId: string, pin: string })
// - title?: string
// - description?: string
// - users?: Array<{ id: string; name: string }>
// - branchId?: string (used to fetch users if not provided)
const OverridePinModal = ({ open, onClose, onConfirm, title = 'Override Required', description = 'Enter override PIN to confirm this action.', users = [], branchId }) => {
  const [pin, setPin] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [overrideUsers, setOverrideUsers] = useState([]);
  const [hasLoadedUsers, setHasLoadedUsers] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Fetch users with override roles (admin, accountant, manager, supervisor) when modal opens
  useEffect(() => {
    // If users prop is provided and has items, use it
    if (users && users.length > 0) {
      setOverrideUsers(users);
      setHasLoadedUsers(true);
      return;
    }
    
    // Only fetch if modal is open and we haven't loaded yet
    if (!open || hasLoadedUsers) return;
    
    (async () => {
      try {
        if (!branchId) { setOverrideUsers([]); return; }
        const list = await api.users.list({ branchId });
        const rows = Array.isArray(list) ? list : [];
        // Filter users with override roles: admin, accountant, manager, supervisor
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
  }, [open, branchId, users?.length, hasLoadedUsers]);

  useEffect(() => {
    if (!open) {
      setPin('');
      setSelectedUserId('');
      setIsVerifying(false);
    }
  }, [open]);

  // Determine which users list to display
  const displayUsers = (users && users.length > 0) ? users : overrideUsers;

  // Auto-verify when user is selected and 5-digit PIN is entered
  useEffect(() => {
    if (selectedUserId && /^\d{5}$/.test(pin) && !isVerifying && onConfirm) {
      setIsVerifying(true);
      const selectedUser = (displayUsers || []).find(u => u.id === selectedUserId);
      onConfirm({ userId: selectedUserId, pin, userName: selectedUser?.name || selectedUser?.username || '' });
    }
  }, [pin, selectedUserId]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">Select authorizing user</label>
            <select
              className="w-full border rounded px-2 py-1 bg-background text-foreground"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
            >
              <option value="">Choose user...</option>
              {(displayUsers || []).map(u => (
                <option key={u.id} value={u.id}>{u.name || u.username || u.id}</option>
              ))}
            </select>
          </div>
          <Input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => { setPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 5)); setIsVerifying(false); }}
            placeholder="•••••"
            className="text-center tracking-widest"
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => {
            const selectedUser = (displayUsers || []).find(u => u.id === selectedUserId);
            onConfirm({ userId: selectedUserId, pin, userName: selectedUser?.name || selectedUser?.username || '' });
          }} disabled={!selectedUserId || !pin}>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OverridePinModal;
