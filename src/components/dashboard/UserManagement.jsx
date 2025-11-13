import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, UserPlus, Shield, Edit, Trash2, Check, X as XIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { api } from '@/lib/api';
import { hasPermission } from '@/lib/permissions';
import ServiceStaffPinModal from '@/components/common/ServiceStaffPinModal';

const UserManagement = ({ user }) => {
  const [users, setUsers] = useState([]);
  const [appRoles, setAppRoles] = useState([]);
  const [branches, setBranches] = useState([]);
  const [sections, setSections] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [existingPins, setExistingPins] = useState([]);
  const [currentBranchId, setCurrentBranchId] = useState('');

  // Load branches and derive current branch id
  useEffect(() => {
    (async () => {
      try {
        const bs = await api.branches.list();
        const arr = Array.isArray(bs) ? bs : [];
        setBranches(arr || []);
        const initial = (user?.branchId || user?.branch?.id) || (arr[0]?.id || '');
        setCurrentBranchId(prev => prev || initial);
      } catch {}
    })();
  }, [user?.branchId, user?.branch?.id]);

  useEffect(() => {
    const load = async () => {
      try {
        const bid = currentBranchId || user?.branchId || user?.branch?.id;
        if (!bid) return;
        const list = await api.users.list({ branchId: bid, includeArchived: showArchived });
        setUsers(list || []);
        try {
          const pins = (list || []).map(u => String(u.service_pin || '')).filter(Boolean);
          setExistingPins(pins);
        } catch { setExistingPins([]); }
        const r = await api.roles.list({ branchId: bid, includeArchived: false });
        setAppRoles(r || []);
        const ss = await api.sections.list({ branchId: bid });
        setSections(Array.isArray(ss) ? ss : []);
      } catch (e) {
        toast({ title: 'Failed to load users', description: String(e?.message || e), variant: 'destructive' });
      }
    };
    load();
  }, [currentBranchId, user?.branchId, user?.branch?.id, showArchived]);

  const saveUsers = (updatedUsers) => {
    setUsers(updatedUsers);
  };

  const handleAddUser = () => {
    setEditingUser(null);
    setIsModalOpen(true);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };
  
  const refresh = async () => {
    const bid = currentBranchId || user?.branchId || user?.branch?.id;
    if (!bid) return;
    try {
      const list = await api.users.list({ branchId: bid, includeArchived: showArchived });
      setUsers(list || []);
    } catch {}
  };

  const handleDeleteUser = async (userId) => {
    try {
      const resp = await api.users.remove(userId);
      if (resp && resp.archived) {
        // if user had history, it was archived
        const updated = users.map(u => u.id === userId ? { ...u, archived: true } : u);
        setUsers(updated);
        toast({ title: 'User Archived', description: 'User has records and was archived instead of deleted.' });
      } else {
        // removed completely
        const remaining = users.filter(u => u.id !== userId);
        setUsers(remaining);
        toast({ title: 'User Deleted', description: 'User removed permanently.' });
      }
    } catch (e) {
      toast({ title: 'Delete failed', description: String(e?.message || e), variant: 'destructive' });
    }
  };

  const handleSaveUser = async (userData) => {
    const dto = {
      username: userData.username,
      email: userData.email,
      password: userData.allowLogin ? userData.password : undefined,
      // Only set role on create. For edits, omit role unless explicitly provided.
      ...(editingUser ? {} : { role: userData.role || 'CASHIER' }),
      branchId: userData.branchId || currentBranchId || user?.branchId || undefined,
      firstName: userData.firstName || undefined,
      surname: userData.surname || undefined,
      phone: userData.phone || undefined,
      isServiceStaff: !!userData.isServiceStaff,
      servicePinEnabled: !!userData.isServiceStaff && !!userData.enableServicePin,
      servicePin: userData.isServiceStaff && userData.enableServicePin ? userData.servicePin : undefined,
      appRoleId: (userData.appRoleId === '' ? null : userData.appRoleId) ?? undefined,
      allowLogin: !!userData.allowLogin,
      isActive: !!userData.isActive,
      accessAllSections: !!userData.accessAllSections,
      accessSectionIds: Array.isArray(userData.accessSectionIds) ? userData.accessSectionIds : [],
      prefix: userData.prefix || undefined,
    };
    try {
      if (editingUser) {
        await api.users.update(editingUser.id, dto);
        toast({ title: 'User Updated', description: 'User details have been saved.' });
      } else {
        if (userData.allowLogin && !userData.password) {
          toast({ title: 'Password required', description: 'Please set a password for the new user.', variant: 'destructive' });
          return;
        }
        const created = await api.users.create(dto);
        toast({ title: 'User Added', description: 'A new user has been created.' });
      }
      setIsModalOpen(false);
      await refresh();
    } catch (e) {
      toast({ title: 'Save failed', description: String(e?.message || e), variant: 'destructive' });
    }
  };

  const getRoleColor = () => 'from-purple-500 to-pink-600';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold gradient-text mb-2">User Management</h2>
          <p className="text-gray-600">Manage your team, roles, and access levels</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Label className="text-sm">Branch</Label>
            <select value={currentBranchId} onChange={(e) => setCurrentBranchId(e.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm min-w-[12rem]">
              {branches.map(b => (<option key={b.id} value={b.id}>{b.name}</option>))}
            </select>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Label htmlFor="show-archived">Show Archived</Label>
            <Switch id="show-archived" checked={showArchived} onCheckedChange={setShowArchived} />
          </div>
          <Button onClick={handleAddUser} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 gap-2">
            <UserPlus className="w-4 h-4" />
            Add User
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.filter(u => showArchived ? true : !u.archived).map((user, index) => {
            return (
          <motion.div
            key={user.id}
            whileHover={{ scale: 1.02 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="glass-effect border-2 border-white/30 flex flex-col h-full">
              <CardHeader className="overflow-hidden">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${getRoleColor()} flex items-center justify-center shadow-lg`}>
                    <Users className="w-7 h-7 text-white" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-lg truncate">{user.firstName || ''} {user.surname || ''}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Shield className="w-3 h-3 text-gray-500" />
                      <span className="text-xs text-gray-500">{user.appRole?.name || 'Staff'}</span>
                      {user.archived && <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-300">Archived</span>}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between">
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Username:</span>
                    <span className="font-semibold">{user.username}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Branch:</span>
                    <span className="font-semibold">{(branches.find(b => b.id === user.branchId)?.name) || user.branchId || ''}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Service Staff:</span>
                    <span className="font-semibold">{user.isServiceStaff ? <Check className="w-4 h-4 text-green-500"/> : <XIcon className="w-4 h-4 text-red-500"/>}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">App Role:</span>
                    <span className="font-semibold">{user.appRole?.name || '—'}</span>
                  </div>
                </div>
                <div className="flex gap-2 pt-4 mt-2">
                  <Button onClick={() => handleEditUser(user)} variant="outline" size="sm" className="flex-1"><Edit className="w-3 h-3 mr-1.5" />Edit</Button>
                  <Button onClick={() => handleDeleteUser(user.id)} variant="destructive" size="sm" className="flex-1"><Trash2 className="w-3 h-3 mr-1.5" />Delete</Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )})}
      </div>
      <UserFormModal
    isOpen={isModalOpen}
    onClose={() => setIsModalOpen(false)}
    onSave={handleSaveUser}
    user={editingUser}
    appRoles={appRoles}
    branches={branches}
    sections={sections}
    branchId={currentBranchId || (user?.branchId || user?.branch?.id) || ''}
    existingPins={existingPins}
    onClearServicePin={async (uId) => { try { if (uId) await api.users.setPin(uId, null); } catch {} }}
    perms={user?.permissions || []}
    isAdmin={String(user?.role || '').toLowerCase() === 'admin'}
  />
    </div>
  );
};

const UserFormModal = ({ isOpen, onClose, onSave, user, appRoles, branches, sections = [], branchId = '', existingPins = [], onClearServicePin, perms = [], isAdmin = false }) => {
  const [formData, setFormData] = useState({
    prefix: '',
    firstName: '',
    surname: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    branchId: '',
    isActive: true,
    allowLogin: true,
    isServiceStaff: false,
    enableServicePin: false,
    appRoleId: '',
    servicePin: '',
    accessAllSections: true,
    accessSectionIds: [],
  });
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [sectionsData, setSectionsData] = useState(() => Array.isArray(sections) ? sections : []);

  useEffect(() => { setSectionsData(Array.isArray(sections) ? sections : []); }, [sections]);

  // Ensure sections are available when modal opens
  useEffect(() => {
    (async () => {
      if (!isOpen) return;
      try {
        if (!sectionsData || sectionsData.length === 0) {
          const ss = await api.sections.list(branchId ? { branchId } : {});
          setSectionsData(Array.isArray(ss) ? ss : []);
        }
      } catch (e) {
        try { toast({ title: 'Failed to load sections', description: String(e?.message || e), variant: 'destructive' }); } catch {}
      }
    })();
  }, [isOpen, branchId]);

  useEffect(() => {
    if (user) {
      setFormData({
        prefix: (user.preferences?.prefix) || '',
        firstName: user.firstName || '',
        surname: user.surname || '',
        username: user.username || '',
        email: user.email || '',
        phone: user.phone || '',
        password: user.password || '',
        confirmPassword: '',
        branchId: user.branchId || '',
        isActive: user.archived ? false : true,
        allowLogin: user.preferences?.allowLogin === false ? false : true,
        isServiceStaff: user.isServiceStaff || false,
        enableServicePin: !!(user.preferences?.servicePinEnabled),
        appRoleId: user.appRoleId || user.appRole?.id || '',
        servicePin: user.service_pin || '',
        accessAllSections: (user.preferences?.accessAllSections ?? user.preferences?.accessAllBranches) ?? true,
        accessSectionIds: (user.preferences?.accessSectionIds || user.preferences?.accessBranchIds) || [],
      });
    } else {
      setFormData({
        prefix: '',
        firstName: '',
        surname: '',
        username: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        branchId: '',
        isActive: true,
        allowLogin: true,
        isServiceStaff: false,
        enableServicePin: false,
        appRoleId: '',
        servicePin: '',
        accessAllSections: true,
        accessSectionIds: [],
      });
    }
  }, [user, isOpen]);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };
  
  const handleSwitchChange = (key) => async (checked) => {
    setFormData(prev => ({ ...prev, [key]: checked }));
    if (key === 'isServiceStaff') {
      if (checked) {
        setPinModalOpen(true);
      } else {
        setFormData(prev => ({ ...prev, servicePin: '', enableServicePin: false }));
        if (user?.id && typeof onClearServicePin === 'function') onClearServicePin(user.id);
      }
    }
    if (key === 'accessAllSections' && checked === false) {
      try {
        if (!sectionsData || sectionsData.length === 0) {
          const ss = await api.sections.list(branchId ? { branchId } : {});
          setSectionsData(Array.isArray(ss) ? ss : []);
        }
      } catch (e) {
        try { toast({ title: 'Failed to load sections', description: String(e?.message || e), variant: 'destructive' }); } catch {}
      }
    }
  };
  
  const handleSubmit = () => {
    if (formData.allowLogin) {
      if (user ? formData.password && formData.password !== formData.confirmPassword : formData.password !== formData.confirmPassword) {
        toast({ title: 'Password mismatch', description: 'Password and Confirm Password must match.', variant: 'destructive' });
        return;
      }
    }
    if (formData.isServiceStaff && formData.enableServicePin) {
      if (!/^\d{3,6}$/.test(formData.servicePin || '')) {
        toast({ title: 'PIN Required', description: 'Please set a 3–6 digit PIN for service staff.', variant: 'destructive' });
        return;
      }
      if (existingPins.includes(String(formData.servicePin)) && (!user || String(user.service_pin) !== String(formData.servicePin))) {
        toast({ title: 'PIN Not Unique', description: 'The PIN is already used by another user.', variant: 'destructive' });
        return;
      }
    }
    onSave(formData);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{user ? 'Edit User' : 'Add New User'}</DialogTitle>
          <DialogDescription>
            {user ? 'Update the details for this user.' : 'Fill in the details for the new user.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
          {/* Top section */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="prefix" className="text-right">Prefix</Label>
            <Input id="prefix" value={formData.prefix} onChange={handleChange} className="col-span-3" placeholder="Mr / Mrs / Miss" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="firstName" className="text-right">First Name</Label>
            <Input id="firstName" value={formData.firstName} onChange={handleChange} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="surname" className="text-right">Surname</Label>
            <Input id="surname" value={formData.surname} onChange={handleChange} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">Email</Label>
            <Input id="email" type="email" value={formData.email} onChange={handleChange} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Is Active?</Label>
            <div className="col-span-3 flex items-center gap-2">
              <Switch checked={formData.isActive} onCheckedChange={handleSwitchChange('isActive')} />
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Enable service staff pin</Label>
            <div className="col-span-3 flex items-center gap-2">
              <Switch checked={formData.enableServicePin} onCheckedChange={handleSwitchChange('enableServicePin')} />
            </div>
          </div>

          {/* Roles and Permissions */}
          <div className="pt-2 border-t" />
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Allow login</Label>
            <div className="col-span-3 flex items-center gap-2">
              <Switch checked={formData.allowLogin} onCheckedChange={handleSwitchChange('allowLogin')} />
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="username" className="text-right">Username</Label>
            <Input id="username" value={formData.username} onChange={handleChange} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="password" className="text-right">Password</Label>
            <Input id="password" type="password" value={formData.password} onChange={handleChange} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="confirmPassword" className="text-right">Confirm Password</Label>
            <Input id="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} className="col-span-3" />
          </div>
          {/* System role removed: we rely on App Role; backend defaults to CASHIER when creating */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Branch</Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="col-span-3 justify-start">
                  {branches.find(b => b.id === formData.branchId)?.name || 'Select a branch'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[--radix-dropdown-menu-trigger-width]">
                {(branches || []).map(b => (
                  <DropdownMenuItem key={b.id} onSelect={() => setFormData(prev => ({ ...prev, branchId: b.id }))}>
                    {b.name}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem onSelect={() => setFormData(prev => ({ ...prev, branchId: '' }))}>
                  None
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="isServiceStaff" className="text-right">Service Staff</Label>
            <div className="col-span-3 flex items-center gap-2">
              <Switch id="isServiceStaff" checked={formData.isServiceStaff} onCheckedChange={handleSwitchChange('isServiceStaff')} />
              {formData.isServiceStaff && (isAdmin || hasPermission(perms, 'edit_user')) && (
                <>
                  <Button type="button" variant="outline" size="sm" onClick={() => setPinModalOpen(true)}>Set/Reset PIN</Button>
                  {formData.servicePin && <span className="text-xs text-muted-foreground">Current PIN: ***</span>}
                </>
              )}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">App Role</Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="col-span-3 justify-start">
                  {appRoles.find(r => r.id === formData.appRoleId)?.name || 'Select a role'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[--radix-dropdown-menu-trigger-width]">
                {(appRoles || []).map(r => (
                  <DropdownMenuItem key={r.id} onSelect={() => setFormData(prev => ({ ...prev, appRoleId: r.id }))}>
                    {r.name}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem onSelect={() => setFormData(prev => ({ ...prev, appRoleId: '' }))}>
                  None
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Access sections */}
          <div className="grid grid-cols-4 items-start gap-4">
            <Label className="text-right">Access sections</Label>
            <div className="col-span-3 space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={formData.accessAllSections} onChange={(e) => handleSwitchChange('accessAllSections')(e.target.checked)} />
                <span className="font-semibold">ACCESS ALL SECTIONS</span>
              </label>
              {!formData.accessAllSections && (
                <div className="max-h-36 overflow-y-auto border rounded p-2">
                  {(!sectionsData || sectionsData.length === 0) && (
                    <div className="text-xs text-muted-foreground py-1">No sections found for this branch.</div>
                  )}
                  {(sectionsData || []).map(s => {
                    const checked = formData.accessSectionIds.includes(s.id);
                    return (
                      <label key={s.id} className="flex items-center gap-2 text-sm py-1">
                        <input type="checkbox" checked={checked} onChange={(e) => setFormData(prev => ({ ...prev, accessSectionIds: e.target.checked ? [...prev.accessSectionIds, s.id] : prev.accessSectionIds.filter(x => x !== s.id) }))} />
                        <span>{s.name}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
      <ServiceStaffPinModal
        open={pinModalOpen}
        mode="setup"
        existingPins={existingPins.filter(p => !user || String(user.service_pin) !== p)}
        onClose={() => setPinModalOpen(false)}
        onSave={(pin) => { setFormData(prev => ({ ...prev, servicePin: pin })); setPinModalOpen(false); }}
      />
    </Dialog>
  );
};

export default UserManagement;