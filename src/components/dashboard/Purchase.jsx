import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Truck, FilePlus, History, Plus, MoreVertical, Edit, Trash2, Search, Package, Calendar, Hash, User, Mail, Phone, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RequirePermission } from '@/lib/permissions';
import { api } from '@/lib/api';

const Purchase = ({ user }) => {
    const [activeTab, setActiveTab] = useState('suppliers');

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold gradient-text mb-2">Purchase Management</h2>
                <p className="text-muted-foreground">Manage suppliers, create purchase orders, and track your purchase history.</p>
            </div>

            <div className="flex space-x-2 border-b">
                <TabButton icon={Truck} label="Manage Suppliers" isActive={activeTab === 'suppliers'} onClick={() => setActiveTab('suppliers')} />
                <TabButton icon={FilePlus} label="Create PO" isActive={activeTab === 'create-po'} onClick={() => setActiveTab('create-po')} />
                <TabButton icon={History} label="Purchase History" isActive={activeTab === 'history'} onClick={() => setActiveTab('history')} />
            </div>

            <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                {activeTab === 'suppliers' && <ManageSuppliers user={user} />}
                {activeTab === 'create-po' && <CreatePO user={user} />}
                {activeTab === 'history' && <PurchaseHistory user={user} />}
            </motion.div>
        </div>
    );
};

