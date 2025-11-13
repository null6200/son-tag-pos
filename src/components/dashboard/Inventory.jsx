import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Package, Plus, Edit, AlertTriangle, LayoutGrid, List } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';

const Inventory = ({ user }) => {
  const [inventory, setInventory] = useState([]);
  const [overview, setOverview] = useState([]); // aggregate rows: {productId, total, perSection}
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', quantity: '', minStock: '', unit: '' });
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('overview'); // 'overview' | 'list'
  const [search, setSearch] = useState('');
  const [lowStockThreshold, setLowStockThreshold] = useState(0);
  const [movements, setMovements] = useState([]);
  const [sectionsById, setSectionsById] = useState({});
  const [overviewPage, setOverviewPage] = useState(1);
  const [overviewPageSize, setOverviewPageSize] = useState(20);
  const [movementsPage, setMovementsPage] = useState(1);
  const [movementsPageSize, setMovementsPageSize] = useState(25);

  useEffect(() => {
    const load = async () => {
      let resolvedBranchId = user?.branchId || user?.branch?.id;
      if (!resolvedBranchId) {
        try {
          const me = await api.me();
          resolvedBranchId = me?.branchId || me?.branch?.id || null;
        } catch {}
      }
      setLoading(true);
      try {
        const [res, agg, prods, moves, secs] = await Promise.all([
          resolvedBranchId ? api.inventory.list({ branchId: resolvedBranchId }) : api.inventory.list({}),
          resolvedBranchId ? api.inventory.aggregate({ branchId: resolvedBranchId }) : api.inventory.aggregate({}),
          resolvedBranchId ? api.products.list({ branchId: resolvedBranchId, includeArchived: false }) : api.products.list({ includeArchived: false }),
          resolvedBranchId ? api.inventory.movements({ branchId: resolvedBranchId, limit: 200 }) : api.inventory.movements({ limit: 200 }),
          resolvedBranchId ? api.sections.list({ branchId: resolvedBranchId }) : Promise.resolve([]),
        ]);

        const productsArr = Array.isArray(prods?.items) ? prods.items : (Array.isArray(prods) ? prods : []);
        const invArr = Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : []);
        const aggArr = Array.isArray(agg?.items) ? agg.items : (Array.isArray(agg) ? agg : []);
        const movesArr = Array.isArray(moves?.items) ? moves.items : (Array.isArray(moves) ? moves : []);
        const nameById = Object.fromEntries((productsArr || []).map(p => [p.id, p.name]));
        const sectionsMap = Object.fromEntries(((Array.isArray(secs) ? secs : []) || []).map(s => [s.id, s.name]));
        setSectionsById(sectionsMap);

        // Index inventory quantities by productId
        const invById = {};
        (invArr || []).forEach(row => { invById[row.productId] = {
          qtyOnHand: Number(row.qtyOnHand || 0),
          minLevel: Number(row.minLevel || 0)
        }; });

        // Index aggregate totals by productId
        const aggById = {};
        (aggArr || []).forEach(r => { aggById[r.productId] = { total: Number(r.total || 0), perSection: r.perSection || {} }; });

        // Ensure inventory list shows ALL products
        const invMapped = (productsArr || []).map(p => {
          const rec = invById[p.id] || { qtyOnHand: 0, minLevel: 0 };
          return {
            id: p.id,
            name: p.name,
            quantity: rec.qtyOnHand,
            minStock: rec.minLevel,
            unit: 'unit',
          };
        });
        setInventory(invMapped);

        // Ensure overview shows ALL products
        const overviewRows = (productsArr || []).map(p => {
          const a = aggById[p.id] || { total: 0, perSection: {} };
          return { productId: p.id, name: p.name, total: a.total, perSection: a.perSection };
        });
        setOverview(overviewRows);

        setMovements(movesArr || []);
      } catch (err) {
        toast({ title: 'Failed to load inventory', description: String(err?.message || err), variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.branchId, user?.branch?.id]);

  // Derived/paginated data for Overview
  const filteredOverview = useMemo(() => {
    return (overview || [])
      .filter(r => !search || (r.name || '').toLowerCase().includes(search.toLowerCase()))
      .filter(r => Number.isFinite(Number(lowStockThreshold)) ? true : true);
  }, [overview, search, lowStockThreshold]);

  const overviewTotal = filteredOverview.length || 0;
  const overviewTotalPages = Math.max(1, Math.ceil(overviewTotal / overviewPageSize));
  const overviewStart = overviewTotal ? (overviewPage - 1) * overviewPageSize + 1 : 0;
  const overviewEnd = overviewTotal ? Math.min(overviewPage * overviewPageSize, overviewTotal) : 0;
  const overviewPageItems = filteredOverview.slice((overviewPage - 1) * overviewPageSize, overviewPage * overviewPageSize);

  useEffect(() => { setOverviewPage(1); }, [search, lowStockThreshold, overview.length]);

  // Pagination for movements
  const movementsTotal = movements.length || 0;
  const movementsTotalPages = Math.max(1, Math.ceil(movementsTotal / movementsPageSize));
  const movementsStart = movementsTotal ? (movementsPage - 1) * movementsPageSize + 1 : 0;
  const movementsEnd = movementsTotal ? Math.min(movementsPage * movementsPageSize, movementsTotal) : 0;
  const movementsPageItems = movements.slice((movementsPage - 1) * movementsPageSize, movementsPage * movementsPageSize);

  useEffect(() => { setMovementsPage(1); }, [movements.length]);

  const handleAddItem = async () => {
    if (!newItem.name || !newItem.quantity) {
      toast({ title: 'Please provide at least a name and quantity', variant: 'destructive' });
      return;
    }
    const resolvedBranchId = user?.branchId || user?.branch?.id;
    if (!resolvedBranchId) {
      toast({ title: 'Missing branch', description: 'User branch is not set', variant: 'destructive' });
      return;
    }
    try {
      setLoading(true);
      // Create product with zero pricing for now; can be edited later
      const sku = `${newItem.name}-${Date.now()}`.replace(/\s+/g, '-').toUpperCase();
      const product = await api.products.create({
        name: newItem.name,
        sku,
        category: newItem.unit || undefined,
        price: '0.00',
        taxRate: '0.00',
        branchId: resolvedBranchId,
      });
      // Seed stock by delta
      const qty = parseInt(newItem.quantity, 10) || 0;
      if (qty > 0) {
        await api.inventory.adjust(product.id, resolvedBranchId, qty);
      }
      // Reload
      const res = await api.inventory.list({ branchId: resolvedBranchId });
      const mapped = res.map((row) => ({
        id: row.productId,
        name: row.product?.name || 'Product',
        quantity: row.qtyOnHand,
        minStock: row.minLevel ?? 0,
        unit: 'unit',
      }));
      setInventory(mapped);
      setNewItem({ name: '', quantity: '', minStock: '', unit: '' });
      setShowAddForm(false);
      toast({ title: 'Item added successfully! ✅' });
    } catch (err) {
      toast({ title: 'Failed to add item', description: String(err?.message || err), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const updateStock = async (id, delta) => {
    const resolvedBranchId = user?.branchId || user?.branch?.id;
    if (!resolvedBranchId) return;
    try {
      await api.inventory.adjust(id, resolvedBranchId, delta);
      setInventory(prev => prev.map(item => item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item));
    } catch (err) {
      toast({ title: 'Stock update failed', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold gradient-text mb-2">Inventory Management</h2>
          <p className="text-gray-600">Track and manage your stock levels</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={viewMode === 'overview' ? 'default' : 'outline'} onClick={() => setViewMode('overview')} className="gap-2"><LayoutGrid className="w-4 h-4" /> Overview</Button>
          <Button variant={viewMode === 'list' ? 'default' : 'outline'} onClick={() => setViewMode('list')} className="gap-2"><List className="w-4 h-4" /> List</Button>
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </Button>
        </div>
      </div>

      {showAddForm && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="glass-effect border-2 border-white/30">
            <CardHeader>
              <CardTitle className="gradient-text">Add New Item</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  placeholder="Item name"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                />
                <Input
                  type="number"
                  placeholder="Quantity"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                />
                <Input
                  type="number"
                  placeholder="Minimum stock"
                  value={newItem.minStock}
                  onChange={(e) => setNewItem({ ...newItem, minStock: e.target.value })}
                />
                <Input
                  placeholder="Unit (kg, liters, etc.)"
                  value={newItem.unit}
                  onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                />
              </div>
              <div className="flex gap-3 mt-4">
                <Button onClick={handleAddItem} className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600">
                  Add Item
                </Button>
                <Button onClick={() => setShowAddForm(false)} variant="outline" className="flex-1">
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {viewMode === 'overview' && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Input placeholder="Search product" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Low stock when total ≤</span>
              <Input type="number" value={lowStockThreshold} onChange={(e) => setLowStockThreshold(Number(e.target.value)||0)} className="w-24" />
            </div>
          </div>
          <div className="overflow-auto rounded-lg border max-h-96">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left p-3">Product</th>
                  <th className="text-right p-3">Total</th>
                  <th className="text-left p-3">Per Section</th>
                </tr>
              </thead>
              <tbody>
                {overviewPageItems.map((r) => {
                    const isLow = Number(r.total||0) <= Number(lowStockThreshold||0);
                    return (
                      <tr key={r.productId} className={isLow ? 'bg-red-50/60' : ''}>
                        <td className="p-3 font-medium">{r.name}</td>
                        <td className="p-3 text-right font-semibold">{Number(r.total||0)}</td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(r.perSection || {}).map(([sec, qty]) => (
                              <span key={sec} className="px-2 py-1 rounded bg-muted text-xs">{sec}: {Number(qty||0)}</span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between pt-2 text-sm">
            <div>{overviewStart}
              <span className="px-1">–</span>
              {overviewEnd} of {overviewTotal}
              <span className="px-2 text-muted-foreground">•</span>
              {overviewPageSize} per page
            </div>
            <div className="space-x-2">
              <Button variant="outline" size="sm" onClick={() => setOverviewPage(p => Math.max(1, p - 1))} disabled={overviewPage <= 1}>Previous</Button>
              <Button variant="outline" size="sm" onClick={() => setOverviewPage(p => Math.min(overviewTotalPages, p + 1))} disabled={overviewPage >= overviewTotalPages}>Next</Button>
            </div>
          </div>
        </div>
      )}

      {loading && <p>Loading...</p>}
      {viewMode === 'list' && (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {inventory.map((item) => {
          const isLowStock = item.quantity <= item.minStock;
          
          return (
            <motion.div
              key={item.id}
              whileHover={{ scale: 1.02 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Card className={`glass-effect border-2 ${isLowStock ? 'border-red-300' : 'border-white/30'}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${isLowStock ? 'from-red-500 to-orange-600' : 'from-purple-500 to-pink-600'} flex items-center justify-center shadow-lg`}>
                        <Package className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{item.name}</CardTitle>
                        <p className="text-xs text-gray-500">{item.unit}</p>
                      </div>
                    </div>
                    {isLowStock && (
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Current Stock</p>
                      <p className="text-2xl font-bold gradient-text">{item.quantity} {item.unit}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Min Stock: {item.minStock} {item.unit}</p>
                      {isLowStock && (
                        <p className="text-xs text-red-600 font-semibold mt-1">⚠️ Low stock alert!</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => updateStock(item.id, -1)}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        -1
                      </Button>
                      <Button
                        onClick={() => updateStock(item.id, 1)}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        +1
                      </Button>
                      <Button
                        onClick={() => toast({ title: "🚧 This feature isn't implemented yet—but don't worry! You can request it in your next prompt! 🚀" })}
                        variant="outline"
                        size="sm"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
      )}

      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Recent Stock Movements</h3>
        <div className="overflow-auto rounded-lg border max-h-96">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left p-3">Time</th>
                <th className="text-left p-3">Product</th>
                <th className="text-left p-3">Reason</th>
                <th className="text-left p-3">From → To</th>
                <th className="text-right p-3">Delta</th>
                <th className="text-left p-3">Ref</th>
              </tr>
            </thead>
            <tbody>
              {movementsPageItems.map((m) => {
                const fromName = m.sectionFrom ? (sectionsById[m.sectionFrom] || m.sectionFrom) : '—';
                const toName = m.sectionTo ? (sectionsById[m.sectionTo] || m.sectionTo) : '—';
                return (
                <tr key={m.id}>
                  <td className="p-3">{new Date(m.createdAt).toLocaleString()}</td>
                  <td className="p-3">{(overview.find(o => o.productId === m.productId)?.name) || m.productId}</td>
                  <td className="p-3">{m.reason}</td>
                  <td className="p-3">{fromName} → {toName}</td>
                  <td className="p-3 text-right {m.delta < 0 ? 'text-red-600' : 'text-green-700'}">{m.delta}</td>
                  <td className="p-3">{m.referenceId || '—'}</td>
                </tr>
              );})}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between pt-2 text-sm">
          <div>{movementsStart}
            <span className="px-1">–</span>
            {movementsEnd} of {movementsTotal}
            <span className="px-2 text-muted-foreground">•</span>
            {movementsPageSize} per page
          </div>
          <div className="space-x-2">
            <Button variant="outline" size="sm" onClick={() => setMovementsPage(p => Math.max(1, p - 1))} disabled={movementsPage <= 1}>Previous</Button>
            <Button variant="outline" size="sm" onClick={() => setMovementsPage(p => Math.min(movementsTotalPages, p + 1))} disabled={movementsPage >= movementsTotalPages}>Next</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Inventory;