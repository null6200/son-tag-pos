import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from './audit.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<any>();

    // Only log HTTP requests with an authenticated user
    const user = request?.user;
    if (!user) {
      return next.handle();
    }

    const { method, url, body, params, query } = request;

    // Avoid logging the audit endpoint itself to prevent recursion
    if (url && url.startsWith('/api/audit')) {
      return next.handle();
    }

    const branchId = user.branchId || request.headers['x-branch-id'] || null;

    // Derive a friendly action/subject from method + path
    const path = (url || '').split('?')[0] || '';
    const upperMethod = String(method || '').toUpperCase();

    const describeRequest = () => {
      // Auth
      if (upperMethod === 'POST' && path === '/api/auth/login') {
        return { subjectType: 'Auth', actionLabel: 'Logged in', note: null };
      }
      if (upperMethod === 'POST' && path === '/api/auth/logout') {
        return { subjectType: 'Auth', actionLabel: 'Logged out', note: null };
      }

      // Orders / Sales
      if (path.startsWith('/api/orders')) {
        if (upperMethod === 'GET') {
          // list / fetch orders is more like viewing data, skip to reduce noise
          return null;
        }
        if (upperMethod === 'POST') return { subjectType: 'Sale', actionLabel: 'Created sale', note: null };
        if (upperMethod === 'PUT' || upperMethod === 'PATCH') return { subjectType: 'Sale', actionLabel: 'Updated sale', note: null };
        if (upperMethod === 'DELETE') return { subjectType: 'Sale', actionLabel: 'Deleted/voided sale', note: null };
        return { subjectType: 'Sale', actionLabel: `${upperMethod} Sale`, note: null };
      }

      // Drafts
      if (path.startsWith('/api/drafts')) {
        if (upperMethod === 'POST') return { subjectType: 'Draft', actionLabel: 'Created draft', note: null };
        if (upperMethod === 'PUT' || upperMethod === 'PATCH') return { subjectType: 'Draft', actionLabel: 'Updated draft', note: null };
        if (upperMethod === 'DELETE') return { subjectType: 'Draft', actionLabel: 'Deleted draft', note: null };
        return { subjectType: 'Draft', actionLabel: `${upperMethod} Draft`, note: null };
      }

      // Stock / Inventory
      if (path.startsWith('/api/inventory/transfer') || path.startsWith('/api/stock/transfer')) {
        return { subjectType: 'Inventory', actionLabel: 'Transferred stock', note: null };
      }
      if (path.startsWith('/api/inventory/adjust') || path.startsWith('/api/stock/adjust')) {
        return { subjectType: 'Inventory', actionLabel: 'Adjusted stock', note: null };
      }
      if (path.startsWith('/api/inventory')) {
        return { subjectType: 'Inventory', actionLabel: `${upperMethod} Inventory`, note: null };
      }

      // Shifts
      if (path.startsWith('/api/shifts')) {
        if (upperMethod === 'POST') return { subjectType: 'Shift', actionLabel: 'Opened shift', note: null };
        if (upperMethod === 'PATCH' || upperMethod === 'PUT') return { subjectType: 'Shift', actionLabel: 'Updated/closed shift', note: null };
        return { subjectType: 'Shift', actionLabel: `${upperMethod} Shift`, note: null };
      }

      // Products
      if (path.startsWith('/api/products')) {
        if (upperMethod === 'POST') return { subjectType: 'Product', actionLabel: 'Created product', note: null };
        if (upperMethod === 'PUT' || upperMethod === 'PATCH') return { subjectType: 'Product', actionLabel: 'Updated product', note: null };
        if (upperMethod === 'DELETE') return { subjectType: 'Product', actionLabel: 'Deleted product', note: null };
        return { subjectType: 'Product', actionLabel: `${upperMethod} Product`, note: null };
      }

      // Reports / dashboard overviews: usually page loads; skip
      if (path.startsWith('/api/reports') || path.startsWith('/api/settings') || path.startsWith('/api/sections')) {
        if (upperMethod === 'GET') {
          return null;
        }
      }

      // Generic fallback
      return {
        subjectType: 'Request',
        actionLabel: `${upperMethod} ${path || '/'}`.trim(),
        note: null,
      };
    };

    const described = describeRequest();
    if (!described) {
      // Explicitly chosen not to log this request
      return next.handle();
    }
    const { subjectType, actionLabel, note } = described;

    return next.handle().pipe(
      tap(async () => {
        try {
          await this.audit.log({
            action: actionLabel,
            userId: user.userId || user.id,
            branchId: branchId || undefined,
            meta: {
              subjectType,
              method: upperMethod,
              path: url,
              params,
              query,
              // Body might contain sensitive data; include only shallow copy
              body,
              note,
            },
          });
        } catch {
          // Swallow audit errors so they never break normal requests
        }
      }),
    );
  }
}
