// Lightweight permission helpers for UI gating. Non-invasive and optional.

function norm(s) {
  try { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '_'); } catch { return ''; }
}

export function hasPermission(perms, key) {
  // ADMIN override from persisted user (login response stores user in localStorage)
  try {
    if (typeof window !== 'undefined') {
      const raw = window.localStorage.getItem('loungeUser');
      if (raw) {
        const u = JSON.parse(raw);
        const role = String(u?.role || '').toUpperCase();
        if (role === 'ADMIN') return true;
        const storedPerms = Array.isArray(u?.permissions) ? u.permissions : [];
        const storedNorm = new Set(storedPerms.map(norm));
        if (storedNorm.has('all')) return true;
        // Merge stored with provided for broader coverage
        perms = [...new Set([...(Array.isArray(perms) ? perms : []), ...storedPerms])];
      }
    }
  } catch {}
  if (!Array.isArray(perms)) return false;
  const expanded = (() => {
    const base = new Set((Array.isArray(perms) ? perms : []).map(norm));
    const has = (p) => base.has(norm(p));
    if (has('inventory') || has('inventory_manage') || has('inventory_management')) {
      ['stock_adjustment','stock_transfer','view_product','add_product','edit_product','delete_product','view_branch_section','view_category','view_subcategory','view_brand','view_product_type','view_section_function','view_settings'].forEach(p=>base.add(norm(p)));
    }
    if (has('product') || has('product_manage') || has('product_management')) {
      ['view_product','add_product','edit_product','delete_product','view_category','view_subcategory','view_brand','view_product_type','view_branch_section'].forEach(p=>base.add(norm(p)));
    }
    Array.from(base).filter(p=>String(p).endsWith('.*')).forEach((wc)=>{
      const prefix = String(wc).slice(0,-2);
      if (prefix === 'inventory') {
        ['stock_adjustment','stock_transfer','view_branch_section'].forEach(p=>base.add(norm(p)));
      }
      if (prefix === 'product' || prefix === 'products') {
        ['view_product','add_product','edit_product','delete_product','view_category','view_subcategory','view_brand','view_product_type','view_branch_section'].forEach(p=>base.add(norm(p)));
      }
      if (prefix === 'pos' || prefix === 'sell') {
        ['view_pos_sell','add_pos_sell','edit_pos_sell','delete_pos_sell'].forEach(p=>base.add(norm(p)));
      }
    });
    return base;
  })();
  const normSet = new Set(expanded);
  const k = norm(key);
  return normSet.has('all') || normSet.has(k);
}

export function hasAny(perms, keys = []) {
  if (!Array.isArray(keys) || keys.length === 0) return false;
  return keys.some((k) => hasPermission(perms, k));
}

// Usage:
// <RequirePermission perms={currentUserPermissions} anyOf={["add_product", "edit_product"]}>
//   <Button>Add or Edit</Button>
// </RequirePermission>
export function RequirePermission({ perms = [], anyOf = [], allOf = [], children, fallback = null, disabledMode = false }) {
  const okAny = anyOf.length ? hasAny(perms, anyOf) : true;
  const okAll = allOf.length ? allOf.every((k) => hasPermission(perms, k)) : true;
  const allowed = okAny && okAll;

  if (allowed) return children;
  if (disabledMode && children) {
    try {
      return typeof children === 'object'
        ? { ...children, props: { ...children.props, disabled: true, 'aria-disabled': true } }
        : children;
    } catch {
      return fallback;
    }
  }
  return fallback;
}
