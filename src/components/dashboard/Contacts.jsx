
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Edit, Trash, ClipboardList as AddressBook, Building, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api } from '@/lib/api';

const Contacts = ({ user }) => {
  const [activeTab, setActiveTab] = useState('suppliers');
  const [suppliers, setSuppliers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [contactType, setContactType] = useState('supplier');
  const [formData, setFormData] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const branchId = user?.branchId;
        if (!branchId) { setSuppliers([]); setCustomers([]); return; }
        const [s, c] = await Promise.all([
          api.suppliers.list({ branchId }),
          api.customers.list({ branchId }),
        ]);
        setSuppliers(Array.isArray(s?.items) ? s.items : (Array.isArray(s) ? s : []));
        setCustomers(Array.isArray(c?.items) ? c.items : (Array.isArray(c) ? c : []));
      } catch {
        setSuppliers([]); setCustomers([]);
      }
    })();
  }, [user?.branchId]);

  const resetFormData = (type) => ({
    id: Date.now(),
    contactType: type,
    name: '',
    businessName: '',
    phone: '',
    email: '',
    address: '',
  });

  const handleOpenModal = (type, contact = null) => {
    setContactType(type);
    if (contact) {
      setEditingContact(contact);
      setFormData(contact);
    } else {
      setEditingContact(null);
      setFormData(resetFormData(type));
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingContact(null);
    setFormData({});
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const branchId = user?.branchId;
      if (!branchId) return;
      if (contactType === 'supplier') {
        if (editingContact) await api.suppliers.update(editingContact.id, { ...formData, branchId });
        else await api.suppliers.create({ ...formData, branchId });
        toast({ title: `✅ Supplier ${editingContact ? 'updated' : 'added'}!` });
        const s = await api.suppliers.list({ branchId });
        setSuppliers(Array.isArray(s?.items) ? s.items : (Array.isArray(s) ? s : []));
      } else {
        if (editingContact) await api.customers.update(editingContact.id, { ...formData, branchId });
        else await api.customers.create({ ...formData, branchId });
        toast({ title: `✅ Customer ${editingContact ? 'updated' : 'added'}!` });
        const c = await api.customers.list({ branchId });
        setCustomers(Array.isArray(c?.items) ? c.items : (Array.isArray(c) ? c : []));
      }
      handleCloseModal();
    } catch (err) {
      toast({ title: 'Save failed', description: String(err?.message || err), variant: 'destructive' });
    }
  };
  
  const handleDelete = async (type, id) => {
    try {
      const branchId = user?.branchId;
      if (type === 'supplier') {
        await api.suppliers.remove(String(id));
        const s = await api.suppliers.list({ branchId });
        setSuppliers(Array.isArray(s?.items) ? s.items : (Array.isArray(s) ? s : []));
        toast({ title: '🗑️ Supplier deleted' });
      } else {
        await api.customers.remove(String(id));
        const c = await api.customers.list({ branchId });
        setCustomers(Array.isArray(c?.items) ? c.items : (Array.isArray(c) ? c : []));
        toast({ title: '🗑️ Customer deleted' });
      }
    } catch (err) {
      toast({ title: 'Delete failed', description: String(err?.message || err), variant: 'destructive' });
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <AddressBook className="h-8 w-8" /> Contacts
          </h2>
          <p className="text-muted-foreground">Manage your suppliers and customers.</p>
        </div>
        <Button onClick={() => handleOpenModal(activeTab.slice(0, -1))}>
          <Plus className="mr-2 h-4 w-4" /> Add New {activeTab === 'suppliers' ? 'Supplier' : 'Customer'}
        </Button>
      </div>

      <Tabs defaultValue="suppliers" onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="suppliers">
            <Building className="mr-2 h-4 w-4" /> Suppliers
          </TabsTrigger>
          <TabsTrigger value="customers">
            <User className="mr-2 h-4 w-4" /> Customers
          </TabsTrigger>
        </TabsList>
        <TabsContent value="suppliers">
          <ContactTable 
            contacts={suppliers}
            type="supplier"
            onEdit={(contact) => handleOpenModal('supplier', contact)}
            onDelete={(id) => handleDelete('supplier', id)}
          />
        </TabsContent>
        <TabsContent value="customers">
          <ContactTable 
            contacts={customers}
            type="customer"
            onEdit={(contact) => handleOpenModal('customer', contact)}
            onDelete={(id) => handleDelete('customer', id)}
          />
        </TabsContent>
      </Tabs>
      
      <ContactFormModal 
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        contactType={contactType}
        formData={formData}
        handleInputChange={handleInputChange}
        editing={!!editingContact}
      />
    </div>
  );
};

const ContactTable = ({ contacts, type, onEdit, onDelete }) => (
  <Card>
    <CardHeader>
      <CardTitle className="capitalize">{type}s List</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="relative w-full mb-4">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder={`Search ${type}s...`} className="pl-8" />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Business Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.length > 0 ? contacts.map(contact => (
              <TableRow key={contact.id}>
                <TableCell className="font-medium">{contact.name}</TableCell>
                <TableCell>{contact.businessName}</TableCell>
                <TableCell>{contact.phone}</TableCell>
                <TableCell>{contact.email}</TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" size="icon" onClick={() => onEdit(contact)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(contact.id)}>
                      <Trash className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No {type}s found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </CardContent>
  </Card>
);

const ContactFormModal = ({ isOpen, onClose, onSubmit, contactType, formData, handleInputChange, editing }) => (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{editing ? 'Edit' : 'Add'} {contactType === 'supplier' ? 'Supplier' : 'Customer'}</DialogTitle>
        <DialogDescription>Fill in the details below.</DialogDescription>
      </DialogHeader>
      <form onSubmit={onSubmit} className="space-y-4 pt-4">
        <div className="space-y-2">
          <Label htmlFor="name">Contact Person Name</Label>
          <Input id="name" name="name" value={formData.name || ''} onChange={handleInputChange} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="businessName">Business Name</Label>
          <Input id="businessName" name="businessName" value={formData.businessName || ''} onChange={handleInputChange} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input id="phone" name="phone" type="tel" value={formData.phone || ''} onChange={handleInputChange} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input id="email" name="email" type="email" value={formData.email || ''} onChange={handleInputChange} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <Input id="address" name="address" value={formData.address || ''} onChange={handleInputChange} />
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit">{editing ? 'Save Changes' : 'Add Contact'}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
);

export default Contacts;
