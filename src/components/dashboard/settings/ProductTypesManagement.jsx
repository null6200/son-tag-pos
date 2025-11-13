import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';

const ProductTypesManagement = ({ user, onBack }) => {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [isOpen, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', allowedFunctionIds: [] });
  const [sectionFunctions, setSectionFunctions] = useState([]);

  const branchId = user?.branchId;

  const load = async (p = page) => {
    try {
      const res = await api.productTypes.list({ branchId: branchId || undefined, page: p, pageSize });
      const list = Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : []);
      setItems(list);
      setPage(res?.page || p);
      setTotal(res?.total || list.length || 0);
      const funcs = await api.sectionFunctions.list({ branchId: branchId || undefined });
      const fitems = Array.isArray(funcs?.items) ? funcs.items : (Array.isArray(funcs) ? funcs : []);
      setSectionFunctions(fitems);
    } catch (e) {
      setItems([]);
      toast({ title: 'Load failed', description: String(e?.message || e), variant: 'destructive' });
    }
  };

  // Always allow backend to derive default branch when branchId is not set yet
  useEffect(() => { load(1); }, [branchId]);

  const openAdd = () => { setEditing(null); setForm({ name: '', description: '', allowedFunctionIds: [] }); setOpen(true); };
  const openEdit = (it) => { 
    const allowed = Array.isArray(it?.productTypeLinks) ? it.productTypeLinks.map(l => l.sectionFunctionId || l.sectionFunction?.id).filter(Boolean) : [];
    setEditing(it); setForm({ name: it.name || '', description: it.description || '', allowedFunctionIds: allowed }); setOpen(true); 
  };

  const toggleAllowed = (id) => {
    setForm(f => ({ ...f, allowedFunctionIds: f.allowedFunctionIds.includes(id) ? f.allowedFunctionIds.filter(x => x !== id) : [...f.allowedFunctionIds, id] }));
  };

  const save = async () => {
    try {
      if (!form.name.trim()) { toast({ title: 'Name required', variant: 'destructive' }); return; }
      if (editing) {
        await api.productTypes.update(editing.id, { name: form.name, description: form.description, allowedFunctionIds: form.allowedFunctionIds });
        toast({ title: 'Updated' });
      } else {
        await api.productTypes.create({ branchId: branchId || undefined, name: form.name, description: form.description, allowedFunctionIds: form.allowedFunctionIds });
        toast({ title: 'Created' });
      }
      setOpen(false);
      await load();
    } catch (e) {
      toast({ title: 'Save failed', description: String(e?.message || e), variant: 'destructive' });
    }
  };

  const remove = async (id) => {
    try {
      await api.productTypes.remove(id);
      toast({ title: 'Deleted' });
      await load();
    } catch (e) {
      toast({ title: 'Delete failed', description: String(e?.message || e), variant: 'destructive' });
    }
  };

  const pages = Math.max(1, Math.ceil((total || 0) / pageSize));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold gradient-text mb-2">Product Types</h2>
          <p className="text-muted-foreground">Manage product types and which section functions they allow.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack}>Back</Button>
          <Button onClick={openAdd}>Add Product Type</Button>
        </div>
      </div>

      <Card className="glass-effect border-2 border-white/30 dark:border-slate-700/50">
        <CardHeader>
          <CardTitle>Types</CardTitle>
          <CardDescription>Paginated list of product types</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {(items || []).map(it => (
              <div key={it.id} className="flex items-center justify-between p-3 rounded-lg bg-background/50 dark:bg-slate-800/50">
                <div>
                  <div className="font-semibold">{it.name}</div>
                  <div className="text-sm text-muted-foreground">{it.description || '—'}</div>
                  <div className="text-xs text-muted-foreground mt-1">Allowed: {Array.isArray(it?.productTypeLinks) ? it.productTypeLinks.map(l => {
                    const f = sectionFunctions.find(sf => sf.id === (l.sectionFunctionId || l.sectionFunction?.id));
                    return f?.name;
                  }).filter(Boolean).join(', ') || 'None' : 'None'}</div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(it)}>Edit</Button>
                  <Button variant="destructive" size="sm" onClick={() => remove(it.id)}>Delete</Button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">Page {page} of {pages}</div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => load(page - 1)}>Prev</Button>
              <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => load(page + 1)}>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Product Type' : 'Add Product Type'}</DialogTitle>
            <DialogDescription>Define a product type and choose allowed section functions.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Name</Label>
              <Input className="col-span-3" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Description</Label>
              <Input className="col-span-3" value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <Label>Allowed Section Functions</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 p-3 rounded-lg border">
                {(sectionFunctions || []).map(sf => (
                  <label key={sf.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={form.allowedFunctionIds.includes(sf.id)} onChange={() => toggleAllowed(sf.id)} />
                    <span>{sf.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductTypesManagement;
