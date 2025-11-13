import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { PlusCircle, MoreHorizontal, Edit, Trash2, Package, Eraser } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const SubCategoryManagement = ({ user }) => {
  const [subCategories, setSubCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await api.subcategories?.list?.({ branchId: user?.branchId || undefined });
        const items = Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : []);
        const mapped = (items || []).map(sc => ({ id: sc.id, name: sc.name, code: sc.code || sc.slug || '' }));
        setSubCategories(mapped);
        return;
      } catch {}
      setSubCategories([]);
      setLoading(false);
    })();
  }, [user?.branchId]);

  const reload = async () => {
    try {
      setLoading(true);
      const res = await api.subcategories?.list?.({ branchId: user?.branchId || undefined });
      const items = Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : []);
      setSubCategories((items || []).map(sc => ({ id: sc.id, name: sc.name, code: sc.code || sc.slug || '' })));
    } catch { setSubCategories([]); } finally { setLoading(false); }
  };

  const handleOpen = (item = null) => {
    setEditing(item);
    setName(item ? item.name : '');
    setCode(item ? item.code : '');
    setIsModalOpen(true);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setEditing(null);
    setName('');
    setCode('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !code) {
      toast({ title: 'Error', description: 'Name and Code are required.', variant: 'destructive' });
      return;
    }
    try {
      if (editing) {
        await api.subcategories?.update?.(editing.id, { name, code, branchId: user?.branchId });
        toast({ title: 'Success', description: 'Sub Category updated successfully.' });
      } else {
        await api.subcategories?.create?.({ name, code, branchId: user?.branchId });
        toast({ title: 'Success', description: 'Sub Category added successfully.' });
      }
      await reload();
    } catch (err) {
      toast({ title: 'Save failed', description: String(err?.message || err), variant: 'destructive' });
    } finally {
      handleClose();
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.subcategories?.remove?.(String(id));
      toast({ title: 'Success', description: 'Sub Category deleted successfully.' });
      await reload();
    } catch (err) {
      toast({ title: 'Delete failed', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  const handleClearAll = async () => {
    await reload();
    toast({ title: 'Refreshed', description: 'Sub categories reloaded from server.' });
  };

  return (
    <Card className="glass-effect border-2 border-white/30 dark:border-slate-700/50">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2"><Package />Sub Category Management</CardTitle>
          <CardDescription>Manage product sub categories.</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => handleOpen()}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Sub Category
          </Button>
          <Button variant="outline" onClick={handleClearAll}>
            <Eraser className="mr-2 h-4 w-4" /> Clear All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading && <div className="text-sm text-muted-foreground mb-2">Loading sub categories...</div>}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subCategories.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>{item.code}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleOpen(item)}>
                        <Edit className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <Trash2 className="mr-2 h-4 w-4 text-red-500" /> <span className="text-red-500">Delete</span>
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the sub category "{item.name}".
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(item.id)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!loading && subCategories.length === 0 && (
          <div className="mt-3 p-3 rounded-md bg-blue-50 text-blue-800 border border-blue-200 text-sm">
            No sub categories yet. Create sub categories to refine product organization.
          </div>
        )}
      </CardContent>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px] glass-effect">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Sub Category' : 'Add New Sub Category'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="sc-name" className="text-right">Name</Label>
                <Input id="sc-name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" placeholder="e.g., Coffee" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="sc-code" className="text-right">Code</Label>
                <Input id="sc-code" value={code} onChange={(e) => setCode(e.target.value)} className="col-span-3" placeholder="e.g., SCF001" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
              <Button type="submit">Save changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default SubCategoryManagement;