const TabButton = ({ icon: Icon, label, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            isActive 
                ? 'bg-primary text-primary-foreground' 
                : 'text-muted-foreground hover:bg-muted'
        }`}
    >
        <Icon className="w-4 h-4" />
        {label}
    </button>
);

const ManageSuppliers = ({ user }) => {
    const [suppliers, setSuppliers] = useState([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState(null);

    useEffect(() => {
        (async () => {
            try {
                const branchId = user?.branchId;
                if (!branchId) { setSuppliers([]); return; }
                const res = await api.suppliers.list({ branchId });
                setSuppliers(Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : []));
            } catch { setSuppliers([]); }
        })();
    }, [user?.branchId]);

    const handleSaveSupplier = async (supplierData) => {
        try {
            const branchId = user?.branchId;
            if (!branchId) return;
            if (editingSupplier) await api.suppliers.update(editingSupplier.id, { ...supplierData, branchId });
            else await api.suppliers.create({ ...supplierData, branchId });
            const res = await api.suppliers.list({ branchId });
            setSuppliers(Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : []));
            toast({ title: `Supplier ${editingSupplier ? 'updated' : 'saved'} successfully!` });
        } catch (e) {
            toast({ title: 'Save failed', description: String(e?.message || e), variant: 'destructive' });
        } finally {
            setIsFormOpen(false);
            setEditingSupplier(null);
        }
    };

    const handleDeleteSupplier = async (id) => {
        try {
            const branchId = user?.branchId;
            await api.suppliers.remove(String(id));
            const res = await api.suppliers.list({ branchId });
            setSuppliers(Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : []));
            toast({ title: 'Supplier deleted.', variant: 'destructive' });
        } catch (e) {
            toast({ title: 'Delete failed', description: String(e?.message || e), variant: 'destructive' });
        }
    };

    return (
        <Card className="glass-effect">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Suppliers</CardTitle>
                    <CardDescription>Add, edit, or remove your product suppliers.</CardDescription>
                </div>
                <RequirePermission perms={user?.permissions} anyOf={["add_supplier"]}>
                  <Button onClick={() => { setEditingSupplier(null); setIsFormOpen(true); }}>
                      <Plus className="w-4 h-4 mr-2" /> Add Supplier
                  </Button>
                </RequirePermission>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {suppliers.length > 0 ? suppliers.map(supplier => (
                        <div key={supplier.id} className="flex items-center justify-between p-3 rounded-lg bg-background hover:bg-muted">
                            <div>
                                <p className="font-semibold">{supplier.name}</p>
                                <p className="text-sm text-muted-foreground">{supplier.email}</p>
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <RequirePermission perms={user?.permissions} anyOf={["edit_supplier"]}>
                                      <DropdownMenuItem onSelect={() => { setEditingSupplier(supplier); setIsFormOpen(true); }}>
                                          <Edit className="w-4 h-4 mr-2" /> Edit
                                      </DropdownMenuItem>
                                    </RequirePermission>
                                    <RequirePermission perms={user?.permissions} anyOf={["delete_supplier"]}>
                                      <DropdownMenuItem onSelect={() => handleDeleteSupplier(supplier.id)} className="text-destructive">
                                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                                      </DropdownMenuItem>
                                    </RequirePermission>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    )) : (
                        <p className="text-center text-muted-foreground py-8">No suppliers added yet.</p>
                    )}
                </div>
            </CardContent>
            <SupplierForm 
                isOpen={isFormOpen} 
                onOpenChange={setIsFormOpen} 
                onSave={handleSaveSupplier} 
                supplier={editingSupplier} 
            />
        </Card>
    );
};

const SupplierForm = ({ isOpen, onOpenChange, onSave, supplier }) => {
    const [formData, setFormData] = useState({ name: '', contact: '', email: '', phone: '', address: '' });

    useEffect(() => {
        if (supplier) {
            setFormData(supplier);
        } else {
            setFormData({ name: '', contact: '', email: '', phone: '', address: '' });
        }
    }, [supplier, isOpen]);

    const handleChange = (e) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{supplier ? 'Edit' : 'Add'} Supplier</DialogTitle>
                    <DialogDescription>Fill in the details for the supplier.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <FormInput id="name" label="Supplier Name" value={formData.name} onChange={handleChange} icon={Truck} required />
                    <FormInput id="contact" label="Contact Person" value={formData.contact} onChange={handleChange} icon={User} />
                    <FormInput id="email" label="Email" type="email" value={formData.email} onChange={handleChange} icon={Mail} required />
                    <FormInput id="phone" label="Phone" type="tel" value={formData.phone} onChange={handleChange} icon={Phone} />
                    <FormInput id="address" label="Address" value={formData.address} onChange={handleChange} icon={MapPin} />
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit">Save Supplier</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

const FormInput = ({ id, label, icon: Icon, ...props }) => (
    <div className="space-y-2">
        <Label htmlFor={id}>{label}</Label>
        <div className="relative">
            {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />}
            <Input id={id} className={Icon ? "pl-9" : ""} {...props} />
        </div>
    </div>
);

const CreatePO = ({ user }) => {
    const [suppliers, setSuppliers] = useState([]);
    const [items, setItems] = useState([{ name: '', quantity: 1, price: 0 }]);

    useEffect(() => {
        (async () => {
            try {
                const branchId = user?.branchId;
                if (!branchId) { setSuppliers([]); return; }
                const res = await api.suppliers.list({ branchId });
                setSuppliers(Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : []));
            } catch { setSuppliers([]); }
        })();
    }, [user?.branchId]);

    const handleItemChange = (index, field, value) => {
        const newItems = [...items];
        newItems[index][field] = value;
        setItems(newItems);
    };

    const addItem = () => setItems([...items, { name: '', quantity: 1, price: 0 }]);
    const removeItem = (index) => setItems(items.filter((_, i) => i !== index));

    const total = items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.price)), 0);

    const handleCreatePO = async (e) => {
        e.preventDefault();
        try {
            const branchId = user?.branchId;
            const supplierName = e.target.supplier.value;
            const supplier = (suppliers || []).find(s => s.name === supplierName);
            const payload = {
                branchId,
                supplierId: supplier?.id,
                items,
                total,
                status: 'Pending',
            };
            const created = await api.purchaseOrders.create(payload);
            toast({ title: 'Purchase Order Created!', description: `PO #${created?.id || ''} has been saved.` });
            e.target.reset();
            setItems([{ name: '', quantity: 1, price: 0 }]);
        } catch (err) {
            toast({ title: 'Create failed', description: String(err?.message || err), variant: 'destructive' });
        }
    };

    return (
        <Card className="glass-effect">
            <CardHeader>
                <CardTitle>Create Purchase Order</CardTitle>
                <CardDescription>Fill out the form to create a new PO.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleCreatePO} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="supplier">Supplier</Label>
                            <Select name="supplier" required>
                                <SelectTrigger id="supplier">
                                    <SelectValue placeholder="Select a supplier" />
                                </SelectTrigger>
                                <SelectContent>
                                    {suppliers.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <FormInput id="orderDate" label="Order Date" value={new Date().toLocaleDateString()} icon={Calendar} readOnly />
                    </div>
                    
                    <div className="space-y-4">
                        <Label>Items</Label>
                        {items.map((item, index) => (
                            <div key={index} className="flex items-center gap-2 p-2 rounded-md border">
                                <Input placeholder="Item Name" value={item.name} onChange={e => handleItemChange(index, 'name', e.target.value)} required />
                                <Input type="number" placeholder="Qty" min="1" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', e.target.value)} className="w-24" required />
                                <Input type="number" placeholder="Price" min="0" step="0.01" value={item.price} onChange={e => handleItemChange(index, 'price', e.target.value)} className="w-28" required />
                                <Button type="button" variant="destructive" size="icon" onClick={() => removeItem(index)}><Trash2 className="w-4 h-4" /></Button>
                            </div>
                        ))}
                        <Button type="button" variant="outline" onClick={addItem}><Plus className="w-4 h-4 mr-2" /> Add Item</Button>
                    </div>

                    <div className="text-right">
                        <p className="text-lg font-bold">Total: ${total.toFixed(2)}</p>
                    </div>

                    <div className="flex justify-end">
                        <RequirePermission perms={user?.permissions} anyOf={["add_purchase"]}>
                          <Button type="submit">Create PO</Button>
                        </RequirePermission>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
};

