import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { PlusCircle, MoreHorizontal, Edit, Trash2, Package } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const CategoryManagement = ({ user }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastFetchCount, setLastFetchCount] = useState(0);
  const [lastItems, setLastItems] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryCode, setCategoryCode] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await api.categories.list({ branchId: user?.branchId || undefined });
        const items = Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : []);
        const mapped = items.map((c) => ({ id: c.id, name: String(c.name || ''), code: String(c.code || c.slug || '') }));
        if (!mapped.length) console.warn('[CategoryManagement] initial load empty', { branchId: user.branchId, res });
        console.debug('[CategoryManagement] initial load', { branchId: user.branchId, count: mapped.length, items: mapped });
        setLastFetchCount(mapped.length);
        setLastItems(mapped);
        setCategories(mapped);
      } catch (e) {
        setCategories([]);
        toast({ title: 'Failed to load categories', description: String(e?.message || e), variant: 'destructive' });
      } finally { setLoading(false); }
    })();
  }, [user?.branchId]);

  const reload = async () => {
    try {
      setLoading(true);
      const res = await api.categories.list({ branchId: user?.branchId || undefined });
      const items = Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : []);
      const mapped = items.map(c => ({ id: c.id, name: String(c.name || ''), code: String(c.code || c.slug || '') }));
      if (!mapped.length) console.warn('[CategoryManagement] reload empty', { branchId: user.branchId, res });
      console.debug('[CategoryManagement] reload', { branchId: user.branchId, count: mapped.length, items: mapped });
      setLastFetchCount(mapped.length);
      setLastItems(mapped);
      setCategories(mapped);
    } catch {} finally { setLoading(false); }
  };

  const handleOpenModal = (category = null) => {
    setEditingCategory(category);
    setCategoryName(category ? category.name : '');
    setCategoryCode(category ? category.code : '');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    setCategoryName('');
    setCategoryCode('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!categoryName || !categoryCode) {
      toast({ title: 'Error', description: 'Category Name and Code are required.', variant: 'destructive' });
      return;
    }

    try {
      if (editingCategory) {
        await api.categories.update?.(editingCategory.id, { name: categoryName, code: categoryCode, branchId: user?.branchId });
        toast({ title: 'Success', description: 'Category updated successfully.' });
      } else {
        await api.categories.create?.({ name: categoryName, code: categoryCode, branchId: user?.branchId });
        toast({ title: 'Success', description: 'Category added successfully.' });
      }
      handleCloseModal();
      await reload();
    } catch (err) {
      toast({ title: 'Save failed', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.categories.remove?.(String(id));
      toast({ title: 'Success', description: 'Category deleted successfully.' });
      await reload();
    } catch (err) {
      toast({ title: 'Delete failed', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  return (
    <Card className="glass-effect border-2 border-white/30 dark:border-slate-700/50">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2"><Package />Category Management</CardTitle>
          <CardDescription>Manage product categories for your inventory.</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => handleOpenModal()}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Category
          </Button>
          <Button variant="secondary" onClick={reload}>Refresh</Button>
          <Button variant="outline" onClick={() => { setCategories([]); toast({ title: 'Cleared', description: 'All categories cleared.' }); }}>
            Clear All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="text-sm text-muted-foreground mb-2">Loading categories...</div>
        )}
        {!loading && (
          <div className="text-sm text-muted-foreground mb-2">Categories found: {categories.length} {categories.length === 0 ? `(server: ${lastFetchCount})` : ''}</div>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category Name</TableHead>
              <TableHead>Category Code</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map(category => (
              <TableRow key={category.id}>
                <TableCell className="font-medium">{category.name}</TableCell>
                <TableCell>{category.code}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleOpenModal(category)}>
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
                              This action cannot be undone. This will permanently delete the category "{category.name}".
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(category.id)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
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
        {!loading && categories.length === 0 && (
          <div className="mt-3 p-3 rounded-md bg-blue-50 text-blue-800 border border-blue-200 text-sm">
            No categories yet. Create categories to organize your products.
          </div>
        )}
        {categories.length === 0 && lastFetchCount > 0 && (
          <div className="mt-3 p-2 rounded bg-yellow-50 text-sm text-yellow-800 border border-yellow-200">
            Data fetched but not shown in table. Fallback list:
            <ul className="list-disc ml-6 mt-1">
              {lastItems.map(it => (
                <li key={`fallback-${it.id}`}>{it.name} — {it.code}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px] glass-effect">
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit Category' : 'Add New Category'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Name</Label>
                <Input id="name" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} className="col-span-3" placeholder="e.g., Hot Drinks" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="code" className="text-right">Code</Label>
                <Input id="code" value={categoryCode} onChange={(e) => setCategoryCode(e.target.value)} className="col-span-3" placeholder="e.g., HD001" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseModal}>Cancel</Button>
              <Button type="submit">Save changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default CategoryManagement;