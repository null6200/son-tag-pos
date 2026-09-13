import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { motion } from 'framer-motion';
import { ArrowLeft, Tag, PlusCircle, Edit, Trash2, Percent, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const DiscountSettings = ({ onBack, user }) => {
  const [discounts, setDiscounts] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const branchId = user?.branchId;
        const res = await api.discounts?.list?.(branchId ? { branchId } : {});
        const items = Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : []);
        setDiscounts(items);
      } catch {
        setDiscounts([]);
      }
    })();
  }, [user?.branchId]);

  const reload = async () => {
    try {
      const branchId = user?.branchId;
      const res = await api.discounts?.list?.(branchId ? { branchId } : {});
      const items = Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : []);
      setDiscounts(items);
    } catch { setDiscounts([]); }
  };

  const handleAddDiscount = async (newDiscount) => {
    try {
      const branchId = user?.branchId;
      await api.discounts?.create?.({ ...(branchId ? { branchId } : {}), ...newDiscount });
      toast({ title: '✅ Discount Added', description: `"${newDiscount.name}" has been created.` });
      setIsAdding(false);
      await reload();
    } catch (e) {
      toast({ title: 'Create failed', description: String(e?.message || e), variant: 'destructive' });
    }
  };

  const handleUpdateDiscount = async (updatedDiscount) => {
    try {
      await api.discounts?.update?.(updatedDiscount.id, updatedDiscount);
      toast({ title: '✅ Discount Updated', description: `"${updatedDiscount.name}" has been saved.` });
      setEditingDiscount(null);
      await reload();
    } catch (e) {
      toast({ title: 'Update failed', description: String(e?.message || e), variant: 'destructive' });
    }
  };

  const handleDeleteDiscount = async (discountId) => {
    try {
      await api.discounts?.remove?.(String(discountId));
      toast({ title: '🗑️ Discount Deleted', description: 'The discount has been removed.' });
      await reload();
    } catch (e) {
      toast({ title: 'Delete failed', description: String(e?.message || e), variant: 'destructive' });
    }
  };

  const toggleDiscountStatus = async (discountId) => {
    try {
      const discount = discounts.find(d => d.id === discountId);
      if (!discount) return;
      await api.discounts?.update?.(discountId, { ...discount, isActive: !discount.isActive });
      await reload();
    } catch (e) {
      toast({ title: 'Status update failed', description: String(e?.message || e), variant: 'destructive' });
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold gradient-text">Discount Settings</h2>
            <p className="text-muted-foreground">Create and manage discounts for your sales.</p>
          </div>
        </div>
        {!isAdding && !editingDiscount && (
          <Button onClick={() => setIsAdding(true)}><PlusCircle className="mr-2 h-4 w-4" /> Add Discount</Button>
        )}
      </div>

      {isAdding || editingDiscount ? (
        <DiscountForm
          onSave={editingDiscount ? handleUpdateDiscount : handleAddDiscount}
          onCancel={() => { setIsAdding(false); setEditingDiscount(null); }}
          discount={editingDiscount}
        />
      ) : (
        <DiscountList
          discounts={discounts}
          onEdit={setEditingDiscount}
          onDelete={handleDeleteDiscount}
          onToggleStatus={toggleDiscountStatus}
        />
      )}
    </motion.div>
  );
};

const DiscountForm = ({ onSave, onCancel, discount }) => {
  const [name, setName] = useState(discount?.name || '');
  const [type, setType] = useState(discount?.type || 'percentage');
  const [amount, setAmount] = useState(discount?.amount || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !amount) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Please fill in all fields.' });
      return;
    }
    onSave({ id: discount?.id, name, type, amount: parseFloat(amount), isActive: discount?.isActive ?? true });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{discount ? 'Edit Discount' : 'Add New Discount'}</CardTitle>
        <CardDescription>Fill in the details for the discount.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Discount Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Holiday Special" required />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Discount Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                  <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount / Percentage</Label>
              <div className="relative">
                <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g., 10" required className="pl-8" />
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                  {type === 'percentage' ? <Percent className="h-4 w-4" /> : <DollarSign className="h-4 w-4" />}
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
            <Button type="submit">{discount ? 'Save Changes' : 'Add Discount'}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

const DiscountList = ({ discounts, onEdit, onDelete, onToggleStatus }) => (
  <Card>
    <CardHeader>
      <CardTitle>Existing Discounts</CardTitle>
      <CardDescription>A list of all available discounts.</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {discounts.length > 0 ? discounts.map(d => (
          <div key={d.id} className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-4">
              <Switch checked={d.isActive} onCheckedChange={() => onToggleStatus(d.id)} />
              <div>
                <p className={`font-semibold ${!d.isActive && 'text-muted-foreground line-through'}`}>{d.name}</p>
                <p className="text-sm text-muted-foreground">
                  {d.type === 'percentage' ? `${d.amount}% off` : `$${d.amount} off`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => onEdit(d)}><Edit className="h-4 w-4" /></Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete the "{d.name}" discount. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDelete(d.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        )) : (
          <p className="text-center text-muted-foreground py-8">No discounts have been created yet.</p>
        )}
      </div>
    </CardContent>
  </Card>
);

export default DiscountSettings;