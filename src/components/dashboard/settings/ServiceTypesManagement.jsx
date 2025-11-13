import React, { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Plus } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const ServiceTypesManagement = ({ user }) => {
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const t = (q || '').toLowerCase();
    if (!t) return items;
    return items.filter(x => (x.name || '').toLowerCase().includes(t) || (x.description || '').toLowerCase().includes(t));
  }, [q, items]);

  const load = async () => {
    setLoading(true);
    try {
      const list = await api.serviceTypes.list({ branchId: user?.branchId || undefined });
      const arr = Array.isArray(list?.items) ? list.items : (Array.isArray(list) ? list : []);
      setItems(arr.filter(x => !x.archived));
    } catch (e) {
      toast({ title: 'Failed to load', description: String(e?.message || e), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user?.branchId]);

  const openCreate = () => {
    setEditing(null);
    setName('');
    setDescription('');
    setIsOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setName(row.name || '');
    setDescription(row.description || '');
    setIsOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: 'Name required', description: 'Please enter a name.', variant: 'destructive' });
      return;
    }
    try {
      if (editing) {
        await api.serviceTypes.update(editing.id, { name, description });
        toast({ title: 'Updated', description: 'Service type updated.' });
      } else {
        await api.serviceTypes.create({ branchId: user?.branchId || undefined, name, description });
        toast({ title: 'Created', description: 'Service type created.' });
      }
      setIsOpen(false);
      await load();
    } catch (e) {
      toast({ title: 'Save failed', description: String(e?.message || e), variant: 'destructive' });
    }
  };

  const handleArchive = async (row) => {
    try {
      await api.serviceTypes.update(row.id, { archived: true });
      toast({ title: 'Archived', description: `${row.name} archived.` });
      await load();
    } catch (e) {
      toast({ title: 'Archive failed', description: String(e?.message || e), variant: 'destructive' });
    }
  };

  return (
    <Card className="glass-effect">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Service Types</CardTitle>
            <CardDescription>Manage service types like Dine-in, Takeaway, Delivery.</CardDescription>
          </div>
          <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2"/>New</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-4">
          <Input placeholder="Search service types..." value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
          {loading && <span className="text-sm text-muted-foreground">Loading...</span>}
        </div>
        <div className="rounded-md border">
          <div className="grid grid-cols-12 px-3 py-2 text-xs font-semibold text-muted-foreground">
            <div className="col-span-4">Name</div>
            <div className="col-span-6">Description</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>
          <div className="divide-y">
            {filtered.map(row => (
              <div key={row.id} className="grid grid-cols-12 items-center px-3 py-2 text-sm">
                <div className="col-span-4 font-medium">{row.name}</div>
                <div className="col-span-6 text-muted-foreground">{row.description || '-'}</div>
                <div className="col-span-2 flex justify-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4"/></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(row)}>Edit</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleArchive(row)} className="text-destructive">Archive</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">No service types found.</div>
            )}
          </div>
        </div>
      </CardContent>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Service Type' : 'New Service Type'}</DialogTitle>
            <DialogDescription>{editing ? 'Update this service type.' : 'Create a new service type for your branch.'}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">Description</Label>
              <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default ServiceTypesManagement;
