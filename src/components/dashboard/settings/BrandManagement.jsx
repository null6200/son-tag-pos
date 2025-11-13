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
import { PlusCircle, MoreHorizontal, Edit, Trash2, Award } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const BrandManagement = ({ user }) => {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [brandName, setBrandName] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await api.brands?.list?.({ branchId: user?.branchId || undefined });
        const items = Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : []);
        const mapped = (items || []).map(b => ({ id: b.id, name: b.name }));
        setBrands(mapped);
        return;
      } catch {}
      setBrands([]);
      setLoading(false);
    })();
  }, [user?.branchId]);

  const reload = async () => {
    try {
      setLoading(true);
      const res = await api.brands?.list?.({ branchId: user?.branchId || undefined });
      const items = Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : []);
      setBrands((items || []).map(b => ({ id: b.id, name: b.name })));
    } catch { setBrands([]); } finally { setLoading(false); }
  };

  const handleOpenModal = (brand = null) => {
    setEditingBrand(brand);
    setBrandName(brand ? brand.name : '');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingBrand(null);
    setBrandName('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!brandName) {
      toast({ title: 'Error', description: 'Brand Name is required.', variant: 'destructive' });
      return;
    }
    try {
      if (editingBrand) {
        await api.brands?.update?.(editingBrand.id, { name: brandName, branchId: user?.branchId });
        toast({ title: 'Success', description: 'Brand updated successfully.' });
      } else {
        await api.brands?.create?.({ name: brandName, branchId: user?.branchId });
        toast({ title: 'Success', description: 'Brand added successfully.' });
      }
      await reload();
    } catch (err) {
      toast({ title: 'Save failed', description: String(err?.message || err), variant: 'destructive' });
    } finally {
      handleCloseModal();
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.brands?.remove?.(String(id));
      toast({ title: 'Success', description: 'Brand deleted successfully.' });
      await reload();
    } catch (err) {
      toast({ title: 'Delete failed', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  return (
    <Card className="glass-effect border-2 border-white/30 dark:border-slate-700/50">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2"><Award />Brand Management</CardTitle>
          <CardDescription>Manage product brands for your inventory.</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => handleOpenModal()}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Brand
          </Button>
          <Button variant="outline" onClick={async () => { await reload(); toast({ title: 'Refreshed', description: 'Brand list reloaded from server.' }); }}>
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading && <div className="text-sm text-muted-foreground mb-2">Loading brands...</div>}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Brand Name</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {brands.map(brand => (
              <TableRow key={brand.id}>
                <TableCell className="font-medium">{brand.name}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleOpenModal(brand)}>
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
                              This action cannot be undone. This will permanently delete the brand "{brand.name}".
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(brand.id)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
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
        {!loading && brands.length === 0 && (
          <div className="mt-3 p-3 rounded-md bg-blue-50 text-blue-800 border border-blue-200 text-sm">
            No brands yet. Create brands to better classify products.
          </div>
        )}
      </CardContent>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px] glass-effect">
          <DialogHeader>
            <DialogTitle>{editingBrand ? 'Edit Brand' : 'Add New Brand'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Name</Label>
                <Input id="name" value={brandName} onChange={(e) => setBrandName(e.target.value)} className="col-span-3" placeholder="e.g., Lavazza" />
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

export default BrandManagement;