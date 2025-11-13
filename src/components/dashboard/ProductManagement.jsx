import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, PlusCircle, Edit, Trash2, Repeat, ArrowRight, Package, Box, Warehouse, Calendar, Plus, SlidersHorizontal, ArrowUp, ArrowDown, FileText, Award, Eye, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from '@/components/ui/switch';
import { api, getApiBaseUrl } from '@/lib/api';
import { RequirePermission } from '@/lib/permissions';
import ProductOverview from '@/components/dashboard/ProductOverview';



const ProductManagement = ({ user }) => {
  const [activeTab, setActiveTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [stockLevels, setStockLevels] = useState({});
  const [adjustments, setAdjustments] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [sectionPrices, setSectionPrices] = useState({});
  const [allowOverselling, setAllowOverselling] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const prodCacheKey = () => '';
  const stockCacheKey = () => '';

  // Rebuild stock levels from backend per-section inventories (root-level so it can be reused)
  const rebuildSectionStock = async () => {
    try {
      const invMap = {};
      const agg = await api.inventory.aggregate({ branchId: user?.branchId || undefined });
      (agg || []).forEach((entry) => {
        const per = entry.perSection || {};
        invMap[entry.productId] = {};
        Object.entries(per).forEach(([secName, qty]) => {
          invMap[entry.productId][secName] = qty;
        });
      });
      if (Object.keys(invMap).length > 0) {
        setStockLevels(invMap);
        return invMap;
      }
      // Fallback: scan all sections and build map manually
      try {
        const sections = await api.sections.list({ branchId: user?.branchId || undefined });
        const manual = {};
        await Promise.all((sections || []).map(async (s) => {
          const rows = await api.inventory.listBySection({ sectionId: s.id });
          (rows || []).forEach((row) => {
            if (!manual[row.productId]) manual[row.productId] = {};
            manual[row.productId][s.name] = row.qtyOnHand;
          });
        }));
        if (Object.keys(manual).length > 0) {
          setStockLevels(manual);
          return manual;
        }
      } catch {}
      // Fallback 2: branch-level inventory
      try {
        const branchInv = await api.inventory.list({ branchId: user?.branchId || undefined });
        const byProduct = {};
        (branchInv || []).forEach((row) => {
          if (!byProduct[row.productId]) byProduct[row.productId] = {};
          byProduct[row.productId]['Branch'] = (byProduct[row.productId]['Branch'] || 0) + Number(row.qtyOnHand || 0);
        });
        if (Object.keys(byProduct).length > 0) {
          setStockLevels(byProduct);
          return byProduct;
        }
      } catch {}
      // keep existing state if nothing found
      return undefined;
    } catch (e) {
      // fallback ignored
    }
  };

  // Build sectionPrices map: { [productId]: { [sectionName]: priceNumber } }
  const rebuildSectionPrices = async () => {
    try {
      const sections = await api.sections.list({ branchId: user?.branchId || undefined });
      const result = {};
      await Promise.all((sections || []).map(async (s) => {
        const map = await api.prices.effective({ branchId: user?.branchId || undefined, sectionId: s.id });
        // map: { productId: number }
        Object.entries(map || {}).forEach(([pid, price]) => {
          if (!result[pid]) result[pid] = {};
          const n = Number(price);
          result[pid][s.name] = Number.isFinite(n) ? n : 0;
        });
      }));
      setSectionPrices(result);
      return result;
    } catch (e) {
      // leave previous prices if any
      return undefined;
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        // Fresh load from backend (let backend derive branch when not provided)
        const prods = await api.products.list({ branchId: user?.branchId || undefined, includeArchived: showArchived });
        setProducts(prods || []);
        // Build stock from section inventories to reflect real quantities
        const map = await rebuildSectionStock();
        if (map && Object.keys(map).length > 0) {}
        // Build section-based prices so ProductView shows persisted values
        await rebuildSectionPrices();
      } catch (e) {
        toast({ title: 'Load failed', description: String(e?.message || e), variant: 'destructive' });
        // Keep last known products/stock on error
      }
      // Strict backend loading for adjustments and settings happens in separate effects
    };
    load();
  }, [user?.branchId, showArchived]);

  const updateProducts = (newProducts) => {
    setProducts(newProducts);
  };

  const updateStockLevels = (newStockLevels) => {
    setStockLevels(newStockLevels);
  };

  const updateSectionPrices = (newPrices) => {
    setSectionPrices(newPrices);
  };

  const addAdjustment = (newAdjustment) => {
    // UI append; actual history is loaded from backend in reloadAdjustments()
    setAdjustments(prev => [newAdjustment, ...prev]);
  };

  // Reload transfers from backend
  const reloadTransfers = async () => {
    try {
      if (!user?.branchId) { setTransfers([]); return; }
      const res = await (api.inventory?.transfers?.list?.({ branchId: user.branchId }));
      const items = Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : []);
      const mapped = items.map(t => ({
        id: t.id || `ST-${Date.now()}`,
        from: t.fromSectionName || t.fromSection || t.from,
        to: t.toSectionName || t.toSection || t.to,
        date: t.createdAt || t.date || new Date().toISOString(),
        status: t.status || 'Completed',
        items: Array.isArray(t.items) ? t.items.map(it => ({
          productId: it.productId,
          name: it.productName || it.name,
          quantity: it.qty || it.quantity || 0,
        })) : [],
      }));
      setTransfers(mapped);
    } catch { setTransfers([]); }
  };

  useEffect(() => { reloadTransfers(); }, [user?.branchId]);

  // Load overselling strictly from backend
  useEffect(() => {
    (async () => {
      try {
        if (!user?.branchId) { setAllowOverselling(false); return; }
        let settings = await (api.settings?.get?.({ branchId: user.branchId }));
        if (!settings && api.inventory?.settings?.get) settings = await api.inventory.settings.get({ branchId: user.branchId });
        if (settings && Object.prototype.hasOwnProperty.call(settings, 'allowOverselling')) {
          setAllowOverselling(!!settings.allowOverselling);
        }
      } catch {}
    })();
  }, [user?.branchId]);

  // Reload adjustments from backend
  const reloadAdjustments = async () => {
    try {
      if (!user?.branchId) { setAdjustments([]); return; }
      const res = await (api.inventory?.adjustments?.list?.({ branchId: user.branchId }));
      const items = Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : []);
      // Normalize to current display shape when possible
      const mapped = items.map(it => ({
        id: it.id || `SA-${Date.now()}`,
        productId: it.productId,
        productName: it.productName || it.name || 'Product',
        section: it.sectionName || it.section || '',
        type: it.delta >= 0 ? 'add' : 'remove',
        quantity: Math.abs(Number(it.delta || it.qty || 0)),
        reason: it.reason || 'Adjustment',
        date: it.createdAt || new Date().toISOString(),
        previousStock: it.previousStock ?? 0,
        newStock: it.newStock ?? 0,
      }));
      setAdjustments(mapped);
    } catch { setAdjustments([]); }
  };

  useEffect(() => { reloadAdjustments(); }, [user?.branchId]);
  
  const handleToggleOverselling = async (value) => {
    const isAllowed = value === 'true';
    try {
      if (!user?.branchId) return;
      if (api.settings?.update) {
        await api.settings.update({ branchId: user.branchId, allowOverselling: isAllowed });
      } else if (api.inventory?.settings?.setAllowOverselling) {
        await api.inventory.settings.setAllowOverselling({ branchId: user.branchId, allowOverselling: isAllowed });
      }
      setAllowOverselling(isAllowed);
      toast({ title: `Overselling ${isAllowed ? 'Enabled' : 'Disabled'}`, description: `You can now ${isAllowed ? '' : 'no longer '}sell products that are out of stock.` });
    } catch (e) {
      toast({ title: 'Failed to update setting', description: String(e?.message || e), variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-start">
            <div>
                <h2 className="text-3xl font-bold gradient-text mb-2">Product & Stock</h2>
                <p className="text-muted-foreground">Manage all your products and stock movements.</p>
            </div>
            <Card className="p-3 glass-effect flex items-center gap-4">
                <Label htmlFor="overselling-toggle" className="font-semibold">Allow Overselling</Label>
                <RadioGroup 
                  defaultValue={allowOverselling ? 'true' : 'false'} 
                  value={allowOverselling ? 'true' : 'false'} 
                  onValueChange={handleToggleOverselling} 
                  className="flex"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="true" id="overselling-yes" />
                    <Label htmlFor="overselling-yes">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="false" id="overselling-no" />
                    <Label htmlFor="overselling-no">No</Label>
                  </div>
                </RadioGroup>
            </Card>
        </div>


      <div className="flex space-x-2 border-b">
        <TabButton icon={ShoppingBag} label="Products" isActive={activeTab === 'products'} onClick={() => setActiveTab('products')} />
        <TabButton icon={DollarSign} label="Section Pricing" isActive={activeTab === 'pricing'} onClick={() => setActiveTab('pricing')} />
        <TabButton icon={Repeat} label="Stock Transfer" isActive={activeTab === 'transfer'} onClick={() => setActiveTab('transfer')} />
        <TabButton icon={SlidersHorizontal} label="Stock Adjustment" isActive={activeTab === 'adjustment'} onClick={() => setActiveTab('adjustment')} />
      </div>

      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {activeTab === 'products' && <ProductList products={products} setProducts={updateProducts} stockLevels={stockLevels} setStockLevels={updateStockLevels} user={user} addAdjustment={addAdjustment} sectionPrices={sectionPrices} rebuildSectionStock={rebuildSectionStock} stockCacheKey={stockCacheKey} prodCacheKey={prodCacheKey} showArchived={showArchived} setShowArchived={setShowArchived} />}
        {activeTab === 'pricing' && <SectionPricing products={products} sectionPrices={sectionPrices} updateSectionPrices={updateSectionPrices} user={user} />}
        {activeTab === 'transfer' && <StockTransfer user={user} products={products} stockLevels={stockLevels} updateStockLevels={updateStockLevels} rebuildSectionStock={rebuildSectionStock} stockCacheKey={stockCacheKey} transfers={transfers} onTransfersChanged={reloadTransfers} />}
        {activeTab === 'adjustment' && <StockAdjustment products={products} stockLevels={stockLevels} updateStockLevels={updateStockLevels} adjustments={adjustments} addAdjustment={addAdjustment} />}
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


const ProductList = ({ products, setProducts, stockLevels, setStockLevels, user, addAdjustment, sectionPrices, rebuildSectionStock, stockCacheKey, prodCacheKey, showArchived, setShowArchived }) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isAddStockModalOpen, setIsAddStockModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [viewingProduct, setViewingProduct] = useState(null);
  const [stockingProduct, setStockingProduct] = useState(null);

  const handleAddProduct = () => {
    setEditingProduct(null);
    setIsAddModalOpen(true);
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setIsAddModalOpen(true);
  };

  const handleViewProduct = (product) => {
    setViewingProduct(product);
    setIsViewModalOpen(true);
  };

  const handleAddStock = (product) => {
    setStockingProduct(product);
    setIsAddStockModalOpen(true);
  };

  const handleDeleteProduct = (productId) => {
    (async () => {
      try {
        const resp = await api.products.remove(productId);
        if (resp && resp.archived) {
          // Archived due to sales history
          const updated = products.map(p => p.id === productId ? { ...p, archived: true } : p);
          setProducts(updated);
          toast({ title: 'Product Archived', description: 'Product has sales history and was archived instead of deleted.' });
          try { window.dispatchEvent(new Event('productsChanged')); } catch {}
        } else {
          // Fully deleted
          const remaining = products.filter(p => p.id !== productId);
          setProducts(remaining);
          const ns = { ...stockLevels };
          delete ns[productId];
          setStockLevels(ns);
          if (user?.branchId) {}
          toast({ title: 'Product Deleted', description: 'The product and its stock have been removed.' });
          try { window.dispatchEvent(new Event('productsChanged')); } catch {}
        }
      } catch (e) {
        toast({ title: 'Delete failed', description: String(e?.message || e), variant: 'destructive' });
      }
    })();
  };
  const handleSaveProduct = async (productData, initialStock, branchSection, imageFile) => {
    try {
      if (editingProduct) {
        await api.products.update(editingProduct.id, {
          name: productData.name,
          category: productData.category,
          subCategory: productData.subCategory,
        });
        // Upload image if provided
        if (imageFile) {
          try { await api.products.uploadImage(editingProduct.id, imageFile); } catch (e) { toast({ title: 'Image upload failed', description: String(e?.message || e) }); }
        }
        const refreshed = await api.products.list({ branchId: user?.branchId || undefined });
        setProducts(refreshed || []);
        toast({ title: 'Product Updated', description: 'Product details have been saved.' });
        try { window.dispatchEvent(new Event('productsChanged')); } catch {}
      } else {
        const created = await api.products.create({
          name: productData.name,
          category: productData.category,
          subCategory: productData.subCategory,
          price: '0',
          taxRate: '0',
          branchId: user?.branchId || undefined,
          productTypeId: productData.productTypeId,
          // Prefer names at API boundary when available
          productTypeName: (() => {
            try {
              const pt = (window.__lastProductTypes || []).find?.(p => p.id === productData.productTypeId);
              return pt?.name;
            } catch { return undefined; }
          })(),
          initialSectionId: branchSection || undefined,
          initialQty: String(parseInt(initialStock, 10) || 0),
        });
        if (imageFile && created?.id) {
          try { await api.products.uploadImage(created.id, imageFile); } catch (e) { toast({ title: 'Image upload failed', description: String(e?.message || e) }); }
        }
        const prods = await api.products.list({ branchId: user?.branchId || undefined });
        setProducts(prods || []);
        const map = await rebuildSectionStock();
        if (map) {}
        toast({ title: 'Product Added', description: 'A new product has been created.' });
        try { window.dispatchEvent(new Event('productsChanged')); } catch {}
      }
    } catch (e) {
      toast({ title: 'Save failed', description: String(e?.message || e), variant: 'destructive' });
    }
    setIsAddModalOpen(false);
  };

  const getStationColor = (station) => {
    const colors = {
      'bar': 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
      'kitchen': 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
      'neutral': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    return colors[station] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  };

  const getTotalStock = (productId) => {
    const productStock = stockLevels[productId] || {};
    return Object.values(productStock).reduce((sum, qty) => sum + qty, 0);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h3 className="text-xl font-semibold">Product List</h3>
            <div className="flex items-center gap-2 text-sm">
              <Label htmlFor="show-archived">Show Archived</Label>
              <Switch id="show-archived" checked={showArchived} onCheckedChange={setShowArchived} />
            </div>
          </div>
          <RequirePermission perms={user?.permissions} anyOf={["add_product"]}>
            <Button onClick={handleAddProduct} className="gap-2">
              <PlusCircle className="w-4 h-4" />
              Add Product
            </Button>
          </RequirePermission>
      </div>

      {/* Product Overview section (table with search/filter/sort/pagination) */}
      <div className="mb-8">
        <ProductOverview
          products={products.filter(p => showArchived ? true : !p.archived)}
          stockLevels={stockLevels}
          onAdd={handleAddProduct}
          onEdit={handleEditProduct}
          onDelete={handleDeleteProduct}
          onView={handleViewProduct}
          user={user}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.filter(p => showArchived ? true : !p.archived).map((product, index) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="glass-effect border-2 border-white/30 dark:border-slate-700/50 flex flex-col h-full">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-16 h-16 rounded-md border overflow-hidden flex items-center justify-center bg-muted">
                    {product.imageUrl ? (
                      (() => {
                        const base = getApiBaseUrl();
                        const u = product.imageUrl;
                        const abs = /^https?:\/\//i.test(u) ? u : `${base}${u?.startsWith('/') ? '' : '/'}${u || ''}`;
                        return (<img src={abs} alt={product.name} className="w-full h-full object-cover" />);
                      })()
                    ) : (
                      <Package className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 text-right">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${getStationColor(product.station)}`}>
                      {product.station?.toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{product.name}</CardTitle>
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                    <p className="flex items-center gap-1.5"><Package className="w-3.5 h-3.5" /> {product.category}{product.subCategory ? ` / ${product.subCategory}` : ''}</p>
                    <p className="flex items-center gap-1.5"><Award className="w-3.5 h-3.5" /> {product.brand}</p>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between">
                <div className="flex justify-between items-center text-gray-800 dark:text-gray-200">
                  <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                    <Warehouse className="w-4 h-4" /> Total Stock
                  </span>
                  <span className="text-lg font-bold">{getTotalStock(product.id)}</span>
                </div>
                <div className="flex flex-wrap gap-2 pt-4 mt-4">
                  <Button onClick={() => handleViewProduct(product)} variant="outline" size="sm" className="flex-1"><Eye className="w-3 h-3 mr-1.5" />View</Button>
                  <RequirePermission perms={user?.permissions} anyOf={["stock_adjustment"]}>
                    <Button onClick={() => handleAddStock(product)} variant="outline" size="sm" className="flex-1"><Plus className="w-3 h-3 mr-1.5" />Add Stock</Button>
                  </RequirePermission>
                  <RequirePermission perms={user?.permissions} anyOf={["edit_product"]}>
                    <Button onClick={() => handleEditProduct(product)} variant="outline" size="sm" className="flex-1"><Edit className="w-3 h-3 mr-1.5" />Edit</Button>
                  </RequirePermission>
                  <RequirePermission perms={user?.permissions} anyOf={["delete_product"]}>
                    <Button onClick={() => handleDeleteProduct(product.id)} variant="destructive" size="sm" className="flex-1"><Trash2 className="w-3 h-3 mr-1.5" />Delete</Button>
                  </RequirePermission>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
      <ProductFormModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSave={handleSaveProduct} product={editingProduct} user={user} />
      <ProductViewModal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} product={viewingProduct} stockLevels={stockLevels} sectionPrices={sectionPrices} />
      <AddStockModal isOpen={isAddStockModalOpen} onClose={() => setIsAddStockModalOpen(false)} product={stockingProduct} stockLevels={stockLevels} updateStockLevels={setStockLevels} addAdjustment={addAdjustment} user={user} rebuild={rebuildSectionStock} stockCacheKeyFn={stockCacheKey} />
    </>
  );
};

const ProductFormModal = ({ isOpen, onClose, onSave, product, user }) => {
  const [formData, setFormData] = useState({ name: '', category: '', subCategory: '', brand: '', stock: '', productTypeId: '', branchSection: '' });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [allBranchSections, setAllBranchSections] = useState([]);
  const [availableSections, setAvailableSections] = useState([]);
  const [productTypes, setProductTypes] = useState([]);

  useEffect(() => {
    const load = async () => {
      if (isOpen && user) {
        // Strict backend: load option lists from API, let backend derive branch when needed
        try {
          const res = await api.categories.list({ branchId: user?.branchId || undefined });
          const items = Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : []);
          setCategories(items.map(c => ({ id: c.id, name: c.name })));
        } catch { setCategories([]); }
        try {
          const res = await api.subcategories?.list?.({ branchId: user?.branchId || undefined });
          const items = Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : []);
          setSubCategories(items.map(sc => ({ id: sc.id, name: sc.name })));
        } catch { setSubCategories([]); }
        try {
          const res = await api.brands?.list?.({ branchId: user?.branchId || undefined });
          const items = Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : []);
          setBrands(items.map(b => ({ id: b.id, name: b.name })));
        } catch { setBrands([]); }
        try {
          const sections = await api.sections.list({ branchId: user?.branchId || undefined });
          setAllBranchSections(Array.isArray(sections) ? sections : []);
        } catch {
          setAllBranchSections([]);
        }
        try {
          const pts = await api.productTypes.list({ branchId: user?.branchId || undefined });
          const items = Array.isArray(pts?.items) ? pts.items : (Array.isArray(pts) ? pts : []);
          setProductTypes(items);
        } catch {
          setProductTypes([]);
        }

        if (product) {
          setFormData({ 
            name: product.name || '', 
            category: product.category || '', 
            subCategory: product.subCategory || '', 
            brand: product.brand || '', 
            stock: '', 
            productTypeId: product.productTypeId || '',
            branchSection: '' 
          });
          // Show existing product image; absolutize relative URLs for preview
          try {
            const base = getApiBaseUrl();
            const raw = product.imageUrl || '';
            const abs = /^https?:\/\//i.test(raw) ? raw : (raw ? `${base}${raw.startsWith('/') ? '' : '/'}${raw}` : '');
            setImagePreview(abs);
          } catch {
            setImagePreview(product.imageUrl || '');
          }
        } else {
          setFormData({ name: '', category: '', subCategory: '', brand: '', stock: '', productTypeId: '', branchSection: '' });
          setImagePreview('');
          setImageFile(null);
        }
      }
    };
    load();
  }, [product, isOpen, user]);

  useEffect(() => {
    (async () => {
      if (!isOpen) return;
      if (!formData.productTypeId) { setAvailableSections([]); return; }
      const pt = productTypes.find(p => p.id === formData.productTypeId);
      try {
        // Trust backend to compute allowed sections from links
        const resp = await api.sections.listAllowed({ branchId: user?.branchId || undefined, productTypeId: formData.productTypeId });
        let list = Array.isArray(resp?.items) ? resp.items : (Array.isArray(resp) ? resp : []);
        // If empty and product type is explicitly neutral (no links), show all sections
        const isNeutral = Array.isArray(pt?.productTypeLinks) && pt.productTypeLinks.length === 0;
        if ((!list || list.length === 0) && isNeutral) {
          try {
            const secsAll = await api.sections.list({ branchId: user?.branchId || undefined });
            list = Array.isArray(secsAll) ? secsAll : [];
          } catch { list = []; }
        }
        setAvailableSections(list || []);
        if (formData.branchSection && !(list || []).find(s => s.id === formData.branchSection)) {
          handleSelectChange('branchSection', '');
        }
      } catch {
        // On error, keep empty unless type is explicitly neutral; then show all
        const isNeutral = Array.isArray(pt?.productTypeLinks) && pt.productTypeLinks.length === 0;
        setAvailableSections(isNeutral ? (allBranchSections || []) : []);
        if (!isNeutral && formData.branchSection) handleSelectChange('branchSection', '');
      }
    })();
  }, [formData.productTypeId, isOpen, user, productTypes, allBranchSections]);


  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  

  const handleSubmit = () => {
    const { stock, branchSection, ...productData } = formData;
    
    if (!product) { // Only for new products
        if (!formData.productTypeId) {
            toast({ title: "Product Type Required", description: "Please select a product type.", variant: "destructive" });
            return;
        }
        if (!branchSection) {
          toast({
            title: "Branch Section Required",
            description: `Please select a section for the product.`,
            variant: "destructive",
          });
          return;
        }
    }

    const processedData = {
        ...productData,
        // base price removed; pricing will be managed in Section Pricing
        productTypeId: formData.productTypeId || undefined,
    };
    onSave(processedData, parseInt(stock, 10) || 0, branchSection, imageFile);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{product ? 'Edit Product' : 'Add New Product'}</DialogTitle>
          <DialogDescription>
            {product ? 'Update the details for this product.' : 'Fill in the details for the new product.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Image upload with 1:1 ratio preview (fits product card) */}
          <div className="grid grid-cols-4 items-start gap-4">
            <Label className="text-right">Image</Label>
            <div className="col-span-3">
              <div className="w-32 h-32 rounded-md border bg-muted overflow-hidden flex items-center justify-center">
                {imagePreview ? (
                  <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-xs text-muted-foreground">1:1 image</div>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  setImageFile(f || null);
                  if (f) {
                    const url = URL.createObjectURL(f);
                    setImagePreview(url);
                  } else {
                    setImagePreview('');
                  }
                }}
                className="mt-2 text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">Square image recommended (1:1), e.g., 512×512. Fits product cards.</p>
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Name</Label>
            <Input id="name" value={formData.name} onChange={handleChange} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="category" className="text-right">Category</Label>
            <Select value={formData.category} onValueChange={(value) => handleSelectChange('category', value)}>
                <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                    {categories.map(cat => <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>)}
                </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="subCategory" className="text-right">Sub Category</Label>
            <Select value={formData.subCategory} onValueChange={(value) => handleSelectChange('subCategory', value)}>
                <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select a sub category" />
                </SelectTrigger>
                <SelectContent>
                    {subCategories.map(sc => <SelectItem key={sc.id} value={sc.name}>{sc.name}</SelectItem>)}
                </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="brand" className="text-right">Brand</Label>
            <Select value={formData.brand} onValueChange={(value) => handleSelectChange('brand', value)}>
                <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select a brand" />
                </SelectTrigger>
                <SelectContent>
                    {brands.map(br => <SelectItem key={br.id} value={br.name}>{br.name}</SelectItem>)}
                </SelectContent>
            </Select>
          </div>
          {/* Base Price removed; price will be assigned per-section via Section Pricing */}
           <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="productType" className="text-right">Product Type</Label>
            <Select value={formData.productTypeId} onValueChange={(value) => handleSelectChange('productTypeId', value)}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a product type" />
              </SelectTrigger>
              <SelectContent>
                {productTypes.map(pt => <SelectItem key={pt.id} value={pt.id}>{pt.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {!product && (
            <>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="branchSection" className="text-right">Branch Section</Label>
                <Select value={formData.branchSection} onValueChange={(value) => handleSelectChange('branchSection', value)} disabled={availableSections.length === 0}>
                  <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select a section" />
                  </SelectTrigger>
                  <SelectContent>
                      {availableSections.map(sec => <SelectItem key={sec.id} value={sec.id}>{sec.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="stock" className="text-right">Initial Stock</Label>
                <Input id="stock" type="number" value={formData.stock} onChange={handleChange} className="col-span-3" />
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit}>Save Product</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const ProductViewModal = ({ isOpen, onClose, product, stockLevels, sectionPrices }) => {
  if (!product) return null;

  const productStock = stockLevels[product.id] || {};
  const totalStock = Object.values(productStock).reduce((sum, qty) => sum + qty, 0);
  const prices = sectionPrices[product.id] || {};

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{product.name}</DialogTitle>
          <DialogDescription>
            Category: {product.category} | Brand: {product.brand}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 grid grid-cols-1 gap-6">
          <div>
            <h3 className="font-semibold mb-2">Stock Distribution</h3>
            <div className="space-y-2 rounded-lg border p-4">
              {Object.keys(productStock).length > 0 ? (
                Object.entries(productStock).map(([section, qty]) => (
                  <div key={section} className="flex justify-between items-center">
                    <span className="text-sm font-medium flex items-center gap-2"><Warehouse className="w-4 h-4 text-muted-foreground" /> {section}</span>
                    <span className="font-bold">{qty}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center">No stock available in any section.</p>
              )}
            </div>
            <div className="flex justify-between items-center mt-4 pt-4 border-t font-bold">
              <span>Total Stock</span>
              <span>{totalStock}</span>
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Section Prices</h3>
            <div className="space-y-2 rounded-lg border p-4">
              {Object.keys(prices).length > 0 ? (
                Object.entries(prices).map(([section, price]) => (
                  <div key={section} className="flex justify-between items-center">
                    <span className="text-sm font-medium flex items-center gap-2"><DollarSign className="w-4 h-4 text-muted-foreground" /> {section}</span>
                    <span className="font-bold">${price.toFixed(2)}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center">No prices set for any section.</p>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const AddStockModal = ({ isOpen, onClose, product, stockLevels, updateStockLevels, addAdjustment, user, rebuild, stockCacheKeyFn }) => {
  const [section, setSection] = useState('');
  const [quantity, setQuantity] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(new Date().toTimeString().slice(0, 5));
  const [branchSections, setBranchSections] = useState([]); // {id, name}

  useEffect(() => {
    (async () => {
      if (isOpen && user && user.branchId) {
        try {
          const secs = await api.sections.list({ branchId: user.branchId });
          setBranchSections((secs || []).map(s => ({ id: s.id, name: s.name })));
        } catch {
          setBranchSections([]);
        }
      }
    })();
    if (!isOpen) {
      setSection('');
      setQuantity('');
      setDate(new Date().toISOString().split('T')[0]);
      setTime(new Date().toTimeString().slice(0, 5));
    }
  }, [isOpen, user]);

  if (!product) return null;

  const handleSubmit = async () => {
    const qty = Number(quantity);
    if (!section || !qty || qty <= 0) {
      toast({ title: 'Invalid Input', description: 'Please select a section and enter a valid quantity.', variant: 'destructive' });
      return;
    }

    try {
      // Persist to backend using sectionName + branchId
      const selectedSec = branchSections.find(s => s.id === section);
      const secNameForCall = selectedSec ? selectedSec.name : section;
      await api.inventory.adjustInSection({ productId: product.id, sectionName: secNameForCall, branchId: user?.branchId || undefined, delta: qty });

      // Rebuild from backend and update cache
      const invMap = await (async () => {
        const map = await rebuild?.();
        if (user?.branchId && map && Object.keys(map).length > 0 && typeof stockCacheKeyFn === 'function') {
          localStorage.setItem(stockCacheKeyFn(user.branchId), JSON.stringify(map));
        }
        return map;
      })();

      const selected = branchSections.find(s => s.id === section);
      const sectionName = selected ? selected.name : section;
      const currentStock = (invMap && invMap[product.id]?.[sectionName]) || 0;
      const newStock = currentStock; // already rebuilt from backend

      const newAdjustment = {
        id: `SA-${Date.now()}`,
        productId: product.id,
        productName: product.name,
        section: sectionName,
        type: 'add',
        quantity: qty,
        reason: 'Stock Purchase/Receiving',
        date: `${date}T${time}:00`,
        previousStock: currentStock,
        newStock,
      };
      addAdjustment(newAdjustment);
      toast({ title: 'Stock Added!', description: `${qty} units of ${product.name} added to ${sectionName}.` });
      onClose();
    } catch (e) {
      toast({ title: 'Add stock failed', description: String(e?.message || e), variant: 'destructive' });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Stock to {product.name}</DialogTitle>
          <DialogDescription>Increase the stock quantity for this product in a specific section.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Section</Label>
            <Select value={section} onValueChange={setSection}>
              <SelectTrigger><Warehouse className="w-4 h-4 mr-2" /><SelectValue placeholder="Select a section" /></SelectTrigger>
              <SelectContent>{branchSections.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity to Add</Label>
            <Input id="quantity" type="number" placeholder="e.g., 50" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <Input id="time" type="time" value={time} onChange={e => setTime(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit}>Add Stock</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const SectionPricing = ({ products, sectionPrices, updateSectionPrices, user }) => {
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [prices, setPrices] = useState({}); // key: sectionId, value: price string
    const [sellingSections, setSellingSections] = useState([]); // array of {id, name}
    const [loadingSections, setLoadingSections] = useState(false);
    const [loadingPrices, setLoadingPrices] = useState(false);
    const [saving, setSaving] = useState(false);

    // Load selling sections from backend (exclude store/kitchen/production sections)
    useEffect(() => {
        (async () => {
            setLoadingSections(true);
            // Allow backend to derive branch if not provided
            try {
                const secs = await api.sections.list({ branchId: user?.branchId || undefined });
                const norm = (s) => String(s || '').toUpperCase();
                const classify = (fn, name) => {
                    const f = norm(fn);
                    const n = norm(name);
                    if (f.includes('STORE') || n.includes('STORE')) return 'STORE';
                    if (f.includes('KITCHEN') || n.includes('KITCHEN')) return 'KITCHEN';
                    return 'SALES';
                };
                const selling = (secs || []).filter(s => classify(s.function, s.name) === 'SALES');
                setSellingSections(selling);
            } catch {
                setSellingSections([]);
            } finally { setLoadingSections(false); }
        })();
    }, [user?.branchId]);

    // When a product is selected, load effective prices per section for that product
    useEffect(() => {
        (async () => {
            if (!selectedProduct) { setPrices({}); return; }
            const next = {};
            try {
                setLoadingPrices(true);
                await Promise.all((sellingSections || []).map(async (sec) => {
                    const map = await api.prices.effective({ branchId: user?.branchId || undefined, sectionId: sec.id });
                    const val = map ? map[selectedProduct.id] : undefined;
                    next[sec.id] = (val !== undefined && val !== null) ? String(val) : '';
                }));
            } catch {
                // fallback to empty
            } finally { setLoadingPrices(false); }
            setPrices(next);
        })();
    }, [selectedProduct, sellingSections, user?.branchId]);

    const handlePriceChange = (sectionId, value) => {
        setPrices(prev => ({ ...prev, [sectionId]: value }));
    };

    const handleSavePrices = async () => {
        if (!selectedProduct) return;
        try {
            setSaving(true);
            // Persist per-section via backend
            for (const sec of sellingSections) {
                const raw = prices[sec.id];
                const priceValue = parseFloat(raw);
                if (!isNaN(priceValue) && priceValue >= 0) {
                    await api.priceLists.upsertEntries({
                        branchId: user?.branchId || undefined,
                        sectionId: sec.id,
                        entries: [{ productId: selectedProduct.id, price: String(priceValue) }],
                    });
                }
            }

            // Update local UI cache so ProductView modal shows latest values (by section name)
            const newSectionPrices = { ...sectionPrices };
            if (!newSectionPrices[selectedProduct.id]) newSectionPrices[selectedProduct.id] = {};
            for (const sec of sellingSections) {
                const raw = prices[sec.id];
                const priceValue = parseFloat(raw);
                if (!isNaN(priceValue) && priceValue >= 0) newSectionPrices[selectedProduct.id][sec.name] = priceValue;
            }
            updateSectionPrices(newSectionPrices);

            toast({ title: 'Prices Updated', description: `Prices for ${selectedProduct.name} have been saved.` });
            // reset selection for next product
            setSelectedProduct(null);
            setPrices({});
        } catch (e) {
            toast({ title: 'Save failed', description: String(e?.message || e), variant: 'destructive' });
        } finally { setSaving(false); }
    };

    return (
        <Card className="glass-effect">
            <CardHeader>
                <CardTitle>Section-Based Product Pricing</CardTitle>
                <CardDescription>Set different prices for products in each selling section.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid gap-4">
                    <div>
                        <Label>Select Product</Label>
                        <Select value={selectedProduct?.id || ''} onValueChange={(value) => setSelectedProduct(products.find(p => p.id.toString() === value))}>
                            <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Choose a product to edit prices" />
                            </SelectTrigger>
                            <SelectContent>
                                {products.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        {loadingSections && (
                          <p className="text-xs text-muted-foreground mt-2">Loading sections...</p>
                        )}
                    </div>
                    {selectedProduct && (
                        <>
                          <div className="space-y-4">
                              <div className="rounded-lg border p-4">
                                  <h4 className="font-semibold mb-3">Set Prices by Section</h4>
                                  {loadingPrices ? (
                                    <p className="text-sm text-muted-foreground">Loading current prices...</p>
                                  ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      {sellingSections.map(section => (
                                          <div key={section.id} className="flex items-center gap-3">
                                              <Label className="w-40 shrink-0">{section.name}</Label>
                                              <Input type="number" step="0.01" value={prices[section.id] || ''} onChange={(e) => handlePriceChange(section.id, e.target.value)} placeholder="e.g., 5.00" />
                                          </div>
                                      ))}
                                    </div>
                                  )}
                              </div>
                              <div className="flex justify-end">
                                  <Button onClick={handleSavePrices} disabled={saving}>{saving ? 'Saving...' : 'Save Prices'}</Button>
                              </div>
                          </div>
                        </>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

const StockTransfer = ({ user, products, stockLevels, updateStockLevels, rebuildSectionStock, stockCacheKey }) => {
    const [transfers, setTransfers] = useState([]);
    const [loading, setLoading] = useState(false);

    const reloadTransfers = async () => {
        try {
            setLoading(true);
            const res = await api.inventory.transfers.list({ branchId: user?.branchId || undefined });
            const items = Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : []);
            setTransfers(items.map(t => ({
                id: t.id,
                from: t.fromSection?.name || t.fromSectionName || t.from || '',
                to: t.toSection?.name || t.toSectionName || t.to || '',
                date: t.createdAt || t.date || new Date().toISOString(),
                items: (t.items || []).map(i => ({ quantity: i.qty ?? i.quantity ?? 0, name: i.product?.name || i.productName || '' })),
                status: t.status || 'Completed',
                userName: t.userName || t.user?.username || t.user || undefined,
            })));
        } catch {
            setTransfers([]);
        } finally { setLoading(false); }
    };

    useEffect(() => { reloadTransfers(); }, [user?.branchId]);

    const addTransfer = async () => { await reloadTransfers(); };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
                <CreateStockTransferForm onTransferCreated={addTransfer} user={user} products={products} stockLevels={stockLevels} updateStockLevels={updateStockLevels} rebuild={rebuildSectionStock} stockCacheKeyFn={stockCacheKey} />
            </div>
            <div className="lg:col-span-2">
                <TransferHistory transfers={transfers} loading={loading} />
            </div>
        </div>
    );
};

const CreateStockTransferForm = ({ onTransferCreated, user, products, stockLevels, updateStockLevels, rebuild, stockCacheKeyFn }) => {
    const [branchSections, setBranchSections] = useState([]);
    const [items, setItems] = useState([{ productId: '', quantity: '' }]);
    const [fromSection, setFromSection] = useState(''); // store sectionId
    const [toSection, setToSection] = useState('');     // store sectionId

    useEffect(() => {
        const load = async () => {
            if (user) {
                try {
                    const secs = await api.sections.list({ branchId: user?.branchId || undefined });
                    setBranchSections(Array.isArray(secs) ? secs : []);
                } catch {
                    setBranchSections([]);
                }
            }
        };
        load();
    }, [user]);

    const handleItemChange = (index, field, value) => {
        const newItems = [...items];
        newItems[index][field] = value;
        setItems(newItems);
    };

    const addItem = () => setItems([...items, { productId: '', quantity: '' }]);
    const removeItem = (index) => setItems(items.filter((_, i) => i !== index));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!fromSection || !toSection || fromSection === toSection) {
            toast({ title: 'Invalid Sections', description: 'Please select valid and different from/to sections.', variant: 'destructive' });
            return;
        }

        const validItems = items.filter(item => item.productId && Number(item.quantity) > 0);
        if (validItems.length === 0) {
            toast({ title: 'No Items', description: 'Please add at least one valid item to transfer.', variant: 'destructive' });
            return;
        }

        const newStockLevels = JSON.parse(JSON.stringify(stockLevels));
        let isTransferValid = true;

        const fromName = branchSections.find(s => s.id === fromSection)?.name || '';
        validItems.forEach(item => {
            const { productId, quantity } = item;
            const qty = Number(quantity);
            const currentStock = newStockLevels[productId]?.[fromName] || 0;

            if (currentStock < qty) {
                const productName = products.find(p => p.id.toString() === productId)?.name || 'Product';
                toast({ title: 'Insufficient Stock', description: `Not enough ${productName} in ${fromName}. Available: ${currentStock}, Tried to transfer: ${qty}`, variant: 'destructive' });
                isTransferValid = false;
            }
        });

        if (!isTransferValid) return;

        // Call backend per-section transfer using section names (with branchId)
        try {
            const from = branchSections.find(s => s.id === fromSection);
            const to = branchSections.find(s => s.id === toSection);
            if (!from || !to) {
                toast({ title: 'Sections not found', description: 'Could not resolve section IDs for transfer.', variant: 'destructive' });
                return;
            }
            await api.inventory.transfer({
                fromSectionId: from.id,
                toSectionId: to.id,
                branchId: user?.branchId || undefined,
                items: validItems.map(it => ({ productId: it.productId, qty: Number(it.quantity) }))
            });
            const map = await rebuild?.();
            if (user?.branchId && map && Object.keys(map).length > 0 && typeof stockCacheKeyFn === 'function') {
                localStorage.setItem(stockCacheKeyFn(user.branchId), JSON.stringify(map));
            }
        } catch (err) {
            toast({ title: 'Transfer failed', description: String(err?.message || err), variant: 'destructive' });
            return;
        }

        validItems.forEach(item => {
            const { productId, quantity } = item;
            const qty = Number(quantity);
            
            const fromName = branchSections.find(s => s.id === fromSection)?.name || '';
            const toName = branchSections.find(s => s.id === toSection)?.name || '';
            if (!fromName || !toName) return;
            newStockLevels[productId][fromName] -= qty;
            if (newStockLevels[productId][fromName] === 0) {
                delete newStockLevels[productId][fromName];
            }
            newStockLevels[productId][toName] = (newStockLevels[productId][toName] || 0) + qty;
        });

        updateStockLevels(newStockLevels);
        
        const fromNameFinal = branchSections.find(s => s.id === fromSection)?.name || '';
        const toNameFinal = branchSections.find(s => s.id === toSection)?.name || '';
        const newTransfer = {
            id: `ST-${Date.now()}`,
            from: fromNameFinal,
            to: toNameFinal,
            date: new Date().toISOString(),
            items: validItems.map(item => ({...item, name: products.find(p => p.id.toString() === item.productId)?.name})),
            status: 'Completed'
        };

        onTransferCreated(newTransfer);
        toast({ title: 'Stock Transfer Successful!', description: 'Stock levels have been updated.' });
        setItems([{ productId: '', quantity: '' }]);
        setFromSection('');
        setToSection('');
    };

    const getAvailableToSections = () => {
        if (!fromSection) return [];
        const norm = (s) => String(s || '').toUpperCase();
        const classify = (fn) => {
          const f = norm(fn);
          if (f.includes('STORE')) return 'STORE';
          if (f.includes('BAR') && f.includes('PRODUCTION')) return 'BAR_PRODUCTION';
          if (f.includes('KITCHEN') && f.includes('PRODUCTION')) return 'KITCHEN_PRODUCTION';
          if (f.includes('PRODUCTION')) return 'PRODUCTION';
          if (f.includes('SALES')) return 'SALES_OPERATION';
          if (f.includes('BAR')) return 'BAR_PRODUCTION';
          if (f.includes('KITCHEN')) return 'KITCHEN_PRODUCTION';
          return 'UNKNOWN';
        };
        const from = branchSections.find(s => s.id === fromSection);
        const f = classify(from?.function);
        if (f === 'STORE') {
            return branchSections.filter(s => ['BAR_PRODUCTION','KITCHEN_PRODUCTION','PRODUCTION'].includes(classify(s.function)) && s.id !== fromSection);
        }
        if (f === 'BAR_PRODUCTION' || f === 'KITCHEN_PRODUCTION' || f === 'PRODUCTION') {
            return branchSections.filter(s => classify(s.function) === 'SALES_OPERATION' && s.id !== fromSection);
        }
        if (f === 'SALES_OPERATION') {
            return branchSections.filter(s => classify(s.function) === 'SALES_OPERATION' && s.id !== fromSection);
        }
        return branchSections.filter(s => s.id !== fromSection);
      };

    const availableToSections = getAvailableToSections();
    const fromNameForStock = branchSections.find(s => s.id === fromSection)?.name || '';
    const productsInFromSection = fromSection ? products.filter(p => stockLevels[p.id]?.[fromNameForStock] > 0) : [];

    return (
        <Card className="glass-effect">
            <CardHeader>
                <CardTitle>Create Stock Transfer</CardTitle>
                <CardDescription>Move stock between sections in your branch.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="flex items-center gap-2">
                        <Select value={fromSection} onValueChange={val => { setFromSection(val); setToSection(''); }}>
                            <SelectTrigger><Warehouse className="w-4 h-4 mr-2" /> From</SelectTrigger>
                            <SelectContent>{branchSections.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                        </Select>
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        <Select value={toSection} onValueChange={setToSection} disabled={!fromSection}>
                            <SelectTrigger><Box className="w-4 h-4 mr-2" /> To</SelectTrigger>
                            <SelectContent>{availableToSections.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-4">
                        <Label>Items to Transfer</Label>
                        {items.map((item, index) => (
                            <div key={index} className="flex items-center gap-2 p-2 rounded-md border">
                                <Select value={item.productId} onValueChange={value => handleItemChange(index, 'productId', value)} disabled={!fromSection}>
                                    <SelectTrigger className="flex-1"><Package className="w-4 h-4 mr-2" /><SelectValue placeholder="Product" /></SelectTrigger>
                                    <SelectContent>{productsInFromSection.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name} (Av: {stockLevels[p.id]?.[fromNameForStock]})</SelectItem>)}</SelectContent>
                                </Select>
                                <Input type="number" placeholder="Qty" min="1" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', e.target.value)} className="w-24" required />
                                <Button type="button" variant="destructive" size="icon" onClick={() => removeItem(index)}><Trash2 className="w-4 h-4" /></Button>
                            </div>
                        ))}
                        <Button type="button" variant="outline" onClick={addItem} disabled={!fromSection}><Plus className="w-4 h-4 mr-2" /> Add Item</Button>
                    </div>

                    <Button type="submit" className="w-full">
                        <Repeat className="w-4 h-4 mr-2" /> Confirm Transfer
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
};

const TransferHistory = ({ transfers, loading = false }) => (
    <Card className="glass-effect">
        <CardHeader>
            <CardTitle>Transfer History</CardTitle>
            <CardDescription>Log of all stock movements.</CardDescription>
        </CardHeader>
        <CardContent>
             <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                {loading && <p className="text-center text-muted-foreground py-8">Loading transfers...</p>}
                {!loading && transfers.length > 0 ? transfers.map(t => (
                    <div key={t.id} className="p-4 rounded-lg border bg-background">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="font-bold text-primary">{t.id}</p>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <span>{t.from}</span>
                                    <ArrowRight className="w-4 h-4" />
                                    <span>{t.to}</span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    <Calendar className="w-3 h-3 mr-1.5 inline" />
                                    {new Date(t.date).toLocaleString()}
                                </p>
                                {t.userName && (
                                  <p className="text-xs text-muted-foreground">by_user: {t.userName}</p>
                                )}
                            </div>
                            <span className={`px-2 py-1 text-xs rounded-full bg-green-200 text-green-800`}>{t.status}</span>
                        </div>
                        <div className="mt-4 pt-2 border-t">
                            <p className="text-sm font-semibold mb-2">Transferred Items:</p>
                            <ul className="list-disc list-inside text-sm space-y-1">
                                {t.items.map((item, index) => (
                                    <li key={index}>{item.quantity} x {item.name || 'Unknown Product'}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )) : (!loading && (
                    <p className="text-center text-muted-foreground py-8">No stock transfers recorded yet.</p>
                ))}
            </div>
        </CardContent>
    </Card>
);

const StockAdjustment = ({ products, stockLevels, updateStockLevels, adjustments, addAdjustment, user }) => {
    const [remoteAdjustments, setRemoteAdjustments] = useState([]);
    const [loading, setLoading] = useState(false);

    const reloadAdjustments = async () => {
        try {
            setLoading(true);
            const res = await api.inventory.adjustments.list({ branchId: user?.branchId || undefined });
            const items = Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : []);
            const mapped = items.map(a => ({
                id: a.id,
                productId: a.productId,
                productName: a.product?.name || a.productName || 'Product',
                section: a.section?.name || a.sectionName || '',
                type: (a.delta ?? 0) >= 0 ? 'add' : 'remove',
                quantity: Math.abs(a.delta ?? a.quantity ?? 0),
                reason: a.reason || 'Adjustment',
                date: a.createdAt || a.date || new Date().toISOString(),
                previousStock: a.previousStock ?? 0,
                newStock: a.newStock ?? 0,
                userName: a.userName || a.user?.username || a.user || undefined,
            }));
            setRemoteAdjustments(mapped);
        } catch {
            setRemoteAdjustments([]);
        } finally { setLoading(false); }
    };

    useEffect(() => { reloadAdjustments(); }, [user?.branchId]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
                <CreateStockAdjustmentForm products={products} user={user} onAdjustmentCreated={reloadAdjustments} />
            </div>
            <div className="lg:col-span-2">
                <AdjustmentHistory adjustments={remoteAdjustments} loading={loading} />
            </div>
        </div>
    );
};

const CreateStockAdjustmentForm = ({ products, user, onAdjustmentCreated }) => {
    const [productId, setProductId] = useState('');
    const [sectionId, setSectionId] = useState('');
    const [type, setType] = useState('add');
    const [quantity, setQuantity] = useState('');
    const [reason, setReason] = useState('');
    const [sections, setSections] = useState([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const secs = await api.sections.list({ branchId: user?.branchId || undefined });
                setSections(Array.isArray(secs) ? secs : []);
            } catch { setSections([]); }
        })();
    }, [user?.branchId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const qty = Number(quantity);
        if (!productId || !sectionId || !qty || qty <= 0 || !reason) {
            toast({ title: 'Invalid Input', description: 'Please fill all fields correctly.', variant: 'destructive' });
            return;
        }

        const product = products.find(p => p.id.toString() === productId);
        if (!product) {
            toast({ title: 'Product not found', variant: 'destructive' });
            return;
        }
        
        try {
            setSaving(true);
            const delta = type === 'add' ? qty : -qty;
            const secNameForCall = sections.find(s => s.id === sectionId)?.name || sectionId;
            await api.inventory.adjustInSection({ productId, sectionName: secNameForCall, branchId: user?.branchId || undefined, delta, reason });
            toast({ title: 'Stock Adjusted!', description: `${product.name} stock updated.` });
            await onAdjustmentCreated?.();
        } catch (e) {
            toast({ title: 'Adjustment failed', description: String(e?.message || e), variant: 'destructive' });
            return;
        } finally { setSaving(false); }

        setProductId('');
        setSectionId('');
        setType('add');
        setQuantity('');
        setReason('');
    };

    return (
        <Card className="glass-effect">
            <CardHeader>
                <CardTitle>Add Stock Adjustment</CardTitle>
                <CardDescription>Manually adjust stock levels for a section.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <Label>Product</Label>
                        <Select value={productId} onValueChange={val => { setProductId(val); setSection(''); }}>
                            <SelectTrigger><Package className="w-4 h-4 mr-2" /><SelectValue placeholder="Select a product" /></SelectTrigger>
                            <SelectContent>{products.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    
                    <div className="space-y-2">
                        <Label>Section</Label>
                        <Select value={sectionId} onValueChange={setSectionId} disabled={!productId}>
                            <SelectTrigger><Warehouse className="w-4 h-4 mr-2" /><SelectValue placeholder="Select a section" /></SelectTrigger>
                            <SelectContent>{sections.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Adjustment Type</Label>
                        <RadioGroup defaultValue="add" value={type} onValueChange={setType} className="flex gap-4">
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="add" id="add" />
                                <Label htmlFor="add" className="flex items-center gap-2"><ArrowUp className="w-4 h-4 text-green-500" /> Add Stock</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="remove" id="remove" />
                                <Label htmlFor="remove" className="flex items-center gap-2"><ArrowDown className="w-4 h-4 text-red-500" /> Remove Stock</Label>
                            </div>
                        </RadioGroup>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="quantity">Quantity</Label>
                        <Input id="quantity" type="number" placeholder="e.g., 10" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} required />
                    </div>
                    
                    <div className="space-y-2">
                        <Label htmlFor="reason">Reason</Label>
                        <Input id="reason" placeholder="e.g., Damaged goods, Stock count correction" value={reason} onChange={e => setReason(e.target.value)} required />
                    </div>

                    <Button type="submit" className="w-full" disabled={saving}>
                        <SlidersHorizontal className="w-4 h-4 mr-2" /> {saving ? 'Submitting...' : 'Submit Adjustment'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
};

const AdjustmentHistory = ({ adjustments }) => {
    const [displayAdjustments, setDisplayAdjustments] = useState([]);
    useEffect(() => {
        const sorted = [...adjustments].sort((a, b) => new Date(b.date) - new Date(a.date));
        setDisplayAdjustments(sorted);
    }, [adjustments]);

    return (
        <Card className="glass-effect">
            <CardHeader>
                <CardTitle>Adjustment History</CardTitle>
                <CardDescription>Log of all manual stock adjustments.</CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                    {displayAdjustments.length > 0 ? displayAdjustments.map(adj => (
                        <div key={adj.id} className="p-4 rounded-lg border bg-background">
                            <div className="flex justify-between items-start gap-4">
                                <div>
                                    <p className={`font-bold ${adj.type === 'add' ? 'text-green-600' : 'text-red-600'}`}>{adj.productName} <span className="text-sm text-muted-foreground">in {adj.section}</span></p>
                                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                                        <FileText className="w-4 h-4" /> {adj.reason}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        <Calendar className="w-3 h-3 mr-1.5 inline" />
                                        {new Date(adj.date).toLocaleString()}
                                    </p>
                                    {adj.userName && (
                                      <p className="text-xs text-muted-foreground">by_user: {adj.userName}</p>
                                    )}
                                </div>
                                <div className="text-right shrink-0">
                                    <p className={`text-xl font-bold flex items-center gap-1 justify-end ${adj.type === 'add' ? 'text-green-600' : 'text-red-600'}`}>
                                        {adj.type === 'add' ? <Plus className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                                        {adj.quantity}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {adj.previousStock} &rarr; {adj.newStock}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <p className="text-center text-muted-foreground py-8">No stock adjustments recorded yet.</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export default ProductManagement;