const PurchaseHistory = ({ user }) => {
    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [viewOpen, setViewOpen] = useState(false);
    const [selectedPO, setSelectedPO] = useState(null);
    const [poDetail, setPoDetail] = useState(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    const reload = async () => {
        try {
            const branchId = user?.branchId;
            if (!branchId) { setPurchaseOrders([]); return; }
            const res = await api.purchaseOrders.list({ branchId });
            const items = Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : []);
            setPurchaseOrders(items);
        } catch { setPurchaseOrders([]); }
    };

    useEffect(() => { reload(); }, [user?.branchId]);

    const openDetail = async (po) => {
        setSelectedPO(po);
        setPoDetail(null);
        setViewOpen(true);
        try {
            setLoadingDetail(true);
            const detail = await api.purchaseOrders.get(po.id);
            setPoDetail(detail || po);
        } catch {
            setPoDetail(po);
        } finally {
            setLoadingDetail(false);
        }
    };

    const updateStatus = async (po, status) => {
        try {
            await api.purchaseOrders.update(po.id, { status });
            toast({ title: `PO ${status}` });
            await reload();
            if (selectedPO?.id === po.id) {
                setSelectedPO({ ...selectedPO, status });
                setPoDetail(p => p ? { ...p, status } : p);
            }
        } catch (e) {
            toast({ title: 'Update failed', description: String(e?.message || e), variant: 'destructive' });
        }
    };

    return (
        <Card className="glass-effect">
            <CardHeader>
                <CardTitle>Purchase History</CardTitle>
                <CardDescription>View all past purchase orders.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {purchaseOrders.length > 0 ? purchaseOrders.map(po => (
                        <div key={po.id} className="p-4 rounded-lg border bg-background">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-bold text-primary">{po.id}</p>
                                    <p className="text-sm text-muted-foreground">Supplier: {po.supplier?.name || po.supplierName || po.supplier || '—'}</p>
                                    <p className="text-xs text-muted-foreground">Date: {new Date(po.orderDate).toLocaleString()}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-lg">${po.total.toFixed(2)}</p>
                                    <span className={`px-2 py-1 text-xs rounded-full ${po.status === 'Pending' ? 'bg-yellow-200 text-yellow-800' : po.status === 'Cancelled' ? 'bg-red-200 text-red-800' : 'bg-green-200 text-green-800'}`}>{po.status}</span>
                                </div>
                            </div>
                            <div className="mt-4 pt-2 border-t flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-semibold mb-2">Items:</p>
                                    <ul className="list-disc list-inside text-sm space-y-1">
                                        {po.items.map((item, index) => (
                                            <li key={index}>{item.quantity} x {item.name} @ ${Number(item.price).toFixed(2)} each</li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" onClick={() => openDetail(po)}>View</Button>
                                    {po.status === 'Pending' && (
                                      <>
                                        <Button variant="secondary" onClick={() => updateStatus(po, 'APPROVED')}>Approve</Button>
                                        <Button variant="destructive" onClick={() => updateStatus(po, 'CANCELLED')}>Cancel</Button>
                                      </>
                                    )}
                                    {po.status === 'APPROVED' && (
                                      <Button onClick={() => updateStatus(po, 'RECEIVED')}>Mark Received</Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )) : (
                        <p className="text-center text-muted-foreground py-8">No purchase orders found.</p>
                    )}
                </div>
            </CardContent>
            <Dialog open={viewOpen} onOpenChange={setViewOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Purchase Order {selectedPO?.id}</DialogTitle>
                  <DialogDescription>Detailed view of the purchase order.</DialogDescription>
                </DialogHeader>
                {loadingDetail ? (
                  <p className="text-sm text-muted-foreground">Loading...</p>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <div>
                        <p className="text-sm">Supplier: {poDetail?.supplier?.name || poDetail?.supplierName || '—'}</p>
                        <p className="text-sm">Date: {poDetail?.orderDate ? new Date(poDetail.orderDate).toLocaleString() : '—'}</p>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 text-xs rounded-full ${poDetail?.status === 'Pending' ? 'bg-yellow-200 text-yellow-800' : poDetail?.status === 'Cancelled' ? 'bg-red-200 text-red-800' : 'bg-green-200 text-green-800'}`}>{poDetail?.status}</span>
                      </div>
                    </div>
                    <div className="border rounded p-2">
                      <p className="text-sm font-semibold mb-2">Items</p>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        {(poDetail?.items || []).map((it, idx) => (
                          <li key={idx}>{it.quantity} x {it.name} @ ${Number(it.price).toFixed(2)} each</li>
                        ))}
                      </ul>
                      <div className="text-right font-bold mt-2">Total: ${Number(poDetail?.total || 0).toFixed(2)}</div>
                    </div>
                    <DialogFooter>
                      {poDetail?.status === 'Pending' && (
                        <div className="flex gap-2">
                          <Button variant="secondary" onClick={() => updateStatus(poDetail, 'APPROVED')}>Approve</Button>
                          <Button variant="destructive" onClick={() => updateStatus(poDetail, 'CANCELLED')}>Cancel</Button>
                        </div>
                      )}
                      {poDetail?.status === 'APPROVED' && (
                        <Button onClick={() => updateStatus(poDetail, 'RECEIVED')}>Mark Received</Button>
                      )}
                      <Button variant="outline" onClick={() => setViewOpen(false)}>Close</Button>
                    </DialogFooter>
                  </div>
                )}
              </DialogContent>
            </Dialog>
        </Card>
    );
};

export default Purchase;