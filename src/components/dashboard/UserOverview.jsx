import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';
import { RequirePermission, hasPermission } from '@/lib/permissions';

const UserOverview = ({ users: initialUsers, branchId, user, perms: permsProp, onAddUser, onEditUser, onDeactivateUser, onDeleteUser }) => {
  const [users, setUsers] = useState(() => Array.isArray(initialUsers) ? initialUsers : []);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  // Dynamic pagination: page 1 = 10 rows, subsequent pages = 20 rows
  const pageSize = page === 1 ? 10 : 20;

  const [editUser, setEditUser] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', email: '', password: '', appRoleId: '' });
  const [roleOptions, setRoleOptions] = useState([]); // {id,name}[]
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null });
  const perms = Array.isArray(permsProp) ? permsProp : (user?.permissions || []);
  const isAdmin = user?.role === 'ADMIN';
  const canView = useMemo(() => isAdmin || hasPermission(perms, 'view_user'), [isAdmin, perms]);

  useEffect(() => {
    if (Array.isArray(initialUsers)) return; // external data provided
    if (!canView) return; // no permission to view
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const list = await api.users.list(branchId ? { branchId } : {});
        if (!mounted) return;
        setUsers(Array.isArray(list) ? list.map(u => ({
          id: u.id,
          name: u.username || `${u.firstName ?? ''} ${u.surname ?? ''}`.trim() || u.email || 'User',
          email: u.email,
          role: u.role || (u.roles?.[0]?.name) || 'User',
          active: u.active !== false,
        })) : []);
      } catch (e) {
        if (!mounted) return;
        toast({ title: 'Failed to load users', description: String(e?.message || e), variant: 'destructive' });
        setUsers([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [initialUsers, branchId, canView]);

  const roles = useMemo(() => {
    const set = new Set(users.map(u => u.role));
    return Array.from(set);
  }, [users]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter(u => {
      const nameMatch = `${u.name}`.toLowerCase().includes(q);
      const roleMatch = roleFilter === 'ALL' ? true : u.role === roleFilter;
      return nameMatch && roleMatch;
    });
  }, [users, search, roleFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const clampedPage = Math.min(page, totalPages);
  const startIdx = (clampedPage - 1) * pageSize;
  const pageItems = filtered.slice(startIdx, startIdx + pageSize);

  const handleAddUser = () => {
    if (onAddUser) return onAddUser();
    setAddOpen(true);
  };

  useEffect(() => {
    if (!addOpen) return;
    (async () => {
      try {
        const list = await api.roles.list({ branchId, includeArchived: false });
        const opts = Array.isArray(list) ? list.map(r => ({ id: r.id, name: r.name })).filter(r => r.id && r.name) : [];
        setRoleOptions(opts);
        if (!addForm.appRoleId && opts.length) setAddForm(prev => ({ ...prev, appRoleId: opts[0].id }));
      } catch {
        setRoleOptions([]);
      }
    })();
  }, [addOpen]);

  const handleSaveAdd = () => {
    (async () => {
      try {
        const name = addForm.name.trim();
        const email = addForm.email.trim();
        const password = addForm.password;
        const appRoleId = addForm.appRoleId;
        if (!name || !email || !password || !appRoleId) {
          toast({ title: 'Missing fields', description: 'Name, email, password and role are required.', variant: 'destructive' });
          return;
        }
        const [firstName, ...rest] = name.split(' ');
        const surname = rest.join(' ').trim();
        await api.users.create({
          username: name,
          email,
          password,
          role: 'CASHIER',
          branchId: branchId || (user?.branchId),
          firstName: firstName || undefined,
          surname: surname || undefined,
          appRoleId,
        });
        toast({ title: 'User created' });
        setAddOpen(false);
        setAddForm({ name: '', email: '', password: '', appRoleId: '' });
        // reload list
        const list = await api.users.list(branchId ? { branchId } : {});
        setUsers(Array.isArray(list) ? list.map(u => ({
          id: u.id,
          name: u.username || `${u.firstName ?? ''} ${u.surname ?? ''}`.trim() || u.email || 'User',
          email: u.email,
          role: u.role || (u.roles?.[0]?.name) || 'User',
          active: u.active !== false,
        })) : []);
      } catch (e) {
        toast({ title: 'Create failed', description: String(e?.message || e), variant: 'destructive' });
      }
    })();
  };

  const handleEdit = (user) => {
    setEditUser(user);
  };

  const handleSaveEdit = () => {
    (async () => {
      try {
        if (onEditUser) await onEditUser(editUser);
        await api.users.update(editUser.id, { username: editUser.name, email: editUser.email, role: editUser.role });
        setUsers(prev => prev.map(u => u.id === editUser.id ? editUser : u));
        toast({ title: 'User updated' });
        setEditUser(null);
      } catch (e) {
        toast({ title: 'Update failed', description: String(e?.message || e), variant: 'destructive' });
      }
    })();
  };

  const handleDeactivate = (user) => {
    (async () => {
      try {
        if (onDeactivateUser) await onDeactivateUser(user);
        await api.users.update(user.id, { active: !user.active });
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, active: !u.active } : u));
        toast({ title: user.active ? 'User deactivated' : 'User activated' });
      } catch (e) {
        toast({ title: 'Action failed', description: String(e?.message || e), variant: 'destructive' });
      }
    })();
  };

  const handleDelete = (id) => {
    setDeleteConfirm({ open: true, id });
  };

  const confirmDelete = () => {
    const id = deleteConfirm.id;
    if (!id) { setDeleteConfirm({ open: false, id: null }); return; }
    (async () => {
      try {
        if (onDeleteUser) await onDeleteUser(id);
        await api.users.remove(id);
        setUsers(prev => prev.filter(u => u.id !== id));
        toast({ title: 'User deleted' });
        setDeleteConfirm({ open: false, id: null });
      } catch (e) {
        toast({ title: 'Delete failed', description: String(e?.message || e), variant: 'destructive' });
      }
    })();
  };

  return (
    <div className="space-y-6">
      {!canView && (
        <div className="text-sm text-muted-foreground">You do not have permission to view users.</div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold gradient-text mb-1">Users</h2>
          <p className="text-muted-foreground">Manage users, roles, and access.</p>
        </div>
        {(isAdmin || hasPermission(perms, 'add_user')) ? (
          <Button onClick={handleAddUser} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">Add User</Button>
        ) : null}
      </div>

      <Card className="glass-effect">
        <CardHeader>
          <CardTitle>User Overview</CardTitle>
          <CardDescription>Search, filter, and manage users</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <div className="w-full md:w-1/2">
              <Input placeholder="Search by name" value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} />
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="role-filter" className="text-sm">Role</Label>
              <select id="role-filter" value={roleFilter} onChange={(e) => { setPage(1); setRoleFilter(e.target.value); }} className="h-9 rounded-md border bg-background px-3 text-sm min-w-[10rem]">
                <option value="ALL">All</option>
                {roles.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          <div className="border rounded-md overflow-hidden">
            <div className="grid grid-cols-12 bg-muted/50 text-sm font-semibold px-3 py-2">
              <div className="col-span-3">Name</div>
              <div className="col-span-2">Role</div>
              <div className="col-span-4">Email</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-1 text-right">Actions</div>
            </div>
            <div className="divide-y">
              {loading && (
                <div className="px-3 py-6 text-sm text-muted-foreground">Loading users...</div>
              )}
              {!loading && canView && pageItems.map(u => (
                <div key={u.id} className="grid grid-cols-12 px-3 py-2 text-sm items-center odd:bg-background/50">
                  <div className="col-span-3">{u.name}</div>
                  <div className="col-span-2">{u.role}</div>
                  <div className="col-span-4 truncate">{u.email}</div>
                  <div className="col-span-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${u.active ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-700'}`}>{u.active ? 'Active' : 'Inactive'}</span>
                  </div>
                  <div className="col-span-1 flex justify-end gap-2">
                    {(isAdmin || hasPermission(perms, 'edit_user')) ? (
                      <Button size="sm" variant="outline" onClick={() => handleEdit(u)}>Edit</Button>
                    ) : null}
                    {(isAdmin || hasPermission(perms, 'edit_user')) ? (
                      <Button size="sm" variant="outline" onClick={() => handleDeactivate(u)}>{u.active ? 'Deactivate' : 'Activate'}</Button>
                    ) : null}
                    {(isAdmin || hasPermission(perms, 'delete_user')) ? (
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(u.id)}>Delete</Button>
                    ) : null}
                  </div>
                </div>
              ))}
              {!loading && canView && pageItems.length === 0 && (
                <div className="px-3 py-6 text-sm text-muted-foreground">No users found.</div>
              )}
            </div>
          </div>

          {/* Pagination */}
          {(() => {
            const start = filtered.length === 0 ? 0 : startIdx + 1;
            const end = Math.min(filtered.length, startIdx + pageSize);
            return (
              <div className="flex flex-col items-center gap-3 pt-3">
                <div className="text-sm text-muted-foreground">{filtered.length === 0 ? '0' : `${start}-${end}`} of {filtered.length}</div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={clampedPage <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }).slice(0, 5).map((_, idx) => {
                      const pg = idx + 1; // show first 5 indicative pages
                      const active = pg === clampedPage;
                      return (
                        <Button key={pg} variant={active ? 'default' : 'outline'} size="sm" onClick={() => setPage(pg)}>
                          {pg}
                        </Button>
                      );
                    })}
                  </div>
                  <Button variant="outline" size="sm" disabled={clampedPage >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next</Button>
                </div>
                <div className="text-xs text-muted-foreground">Page 1 shows 10 users, subsequent pages show 20 users.</div>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Add Modal */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
            <DialogDescription>Create a new user for this branch.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input value={addForm.name} onChange={(e) => setAddForm(prev => ({ ...prev, name: e.target.value }))} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={addForm.email} onChange={(e) => setAddForm(prev => ({ ...prev, email: e.target.value }))} />
            </div>
            <div>
              <Label>Password</Label>
              <Input type="password" value={addForm.password} onChange={(e) => setAddForm(prev => ({ ...prev, password: e.target.value }))} />
            </div>
            <div>
              <Label>Role</Label>
              <select className="h-9 rounded-md border bg-background px-3 text-sm w-full" value={addForm.appRoleId} onChange={(e) => setAddForm(prev => ({ ...prev, appRoleId: e.target.value }))}>
                {roleOptions.length === 0 ? <option value="">Select role</option> : null}
                {roleOptions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveAdd}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={!!editUser} onOpenChange={(v) => { if (!v) setEditUser(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user details.</DialogDescription>
          </DialogHeader>
          {editUser && (
            <div className="space-y-3">
              <div>
                <Label>Name</Label>
                <Input value={editUser.name} onChange={(e) => setEditUser({ ...editUser, name: e.target.value })} />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={editUser.email} onChange={(e) => setEditUser({ ...editUser, email: e.target.value })} />
              </div>
              <div>
                <Label>Role</Label>
                <select value={editUser.role} onChange={(e) => setEditUser({ ...editUser, role: e.target.value })} className="h-9 rounded-md border bg-background px-3 text-sm w-full">
                  {roles.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditUser(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={deleteConfirm.open} onOpenChange={(v) => setDeleteConfirm(prev => ({ ...prev, open: v }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>Are you sure you want to delete this user?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteConfirm({ open: false, id: null })}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserOverview;
