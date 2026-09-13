import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { MoreVertical } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RequirePermission, hasPermission } from '@/lib/permissions';
import { api } from '@/lib/api';

// Reusable ProductOverview component
// Props:
// - products: array of { id, name, category, price?, archived?, active? }
// - stockLevels: map productId -> { sectionName: qty }
// - onAdd: fn()
// - onEdit: fn(product)
// - onDelete: fn(productId)
// - onView: fn(product)
// - user/perms: for permission gating
const ProductOverview = ({ products = [], stockLevels = {}, onAdd, onEdit, onDelete, onView, user, perms: permsProp }) => {
  const perms = Array.isArray(permsProp) ? permsProp : (user?.permissions || []);
  const isAdmin = user?.role === 'ADMIN';

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [sort, setSort] = useState({ key: 'name', dir: 'asc' }); // key: name|price|stock, dir: asc|desc
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [serverItems, setServerItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshBump, setRefreshBump] = useState(0);
  const [categoryOptions, setCategoryOptions] = useState([]);

  // Load categories from backend (for consistency)
  useEffect(() => {
    (async () => {
      try {
        if (!user?.branchId) { setCategoryOptions([]); return; }
        const list = await api.categories.list({ branchId: user.branchId });
        setCategoryOptions(Array.isArray(list) ? list.map(c => c.name || c.id || '') : []);
      } catch { setCategoryOptions([]); }
    })();
  }, [user?.branchId]);

  // Server-side fetch for products when branchId exists
  useEffect(() => {
    (async () => {
      if (!user?.branchId) { setServerItems([]); return; }
      setLoading(true);
      try {
        const resp = await api.products.list({
          branchId: user.branchId,
          q: search || undefined,
          category: category !== 'ALL' ? category : undefined,
          sortBy: sort.key === 'name' ? 'name' : (sort.key === 'price' ? 'price' : 'stock'),
          order: sort.dir,
          page,
          pageSize,
        });
        // Allow backend to return either array or { items, total }
        if (Array.isArray(resp)) {
          setServerItems(resp);
        } else if (resp && Array.isArray(resp.items)) {
          setServerItems(resp.items);
        } else {
          setServerItems([]);
        }
      } catch {
        setServerItems([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.branchId, search, category, sort, page, pageSize, refreshBump]);

  useEffect(() => {
    const onProductsChanged = () => setRefreshBump(x => x + 1);
    window.addEventListener('productsChanged', onProductsChanged);
    return () => window.removeEventListener('productsChanged', onProductsChanged);
  }, []);

  const categories = useMemo(() => {
    if (categoryOptions.length > 0) return categoryOptions;
    const set = new Set((products || []).map(p => p.category).filter(Boolean));
    return Array.from(set);
  }, [products, categoryOptions]);

  const getTotalStock = (productId) => {
    const m = stockLevels?.[productId] || {};
    return Object.values(m).reduce((sum, n) => sum + Number(n || 0), 0);
  };

  const normalized = useMemo(() => {
    const src = user?.branchId ? serverItems : products;
    return (src || []).map(p => ({
      id: p.id,
      sku: p.sku,
      name: p.name || 'Unnamed',
      category: p.category || 'Uncategorized',
      stock: getTotalStock(p.id),
      price: Number(p.price ?? 0),
      active: p.archived ? false : (p.active !== false),
      raw: p,
    }));
  }, [products, stockLevels, serverItems, user?.branchId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return normalized.filter(r => {
      const matchName = r.name.toLowerCase().includes(q);
      const matchCat = category === 'ALL' ? true : r.category === category;
      return matchName && matchCat;
    });
  }, [normalized, search, category]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const { key, dir } = sort;
    arr.sort((a, b) => {
      let va = a[key]; let vb = b[key];
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return dir === 'asc' ? -1 : 1;
      if (va > vb) return dir === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filtered, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const clampedPage = Math.min(page, totalPages);
  const start = (clampedPage - 1) * pageSize;
  const items = sorted.slice(start, start + pageSize);

  const toggleSort = (key) => {
    setPage(1);
    setSort(prev => prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' });
  };

  return (
    <Card className="glass-effect">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Product Overview</CardTitle>
          <CardDescription>Search, filter, sort, and manage products</CardDescription>
        </div>
        {isAdmin || hasPermission(perms, 'add_product') ? (
          <Button onClick={onAdd}>Add Product</Button>
        ) : (
          <Button disabled title="Insufficient permission">Add Product</Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="w-full md:w-1/2">
            <Input placeholder="Search products by name" value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} />
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="category-filter" className="text-sm">Category</Label>
            <select id="category-filter" value={category} onChange={(e) => { setPage(1); setCategory(e.target.value); }} className="h-9 rounded-md border bg-background px-3 text-sm min-w-[12rem]">
              <option value="ALL">All</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="border rounded-md overflow-hidden">
          <div className="grid grid-cols-12 bg-muted/50 text-sm font-semibold px-3 py-2">
            <div className="col-span-1">SKU</div>
            <button className="col-span-3 text-left" onClick={() => toggleSort('name')}>Product Name</button>
            <div className="col-span-2">Category</div>
            <button className="col-span-2 text-left" onClick={() => toggleSort('stock')}>Stock Qty</button>
            <button className="col-span-2 text-left" onClick={() => toggleSort('price')}>Unit Price</button>
            <div className="col-span-1">Status</div>
            <div className="col-span-1 text-right">Actions</div>
          </div>
          <div className="divide-y">
            {loading && (
              <div className="px-3 py-6 text-sm text-muted-foreground">Loading products...</div>
            )}
            {!loading && items.map(p => (
              <div key={p.id} className="grid grid-cols-12 px-3 py-2 text-sm items-center hover:bg-muted/40">
                <div className="col-span-1 truncate">{p.sku}</div>
                <div className="col-span-3 truncate">{p.name}</div>
                <div className="col-span-2">{p.category}</div>
                <div className="col-span-2">{p.stock}</div>
                <div className="col-span-2">${Number(p.price).toFixed(2)}</div>
                <div className="col-span-1">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${p.active ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-700'}`}>{p.active ? 'Active' : 'Inactive'}</span>
                </div>
                <div className="col-span-1 flex justify-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="outline" className="h-7 w-7">
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">Actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      {(() => {
                        const canEdit = isAdmin || hasPermission(perms, 'edit_product');
                        const canDelete = isAdmin || hasPermission(perms, 'delete_product');
                        return (
                          <>
                            <DropdownMenuItem onClick={() => onView && onView(p.raw)}>View</DropdownMenuItem>
                            <DropdownMenuItem disabled={!canEdit} onClick={() => canEdit && onEdit && onEdit(p.raw)}>Edit / Update</DropdownMenuItem>
                            <DropdownMenuItem disabled={!canDelete} onClick={() => canDelete && onDelete && onDelete(p.id)}>Delete</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {p.active ? (
                              <DropdownMenuItem disabled={!canEdit} onClick={async () => { if (!canEdit) return; try { await api.products.update(p.id, { active: false }); setServerItems(prev => prev.map(it => it.id === p.id ? { ...it, active: false, archived: true } : it)); } catch {} }}>Deactivate</DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem disabled={!canEdit} onClick={async () => { if (!canEdit) return; try { await api.products.update(p.id, { active: true }); setServerItems(prev => prev.map(it => it.id === p.id ? { ...it, active: true, archived: false } : it)); } catch {} }}>Activate</DropdownMenuItem>
                            )}
                          </>
                        );
                      })()}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
            {!loading && items.length === 0 && (
              <div className="px-3 py-6 text-sm text-muted-foreground">No products found.</div>
            )}
          </div>
        </div>

        {(() => {
          const total = sorted.length;
          const startIdx = total === 0 ? 0 : (clampedPage - 1) * pageSize + 1;
          const endIdx = Math.min(total, clampedPage * pageSize);
          return (
            <div className="flex flex-col items-center gap-3 pt-3">
              <div className="text-sm text-muted-foreground">{total === 0 ? '0' : `${startIdx}-${endIdx}`} of {total}</div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={clampedPage <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }).slice(0, 5).map((_, idx) => {
                    const pg = idx + 1;
                    const active = pg === clampedPage;
                    return (
                      <Button key={pg} variant={active ? 'default' : 'outline'} size="sm" onClick={() => setPage(pg)}>{pg}</Button>
                    );
                  })}
                </div>
                <Button variant="outline" size="sm" disabled={clampedPage >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next</Button>
              </div>
            </div>
          );
        })()}
      </CardContent>
    </Card>
  );
};

export default ProductOverview;
