import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, ShieldPlus, Edit, Trash2, CheckSquare, Square, DollarSign, Book, KeyRound, Clock, Calendar, FileText } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import { api } from '@/lib/api';
import PermissionList from '@/components/permissions/PermissionList';
import PermissionGroup from '@/components/permissions/PermissionGroup';

// Legacy coarse permissions removed to prevent duplication; granular groups below are the source of truth
const allPermissions = [];

const RolesAndPermissions = ({ user }) => {
  const [roles, setRoles] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [branches, setBranches] = useState([]);
  const [currentBranchId, setCurrentBranchId] = useState('');

  // Load branches and derive current branch id
  useEffect(() => {
    (async () => {
      try {
        const list = await api.branches.list();
        const arr = Array.isArray(list) ? list : [];
        setBranches(arr);
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
        const res = await api.roles.list({ branchId: bid, includeArchived: showArchived });
        setRoles(res || []);
      } catch (e) {
        toast({ title: 'Failed to load roles', description: String(e?.message || e), variant: 'destructive' });
      }
    };
    load();
  }, [currentBranchId, user?.branchId, user?.branch?.id, showArchived]);

  const saveRoles = (updatedRoles) => {
    setRoles(updatedRoles);
  };

  const handleAddRole = () => {
    setEditingRole(null);
    setIsModalOpen(true);
  };

  const handleEditRole = (role) => {
    setEditingRole(role);
    setIsModalOpen(true);
  };

  const handleDeleteRole = async (roleId) => {
    try {
      const resp = await api.roles.remove(roleId);
      if (resp?.archived) {
        // archived instead of delete (if assigned to users)
        setRoles(prev => prev.map(r => r.id === roleId ? { ...r, archived: true } : r));
        toast({ title: 'Role Archived', description: 'Role has users and was archived.' });
      } else {
        setRoles(prev => prev.filter(r => r.id !== roleId));
        toast({ title: 'Role Deleted', description: 'Role removed.' });
      }
    } catch (e) {
      toast({ title: 'Delete failed', description: String(e?.message || e), variant: 'destructive' });
    }
  };

  const handleSaveRole = async (roleData) => {
    try {
      const bid = currentBranchId || user?.branchId || user?.branch?.id;
      if (!bid) throw new Error('Missing branch');
      if (editingRole) {
        await api.roles.update(editingRole.id, { name: roleData.name, permissions: roleData.permissions });
        toast({ title: 'Role Updated', description: 'Role details have been saved.' });
      } else {
        await api.roles.create({ branchId: bid, name: roleData.name, permissions: roleData.permissions });
        toast({ title: 'Role Added', description: 'A new role has been created.' });
      }
      setIsModalOpen(false);
      const list = await api.roles.list({ branchId: bid, includeArchived: showArchived });
      setRoles(list || []);
    } catch (e) {
      toast({ title: 'Save failed', description: String(e?.message || e), variant: 'destructive' });
    }
  };
  
  const getRoleColor = (roleName) => {
    const colors = {
      'Manager': 'from-red-500 to-orange-500',
      'Cashier': 'from-green-500 to-emerald-500',
      'Barista': 'from-sky-500 to-cyan-500',
      'Waiter': 'from-lime-500 to-green-500',
      'Admin': 'from-violet-600 to-purple-600',
    };
    return colors[roleName] || 'from-slate-500 to-slate-600';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold gradient-text mb-2">Roles & Permissions</h2>
          <p className="text-gray-600">Define access levels for your team members.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Label className="text-sm">Branch</Label>
            <select value={currentBranchId} onChange={(e) => setCurrentBranchId(e.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm min-w-[12rem]">
              {branches.map(b => (<option key={b.id} value={b.id}>{b.name}</option>))}
            </select>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Label htmlFor="show-archived-roles">Show Archived</Label>
            <Switch id="show-archived-roles" checked={showArchived} onCheckedChange={setShowArchived} />
          </div>
          <Button onClick={handleAddRole} className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 gap-2">
            <ShieldPlus className="w-4 h-4" />
            Add Role
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roles.filter(r => showArchived ? true : !r.archived).map((role, index) => (
          <motion.div
            key={role.id}
            whileHover={{ scale: 1.02 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="glass-effect border-2 border-white/30 flex flex-col h-full">
              <CardHeader>
                <div className="flex items-center gap-4">
                   <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${getRoleColor(role.name)} flex items-center justify-center shadow-lg`}>
                    <Shield className="w-7 h-7 text-white" />
                  </div>
                  <CardTitle className="text-xl">{role.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-gray-600 mb-2">Permissions:</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {(role.permissions || []).map(p => <span key={p} className="text-xs bg-orange-100 text-orange-800 font-semibold px-2 py-0.5 rounded-full">{allPermissions.find(ap => ap.id === p)?.name || p}</span>)}
                  </div>
                </div>
                <div className="flex gap-2 pt-4 mt-4">
                  <Button onClick={() => handleEditRole(role)} variant="outline" size="sm" className="flex-1"><Edit className="w-3 h-3 mr-1.5" />Edit</Button>
                  <Button onClick={() => handleDeleteRole(role.id)} variant="destructive" size="sm" className="flex-1"><Trash2 className="w-3 h-3 mr-1.5" />Delete</Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
      <RoleFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveRole} role={editingRole} />
    </div>
  );
};

const RoleFormModal = ({ isOpen, onClose, onSave, role }) => {
  const [name, setName] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const allSelected = selectedPermissions.includes('all');

  const SELL_PERMS = [
    { label: 'View all sales', key: 'view_all_sales' },
    { label: 'View own sales', key: 'view_own_sales' },
    { label: 'Add sale', key: 'add_sale' },
    { label: 'Update sale', key: 'update_sale' },
    { label: 'Delete sale', key: 'delete_sale' },
    { label: 'Add sale payment', key: 'add_sale_payment' },
    { label: 'Edit sale payment', key: 'edit_sale_payment' },
    { label: 'Delete sale payment', key: 'delete_sale_payment' },
    { label: 'Edit product discount', key: 'edit_product_discount' },
    { label: 'Access all sale returns', key: 'access_all_sale_returns' },
  ];

  const TABLES_PERMS = [
    { label: 'View tables', key: 'view_tables' },
    { label: 'Add tables', key: 'add_tables' },
    { label: 'Edit/Update tables', key: 'edit_tables' },
    { label: 'Delete tables', key: 'delete_tables' },
  ];

  const OVERRIDE_PIN_PERMS = [
    { label: 'Add override pin', key: 'add_override_pin' },
    { label: 'Update override pin', key: 'update_override_pin' },
  ];

  const EMPLOYEE_PERMS = [
    { label: 'View employee', key: 'view_employee' },
    { label: 'Add employee', key: 'add_employee' },
    { label: 'Edit/Update employee', key: 'edit_employee' },
    { label: 'Delete employee', key: 'delete_employee' },
  ];

  const LEAVE_PERMS = [
    { label: 'View leave', key: 'view_leave' },
    { label: 'Add leave', key: 'add_leave' },
    { label: 'Edit/Update leave', key: 'edit_leave' },
    { label: 'Delete leave', key: 'delete_leave' },
  ];

  const SHIFT_PERMS = [
    { label: 'View shift', key: 'view_shift' },
    { label: 'Add shift', key: 'add_shift' },
    { label: 'Edit/Update shift', key: 'edit_shift' },
    { label: 'Delete shift', key: 'delete_shift' },
    { label: 'Assign shift', key: 'assign_shift' },
  ];

  const BRANCH_SECTION_PERMS = [
    { label: 'Add branch & section', key: 'add_branch_section' },
    { label: 'View branch & section', key: 'view_branch_section' },
    { label: 'Edit/Update branch & section', key: 'edit_branch_section' },
    { label: 'Delete branch & section', key: 'delete_branch_section' },
  ];

  const PURCHASE_PERMS = [
    { label: 'View all purchase', key: 'view_all_purchase' },
    { label: 'View own purchase', key: 'view_own_purchase' },
    { label: 'Add purchase', key: 'add_purchase' },
    { label: 'Edit purchase', key: 'edit_purchase' },
    { label: 'Delete purchase', key: 'delete_purchase' },
    { label: 'Add purchase payment', key: 'add_purchase_payment' },
    { label: 'Edit purchase payment', key: 'edit_purchase_payment' },
    { label: 'Delete purchase payment', key: 'delete_purchase_payment' },
    { label: 'Update status', key: 'update_purchase_status' },
    { label: 'Manage inventory', key: 'purchase_manage_inventory' },
  ];

  const OTHERS_PERMS = [
    { label: 'View export to buttons (csv/excel/print/pdf) on tables', key: 'view_export_buttons' },
  ];

  const USER_PERMS = [
    { label: 'View user', key: 'view_user' },
    { label: 'Add user', key: 'add_user' },
    { label: 'Edit user', key: 'edit_user' },
    { label: 'Delete user', key: 'delete_user' },
  ];

  const ROLES_PERMS = [
    { label: 'View role', key: 'view_role' },
    { label: 'Add Role', key: 'add_role' },
    { label: 'Edit Role', key: 'edit_role' },
    { label: 'Delete role', key: 'delete_role' },
  ];

  const DRAFT_PERMS = [
    { label: 'View all drafts', key: 'draft_view_all' },
    { label: 'View own drafts', key: 'draft_view_own' },
    { label: 'Edit draft', key: 'edit_draft' },
    { label: 'Delete draft', key: 'delete_draft' },
  ];

  const SUPPLIER_PERMS = [
    { label: 'View all supplier', key: 'view_all_supplier' },
    { label: 'View own supplier', key: 'view_own_supplier' },
    { label: 'Add supplier', key: 'add_supplier' },
    { label: 'Edit supplier', key: 'edit_supplier' },
    { label: 'Delete supplier', key: 'delete_supplier' },
  ];

  const UNIT_PERMS = [
    { label: 'View unit', key: 'view_unit' },
    { label: 'Add unit', key: 'add_unit' },
    { label: 'Edit unit', key: 'edit_unit' },
    { label: 'Delete unit', key: 'delete_unit' },
  ];

  const CATEGORY_PERMS = [
    { label: 'View category', key: 'view_category' },
    { label: 'Add category', key: 'add_category' },
    { label: 'Edit category', key: 'edit_category' },
    { label: 'Delete category', key: 'delete_category' },
  ];

  const PRODUCT_PERMS = [
    { label: 'View product', key: 'view_product' },
    { label: 'Add product', key: 'add_product' },
    { label: 'Edit product', key: 'edit_product' },
    { label: 'Delete product', key: 'delete_product' },
    { label: 'Section pricing', key: 'section_pricing' },
    { label: 'Stock transfer', key: 'stock_transfer' },
    { label: 'Stock adjustment', key: 'stock_adjustment' },
  ];

  const EXPENSE_PERMS = [
    { label: 'Access all expenses', key: 'access_all_expenses' },
    { label: 'View own expenses only', key: 'view_own_expenses_only' },
    { label: 'Add Expense', key: 'add_expense' },
    { label: 'Edit Expense', key: 'edit_expense' },
    { label: 'Delete Expense', key: 'delete_expense' },
  ];

  const HOME_PERMS = [
    { label: 'View Home data', key: 'view_home_data' },
  ];

  const BRAND_PERMS = [
    { label: 'View brand', key: 'view_brand' },
    { label: 'Add brand', key: 'add_brand' },
    { label: 'Edit brand', key: 'edit_brand' },
    { label: 'Delete brand', key: 'delete_brand' },
  ];

  const TAX_RATE_PERMS = [
    { label: 'View tax rate', key: 'view_tax_rate' },
    { label: 'Add tax rate', key: 'add_tax_rate' },
    { label: 'Edit tax rate', key: 'edit_tax_rate' },
    { label: 'Delete tax rate', key: 'delete_tax_rate' },
  ];

  const CUSTOMER_PERMS = [
    { label: 'View all customer', key: 'view_all_customer' },
    { label: 'View own customer', key: 'view_own_customer' },
    { label: 'View customers with no sell from one month only', key: 'view_no_sell_1_month' },
    { label: 'View customers with no sell from three months only', key: 'view_no_sell_3_months' },
    { label: 'View customers with no sell from six months only', key: 'view_no_sell_6_months' },
    { label: 'View customers with no sell from one year only', key: 'view_no_sell_1_year' },
    { label: 'View customers irrespective of their sell', key: 'view_no_sell_any' },
    { label: 'Add customer', key: 'add_customer' },
    { label: 'Edit customer', key: 'edit_customer' },
    { label: 'Delete customer', key: 'delete_customer' },
  ];

  const SETTINGS_PERMS = [
    { label: 'Access settings', key: 'settings' },
    { label: 'Access business settings', key: 'access_business_settings' },
    { label: 'Access barcode settings', key: 'access_barcode_settings' },
    { label: 'Access invoice settings', key: 'access_invoice_settings' },
    { label: 'Access printers', key: 'access_printers' },
  ];

  const REPORT_PERMS = [
    { label: 'View purchase & sell report', key: 'view_purchase_sell_report' },
    { label: 'View Tax report', key: 'view_tax_report' },
    { label: 'View Supplier & Customer report', key: 'view_supplier_customer_report' },
    { label: 'View expense report', key: 'view_expense_report' },
    { label: 'View profit/loss report', key: 'view_profit_loss_report' },
    { label: 'View stock report, stock adjustment report & stock expiry report', key: 'view_stock_related_reports' },
    { label: 'View trending product report', key: 'view_trending_product_report' },
    { label: 'View register report', key: 'view_register_report' },
    { label: 'View sales representative report', key: 'view_sales_rep_report' },
    { label: 'View product stock value', key: 'view_product_stock_value' },
    // Additional approved report permissions
    { label: 'View daily sales summary', key: 'view_daily_sales_summary' },
    { label: 'View branch sales report', key: 'view_branch_sales_report' },
    { label: 'View section sales report', key: 'view_section_sales_report' },
    { label: 'View category sales report', key: 'view_category_sales_report' },
    { label: 'View product performance report', key: 'view_product_performance_report' },
    { label: 'View returns report', key: 'view_returns_report' },
    { label: 'View discounts report', key: 'view_discounts_report' },
    { label: 'View voids report', key: 'view_voids_report' },
    { label: 'View payment methods report', key: 'view_payment_methods_report' },
    { label: 'View cash in/out report', key: 'view_cash_in_out_report' },
    { label: 'View customer aging report', key: 'view_customer_aging_report' },
    { label: 'View supplier aging report', key: 'view_supplier_aging_report' },
    { label: 'View purchase detail report', key: 'view_purchase_detail_report' },
    { label: 'View stock movement report', key: 'view_stock_movement_report' },
  ];

  const POS_PERMS = [
    { label: 'View POS sell', key: 'view_pos_sell' },
    { label: 'Add POS sell', key: 'add_pos_sell' },
    { label: 'Edit POS sell', key: 'edit_pos_sell' },
    { label: 'Delete POS sell', key: 'delete_pos_sell' },
    { label: 'Edit product price from POS screen', key: 'edit_pos_price' },
    { label: 'Edit product discount from POS screen', key: 'edit_pos_discount' },
    { label: 'Add/Edit Payment', key: 'add_edit_payment' },
    { label: 'Print Invoice', key: 'print_invoice' },
  ];

  useEffect(() => {
    if (role) {
      setName(role.name);
      setSelectedPermissions(role.permissions);
    } else {
      setName('');
      setSelectedPermissions([]);
    }
  }, [role, isOpen]);
  
  const handlePermissionToggle = (permissionId) => {
    setSelectedPermissions(prev => 
      prev.includes(permissionId) 
      ? prev.filter(p => p !== permissionId)
      : [...prev, permissionId]
    );
  };

  const handleSubmit = () => {
    // Require a role name
    if (!String(name || '').trim()) {
      toast({ title: 'Role name required', description: 'Please enter a name for this role.', variant: 'destructive' });
      return;
    }
    // If 'all' selected, only persist ['all'] to keep data clean
    const perms = selectedPermissions.includes('all') ? ['all'] : selectedPermissions;
    onSave({ name, permissions: perms });
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{role ? 'Edit Role' : 'Add New Role'}</DialogTitle>
          <DialogDescription>
            {role ? 'Update the name and permissions for this role.' : 'Define a new role and assign permissions.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-400 hover:scrollbar-thumb-gray-500 scrollbar-track-transparent">
          <div className="space-y-2">
            <Label htmlFor="role-name" className="font-semibold">Role name</Label>
            <Input id="role-name" placeholder="e.g., Manager" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2 p-3 border rounded-md bg-muted/30">
            <div className="flex items-center justify-between">
              <Label className="font-semibold">All permissions</Label>
              <Switch checked={selectedPermissions.includes('all')} onCheckedChange={(v) => setSelectedPermissions(v ? ['all'] : [])} />
            </div>
            <p className="text-xs text-muted-foreground">When enabled, this role bypasses granular checks and has full access everywhere.</p>
          </div>
          <div className="space-y-2">
            <Label>Permissions</Label>
            {/* POS permissions section */}
            <PermissionGroup
              title="POS"
              permissions={POS_PERMS}
              value={selectedPermissions}
              onChange={(next) => { setSelectedPermissions(next); try { console.log('selectedPermissions', next); } catch {} }}
            />
            {/* Settings permissions section */}
            <PermissionGroup
              title="Settings"
              permissions={SETTINGS_PERMS}
              value={selectedPermissions}
              onChange={setSelectedPermissions}
            />
            {/* Sell permissions section (grouped list with Select all) */}
            <PermissionList
              title="Sell"
              permissions={SELL_PERMS}
              value={selectedPermissions}
              onChange={setSelectedPermissions}
            />
            {/* Unit permissions */}
            <PermissionGroup
              title="Unit"
              permissions={UNIT_PERMS}
              value={selectedPermissions}
              onChange={setSelectedPermissions}
            />
            {/* Category permissions */}
            <PermissionGroup
              title="Category"
              permissions={CATEGORY_PERMS}
              value={selectedPermissions}
              onChange={setSelectedPermissions}
            />
            {/* Product permissions */}
            <PermissionGroup
              title="Product"
              permissions={PRODUCT_PERMS}
              value={selectedPermissions}
              onChange={setSelectedPermissions}
            />
            {/* Purchase permissions */}
            <PermissionGroup
              title="Purchase"
              permissions={PURCHASE_PERMS}
              value={selectedPermissions}
              onChange={setSelectedPermissions}
            />
            {/* Branch & Section permissions */}
            <PermissionGroup
              title="Branch & Section"
              permissions={BRANCH_SECTION_PERMS}
              value={selectedPermissions}
              onChange={setSelectedPermissions}
            />
            {/* Tables permissions */}
            <PermissionGroup
              title="Tables"
              permissions={TABLES_PERMS}
              value={selectedPermissions}
              onChange={setSelectedPermissions}
            />
            {/* Brand permissions */}
            <PermissionGroup
              title="Brand"
              permissions={BRAND_PERMS}
              value={selectedPermissions}
              onChange={setSelectedPermissions}
            />
            {/* Customer permissions with hover hint */}
            <PermissionGroup
              title="Customer"
              permissions={CUSTOMER_PERMS}
              value={selectedPermissions}
              onChange={setSelectedPermissions}
              hint="To view all customers with no sell from a specific time, 'View all customer' permission is required; otherwise it will filter with only customers created by the logged in user."
            />
            {/* Supplier permissions */}
            <PermissionGroup
              title="Supplier"
              permissions={SUPPLIER_PERMS}
              value={selectedPermissions}
              onChange={setSelectedPermissions}
            />
            {/* Tax rate permissions */}
            <PermissionGroup
              title="Tax rate"
              permissions={TAX_RATE_PERMS}
              value={selectedPermissions}
              onChange={setSelectedPermissions}
            />
            {/* Expense permissions */}
            <PermissionGroup
              title="Expense"
              permissions={EXPENSE_PERMS}
              value={selectedPermissions}
              onChange={setSelectedPermissions}
            />
            {/* Others permissions */}
            <PermissionGroup
              title="Others"
              permissions={OTHERS_PERMS}
              value={selectedPermissions}
              onChange={setSelectedPermissions}
            />
            {/* HRM: Employee */}
            <PermissionGroup
              title="HRM • Employee"
              permissions={EMPLOYEE_PERMS}
              value={selectedPermissions}
              onChange={setSelectedPermissions}
            />
            {/* HRM: Leave */}
            <PermissionGroup
              title="HRM • Leave"
              permissions={LEAVE_PERMS}
              value={selectedPermissions}
              onChange={setSelectedPermissions}
            />
            {/* HRM: Shift */}
            <PermissionGroup
              title="HRM • Shift"
              permissions={SHIFT_PERMS}
              value={selectedPermissions}
              onChange={setSelectedPermissions}
            />
            {/* Override PIN permissions */}
            <PermissionGroup
              title="Override PIN"
              permissions={OVERRIDE_PIN_PERMS}
              value={selectedPermissions}
              onChange={setSelectedPermissions}
            />
            {/* Home permissions with hover hint */}
            <PermissionGroup
              title="Home"
              permissions={HOME_PERMS}
              value={selectedPermissions}
              onChange={setSelectedPermissions}
              hint="if unchecked, only welcome message will be displayed in home"
            />
            {/* User permissions */}
            <PermissionGroup
              title="User"
              permissions={USER_PERMS}
              value={selectedPermissions}
              onChange={setSelectedPermissions}
            />
            {/* Roles permissions */}
            <PermissionGroup
              title="Roles"
              permissions={ROLES_PERMS}
              value={selectedPermissions}
              onChange={setSelectedPermissions}
            />
            {/* Draft permissions */}
            <PermissionGroup
              title="Draft"
              permissions={DRAFT_PERMS}
              value={selectedPermissions}
              onChange={setSelectedPermissions}
            />
            {/* Report permissions section */}
            <PermissionGroup
              title="Report"
              permissions={REPORT_PERMS}
              value={selectedPermissions}
              onChange={setSelectedPermissions}
            />
            {/* Cash Register permissions */}
            <PermissionGroup
              title="Cash Register"
              permissions={[
                { label: 'View cash register', key: 'view_cash_register' },
                { label: 'Open shift register', key: 'open_shift_register' },
                { label: 'Close cash register', key: 'close_cash_register' },
              ]}
              value={selectedPermissions}
              onChange={setSelectedPermissions}
            />
            <div className="grid grid-cols-2 gap-2 p-3 border rounded-md max-h-60 overflow-y-auto">
              {allPermissions.map(p => (
                <div key={p.id} className={`flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-muted ${allSelected ? 'opacity-60 pointer-events-none' : ''}`} onClick={() => handlePermissionToggle(p.id)}>
                  {selectedPermissions.includes(p.id) ? <CheckSquare className="w-5 h-5 text-primary" /> : <Square className="w-5 h-5 text-muted-foreground" />}
                  <span className="text-sm">{p.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit}>Save Role</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RolesAndPermissions;