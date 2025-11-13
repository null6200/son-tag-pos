import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './permissions.decorator';
import { PrismaService } from '../prisma/prisma.service';


@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector, private prisma: PrismaService) {}

  private expandPermissions(perms: string[] | undefined | null): string[] {
    const base = new Set<string>(Array.isArray(perms) ? perms.map(p => String(p)) : []);
    // Wildcards: if 'all' present, short-circuit at call site. If 'inventory.*' present, expand known inventory ops, etc.
    const has = (p: string) => base.has(p);

    // Aliases/bundles for common role names
    if (has('inventory') || has('inventory_manage') || has('inventory_management')) {
      base.add('stock_adjustment');
      base.add('stock_transfer');
      base.add('view_product');
      base.add('add_product');
      base.add('edit_product');
      base.add('delete_product');
      // Lists needed for inventory/product actions
      base.add('view_branch_section');
      base.add('view_category');
      base.add('view_subcategory');
      base.add('view_brand');
      base.add('view_product_type');
      base.add('view_section_function');
      base.add('view_settings'); // for service-types list in some UIs
    }
    if (has('product') || has('product_manage') || has('product_management')) {
      base.add('view_product');
      base.add('add_product');
      base.add('edit_product');
      base.add('delete_product');
      base.add('view_category');
      base.add('view_subcategory');
      base.add('view_brand');
      base.add('view_product_type');
      base.add('view_branch_section');
    }
    // If a role grants add/edit product directly, also allow viewers needed for the form
    if (has('add_product') || has('edit_product')) {
      base.add('view_product');
      base.add('view_category');
      base.add('view_subcategory');
      base.add('view_brand');
      base.add('view_product_type');
      base.add('view_branch_section');
    }
    if (has('settings') || has('edit_settings') || has('settings_manage')) {
      base.add('edit_settings');
    }
    if (has('pos_sell') || has('sell') || has('sales')) {
      base.add('view_pos_sell');
      base.add('add_pos_sell');
      base.add('edit_pos_sell');
      base.add('delete_pos_sell');
    }

    // Wildcard simple expansion
    const wildcards = Array.from(base).filter(p => p.endsWith('.*'));
    for (const wc of wildcards) {
      const prefix = wc.slice(0, -2);
      // Map prefixes to known granular permissions
      if (prefix === 'inventory') {
        base.add('stock_adjustment');
        base.add('stock_transfer');
        base.add('view_branch_section');
      }
      if (prefix === 'product' || prefix === 'products') {
        base.add('view_product');
        base.add('add_product');
        base.add('edit_product');
        base.add('delete_product');
        base.add('view_category');
        base.add('view_subcategory');
        base.add('view_brand');
        base.add('view_product_type');
        base.add('view_branch_section');
      }
      if (prefix === 'pos' || prefix === 'sell') {
        base.add('view_pos_sell');
        base.add('add_pos_sell');
        base.add('edit_pos_sell');
        base.add('delete_pos_sell');
      }
    }

    return Array.from(base);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]) || [];

    // No permissions required, allow
    if (required.length === 0) return true;

    const req = context.switchToHttp().getRequest();
    const user = req.user;
    const roleEnum: string | undefined = user?.role || user?.user_metadata?.role;

    // Admin shortcut
    if (roleEnum === 'ADMIN') return true;

    if (!user) throw new ForbiddenException('Unauthorized');

    // Try to read permissions from request; if missing, load from DB
    let perms: string[] = user?.permissions || user?.user_metadata?.permissions || [];
    if ((!perms || perms.length === 0) && (user?.userId || user?.sub || user?.id)) {
      const uid = String(user.userId || user.sub || user.id);
      try {
        const u = await this.prisma.user.findUnique({ where: { id: uid }, include: { appRole: true } });
        if (u) {
          if (u.role === 'ADMIN') return true;
          perms = Array.isArray((u.appRole as any)?.permissions) ? (u.appRole as any).permissions : [];
          // Attach resolved permissions to request user for downstream usage
          try { req.user.permissions = perms; } catch {}
        }
      } catch {}
    }

    // Expand/normalize effective permissions for alias bundles and wildcards
    perms = this.expandPermissions(perms);

    // Any-of logic: user passes if they have 'all' or at least one required permission
    const ok = required.some(r => (perms || []).includes('all') || (perms || []).includes(r));
    if (!ok) throw new ForbiddenException('Insufficient permissions');
    return true;
  }
}
