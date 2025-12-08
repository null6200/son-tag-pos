import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { OverridePinService } from '../hrm/override-pin.service';
import { EventsService } from '../events';

interface DraftPayload {
  id?: string;
  branchId: string;
  sectionId?: string;
  tableId?: string;
  orderId?: string;
  name: string;
  serviceType: string;
  waiterId?: string;
  customerName?: string;
  customerPhone?: string;
  cart: any;
  subtotal: string | number;
  discount: string | number;
  tax: string | number;
  taxRate?: string | number;
  total: string | number;
  status: string; // ACTIVE | SUSPENDED
  reservationKey?: string;
}

@Injectable()
export class DraftsService {
  constructor(
    private prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly overridePins: OverridePinService,
    private readonly events: EventsService,
  ) {}

  // Helper: ensure cart updates are non-destructive for limited roles (e.g., waiters).
  // Treats cart as an array of line items with productId and qty; if structure differs,
  // the check becomes a no-op to avoid breaking legacy payloads.
  private isNonDestructiveCartChange(oldCart: any, newCart: any): boolean {
    if (!Array.isArray(oldCart) || !Array.isArray(newCart)) return true;
    const toMap = (cart: any[]): Record<string, number> => {
      const map: Record<string, number> = {};
      for (const line of cart) {
        if (!line) continue;
        const pid = String((line as any).productId || '');
        const qty = Number((line as any).qty || 0);
        if (!pid) continue;
        map[pid] = (map[pid] || 0) + (isNaN(qty) ? 0 : qty);
      }
      return map;
    };
    const before = toMap(oldCart as any[]);
    const after = toMap(newCart as any[]);
    for (const pid of Object.keys(before)) {
      const prev = before[pid] || 0;
      const next = after[pid] || 0;
      // Any net decrease or full removal is considered destructive
      if (next < prev) return false;
    }
    return true;
  }

  // Overloads for backward compatibility
  async list(branchId: string, sectionId?: string, page?: number, pageSize?: number): Promise<any>;
  async list(branchId: string, sectionId: string | undefined, page: number, pageSize: number, userId?: string, perms?: string[]): Promise<any>;
  async list(branchId: string, sectionId?: string, page: number = 1, pageSize: number = 20, userId?: string, perms: string[] = []) {
    const norm = (p: any) => (typeof p === 'string' ? p.toLowerCase() : '');
    const set = new Set((perms || []).map(norm));
    const hasDraftAllFlag = Array.from(set).some((p) => {
      if (p === 'view_drafts_all' || p === 'view_all_draft' || p === 'view_all_drafts' || p === 'edit_all_draft' || p === 'edit_all_drafts' || p === 'draft_view_all') return true;
      // Any explicit view/edit permission that clearly refers to "all drafts"
      if ((p.startsWith('view_') || p.startsWith('edit_') || p.startsWith('draft_')) && p.includes('draft') && p.includes('all')) return true;
      return false;
    });
    const hasAll = set.has('all') || hasDraftAllFlag;
    const hasSalesView = set.has('all') || set.has('view_pos_sell') || set.has('view_sales_all') || Array.from(set).some(p => p.includes('view') && p.includes('sales'));
    // Build where condition; branchId is optional if user has ALL or we scope by userId
    const where: any = {
      ...(branchId ? { branchId } : {}),
      ...(sectionId ? { sectionId } : {}),
    };
    if (!hasAll && userId) {
      where.OR = [
        { waiterId: userId },
        { order: { userId: userId } as any },
      ];
    }
    if (!branchId && !hasAll && !userId) {
      // No way to scope safely
      throw new BadRequestException('branchId required');
    }
    const total = await this.prisma.draft.count({ where });
    let items = await this.prisma.draft.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip: (Math.max(1, page) - 1) * Math.max(1, pageSize),
      take: Math.max(1, pageSize),
    });
    // Filter out drafts whose linked order is already in a terminal state
    try {
      const orderIds = Array.from(new Set(items.map((d: any) => d.orderId).filter(Boolean)));
      if (orderIds.length) {
        const orders = await this.prisma.order.findMany({
          where: { id: { in: orderIds } },
          select: { id: true, status: true },
        });
        const terminal = new Set(['PAID', 'CANCELLED', 'VOIDED', 'REFUNDED']);
        const statusById = new Map(orders.map(o => [o.id, String(o.status || '').toUpperCase()]));
        items = items.filter((d: any) => {
          const st = statusById.get(d.orderId);
          return !st || !terminal.has(st);
        });
      }
    } catch {}
    // Hide suspended (credit) drafts from users without sales view permission
    if (!hasSalesView) {
      items = items.filter((d: any) => String(d.status || '').toUpperCase() !== 'SUSPENDED');
    }
    return { items, total, page, pageSize };
  }

  async get(id: string, userId?: string, perms: string[] = []) {
    const draft = await this.prisma.draft.findUnique({ where: { id } });
    if (!draft) throw new NotFoundException('Draft not found');
    const norm = (p: any) => (typeof p === 'string' ? p.toLowerCase() : '');
    const set = new Set((perms || []).map(norm));
    const hasDraftAllFlag = Array.from(set).some((p) => {
      if (p === 'view_drafts_all' || p === 'view_all_draft' || p === 'view_all_drafts' || p === 'edit_all_draft' || p === 'edit_all_drafts' || p === 'draft_view_all') return true;
      if ((p.startsWith('view_') || p.startsWith('edit_') || p.startsWith('draft_')) && p.includes('draft') && p.includes('all')) return true;
      return false;
    });
    const hasAll = set.has('all') || hasDraftAllFlag;
    const hasSalesView = set.has('all') || set.has('view_pos_sell') || set.has('view_sales_all') || Array.from(set).some(p => p.includes('view') && p.includes('sales'));
    if (!hasAll) {
      if (!userId) {
        throw new BadRequestException('User context required');
      }
      if (!draft.waiterId || String(draft.waiterId) !== String(userId)) {
        let ownerOk = false;
        try {
          if ((draft as any).orderId) {
            const ord = await this.prisma.order.findUnique({ where: { id: (draft as any).orderId }, select: { userId: true } });
            if (ord && String(ord.userId || '') === String(userId)) ownerOk = true;
          }
        } catch {}
        if (!ownerOk) {
          // Hide existence if user is not owner
          throw new NotFoundException('Draft not found');
        }
      }
    }
    // Treat suspended drafts as sales: require sales view permission to view
    if (!hasSalesView && String((draft as any).status || '').toUpperCase() === 'SUSPENDED') {
      throw new NotFoundException('Draft not found');
    }
    return draft;
  }

  async create(dto: DraftPayload, actorUserId?: string) {
    if (!dto.branchId || !dto.name) throw new BadRequestException('Missing fields');

    return this.prisma.$transaction(async (tx) => {
      // Ensure we have an order backing this draft so that Activities can show
      // the full lifecycle (draft -> edits -> finalised) on a single timeline.
      let orderId = dto.orderId || null;
      if (!orderId) {
        // Allocate next order number for this branch
        const updated = await tx.branch.update({
          where: { id: dto.branchId },
          data: { nextOrderSeq: { increment: 1 } },
          select: { nextOrderSeq: true },
        });
        const orderNumber = updated.nextOrderSeq;

        const total = Number(dto.total as any ?? 0);
        const subtotal = Number(dto.subtotal as any ?? 0);
        const discount = Number(dto.discount as any ?? 0);
        const tax = Number(dto.tax as any ?? 0);

        const order = await tx.order.create({
          data: {
            branchId: dto.branchId,
            sectionId: dto.sectionId ?? null,
            userId: actorUserId || null,
            waiterId: dto.waiterId ?? null,
            status: 'DRAFT' as any,
            subtotal: String(isNaN(subtotal) ? 0 : subtotal) as any,
            discount: String(isNaN(discount) ? 0 : discount) as any,
            tax: String(isNaN(tax) ? 0 : tax) as any,
            total: String(isNaN(total) ? 0 : total) as any,
            taxRate: dto.taxRate != null ? (String(dto.taxRate) as any) : undefined,
            serviceType: dto.serviceType,
            tableId: dto.tableId ?? null,
            orderNumber,
          },
        });
        orderId = order.id;

        // Create order items from cart so they persist with the order
        const cartItems = Array.isArray(dto.cart) ? dto.cart : [];
        for (const item of cartItems) {
          const productId = (item as any).productId || (item as any).id;
          if (!productId) continue;
          await tx.orderItem.create({
            data: {
              orderId: order.id,
              productId,
              qty: Number((item as any).qty || 1),
              price: (item as any).price || 0,
            },
          });
        }

        // Log initial CREATED_ORDER event for the draft-backed order
        try {
          await (tx as any).saleEvent.create({
            data: {
              orderId: order.id,
              userId: actorUserId || null,
              action: 'CREATED_ORDER',
              prevStatus: null,
              newStatus: 'DRAFT',
              meta: {
                branchId: dto.branchId,
                sectionId: dto.sectionId ?? null,
                tableId: dto.tableId ?? null,
                waiterId: dto.waiterId ?? null,
                serviceType: dto.serviceType,
                reservationKey: dto.reservationKey ?? null,
                prevTotal: null,
                newTotal: isNaN(total) ? 0 : total,
              },
            },
          });
        } catch {}
      }

      const draft = await tx.draft.create({
        data: {
          branchId: dto.branchId,
          sectionId: dto.sectionId ?? null,
          tableId: dto.tableId ?? null,
          orderId,
          name: dto.name,
          serviceType: dto.serviceType,
          waiterId: dto.waiterId ?? null,
          customerName: dto.customerName ?? null,
          customerPhone: dto.customerPhone ?? null,
          cart: dto.cart,
          subtotal: dto.subtotal as any,
          discount: dto.discount as any,
          tax: dto.tax as any,
          total: dto.total as any,
          status: dto.status,
          reservationKey: dto.reservationKey ?? null,
        },
      });

      // Log a CREATED_DRAFT event linked to the backing order
      if (orderId) {
        try {
          await (tx as any).saleEvent.create({
            data: {
              orderId,
              userId: actorUserId || null,
              action: 'CREATED_DRAFT',
              prevStatus: null,
              newStatus: null,
              meta: {
                draftId: draft.id,
                name: draft.name,
                serviceType: draft.serviceType,
                tableId: draft.tableId,
                waiterId: draft.waiterId,
                status: draft.status,
                reservationKey: draft.reservationKey,
              },
            },
          });
        } catch {}
      }

      // Emit real-time event for draft creation (fire-and-forget)
      try {
        this.events.emitDraftEvent('draft:created', dto.branchId, draft.id, {
          name: draft.name,
          tableId: draft.tableId || null,
          sectionId: draft.sectionId || null,
          status: draft.status,
        }, actorUserId);
      } catch {}

      return draft;
    });
  }

  async update(id: string, dto: Partial<DraftPayload>, userId?: string, perms: string[] = []) {
    const existing = await this.prisma.draft.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Draft not found');
    const norm = (p: any) => (typeof p === 'string' ? p.toLowerCase() : '');
    const set = new Set((perms || []).map(norm));
    const hasDraftAllFlag = Array.from(set).some((p) => {
      if (p === 'view_drafts_all' || p === 'view_all_draft' || p === 'view_all_drafts' || p === 'edit_all_draft' || p === 'edit_all_drafts') return true;
      if ((p.startsWith('view_') || p.startsWith('edit_')) && p.includes('draft') && p.includes('all')) return true;
      return false;
    });
    // Users with explicit payment/finalization rights (e.g. cashiers) are allowed to edit
    // drafts during the checkout flow even when they are not the original waiter. Treat
    // explicit payment permission as draft-all capability so that finalizing a bill can
    // always clean up or link its draft, but do NOT elevate basic POS-sell permission.
    const hasPaymentFinalize = set.has('add_payment');
    const hasEditDraft = set.has('edit_draft');
    const hasAll = set.has('all') || (hasDraftAllFlag && hasEditDraft) || hasPaymentFinalize;
    if (!hasAll) {
      if (!userId) throw new BadRequestException('User context required');
      if (!existing.waiterId || String(existing.waiterId) !== String(userId)) {
        let ownerOk = false;
        try {
          if ((existing as any).orderId) {
            const ord = await this.prisma.order.findUnique({ where: { id: (existing as any).orderId }, select: { userId: true } });
            if (ord && String(ord.userId || '') === String(userId)) ownerOk = true;
          }
        } catch {}
        if (!ownerOk) {
          throw new ForbiddenException('Cannot edit drafts belonging to other users');
        }
      }
      // For non-privileged users editing their own drafts, block destructive cart
      // changes (qty decreases or removals). They are only allowed to add items or
      // increase quantities.
      if (dto.cart !== undefined) {
        const ok = this.isNonDestructiveCartChange(existing.cart, dto.cart);
        if (!ok) {
          throw new ForbiddenException('Insufficient permissions to reduce or remove cart items');
        }
      }
    }
    const updated = await this.prisma.draft.update({
      where: { id },
      data: {
        ...(dto.sectionId !== undefined ? { sectionId: dto.sectionId } : {}),
        ...(dto.tableId !== undefined ? { tableId: dto.tableId } : {}),
        ...(dto.orderId !== undefined ? { orderId: dto.orderId } : {}),
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.serviceType !== undefined ? { serviceType: dto.serviceType } : {}),
        ...(dto.waiterId !== undefined ? { waiterId: dto.waiterId } : {}),
        ...(dto.customerName !== undefined ? { customerName: dto.customerName } : {}),
        ...(dto.customerPhone !== undefined ? { customerPhone: dto.customerPhone } : {}),
        ...(dto.cart !== undefined ? { cart: dto.cart } : {}),
        ...(dto.subtotal !== undefined ? { subtotal: dto.subtotal as any } : {}),
        ...(dto.discount !== undefined ? { discount: dto.discount as any } : {}),
        ...(dto.tax !== undefined ? { tax: dto.tax as any } : {}),
        ...(dto.total !== undefined ? { total: dto.total as any } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.reservationKey !== undefined ? { reservationKey: dto.reservationKey } : {}),
      },
    });

    // Sync order items with cart when draft is updated (if cart changed and order exists)
    const targetOrderId = updated.orderId || existing.orderId;
    if (dto.cart !== undefined && targetOrderId) {
      try {
        // Delete existing order items and recreate from cart
        await this.prisma.orderItem.deleteMany({ where: { orderId: targetOrderId } });
        const cartItems = Array.isArray(dto.cart) ? dto.cart : [];
        for (const item of cartItems) {
          const productId = (item as any).productId || (item as any).id;
          if (!productId) continue;
          await this.prisma.orderItem.create({
            data: {
              orderId: targetOrderId,
              productId,
              qty: Number((item as any).qty || 1),
              price: (item as any).price || 0,
            },
          });
        }
      } catch {}
    }

    // Always sync order totals and taxRate when draft is updated (even if cart didn't change)
    if (targetOrderId) {
      try {
        await this.prisma.order.update({
          where: { id: targetOrderId },
          data: {
            subtotal: dto.subtotal != null ? String(dto.subtotal) : undefined,
            discount: dto.discount != null ? String(dto.discount) : undefined,
            tax: dto.tax != null ? String(dto.tax) : undefined,
            total: dto.total != null ? String(dto.total) : undefined,
            taxRate: dto.taxRate != null ? String(dto.taxRate) : undefined,
          },
        });
      } catch {}
    }

    // Log draft update against linked order, if any
    if (updated.orderId) {
      try {
        const fieldChanges: any[] = [];
        const track = ['name','serviceType','tableId','waiterId','status','reservationKey','subtotal','tax','discount','total','sectionId','customerName','customerPhone'];
        for (const k of track) {
          if ((dto as any)[k] !== undefined) {
            const beforeVal = (existing as any)[k];
            const afterVal = (updated as any)[k];
            const beforeStr = beforeVal === null || beforeVal === undefined ? null : beforeVal;
            const afterStr = afterVal === null || afterVal === undefined ? null : afterVal;
            if (String(beforeStr) !== String(afterStr)) {
              fieldChanges.push({ field: k, from: beforeStr, to: afterStr });
            }
          }
        }
        let cartChanges: any[] = [];
        try {
          if (dto.cart !== undefined) {
            const toMap = (cart: any[]): Record<string, number> => {
              const map: Record<string, number> = {};
              if (!Array.isArray(cart)) return map;
              for (const line of cart) {
                if (!line) continue;
                const pid = String((line as any).productId || (line as any).id || '');
                const qty = Number((line as any).qty || 0);
                if (!pid) continue;
                map[pid] = (map[pid] || 0) + (isNaN(qty) ? 0 : qty);
              }
              return map;
            };
            const before = toMap((existing as any).cart);
            const after = toMap((updated as any).cart);
            const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));
            for (const pid of keys) {
              const prev = before[pid] || 0;
              const next = after[pid] || 0;
              if (prev !== next) cartChanges.push({ productId: pid, from: prev, to: next });
            }
          }
        } catch {}
        const prevTotalNum = (existing as any).total != null ? Number((existing as any).total) : null;
        const newTotalNum = (updated as any).total != null ? Number((updated as any).total) : null;
        const prevStatusStr = (existing as any).status ? String((existing as any).status) : null;
        const newStatusStr = (updated as any).status ? String((updated as any).status) : null;
        await (this.prisma as any).saleEvent.create({
          data: {
            orderId: updated.orderId,
            userId: userId || null,
            action: 'UPDATED_DRAFT',
            prevStatus: prevStatusStr,
            newStatus: newStatusStr,
            meta: {
              draftId: updated.id,
              name: updated.name,
              serviceType: updated.serviceType,
              tableId: updated.tableId,
              waiterId: updated.waiterId,
              status: updated.status,
              reservationKey: updated.reservationKey,
              prevTotal: prevTotalNum,
              newTotal: newTotalNum,
              changes: { fields: fieldChanges, cart: cartChanges },
            },
          },
        });
      } catch {}
    }

    // Emit real-time event for draft update (fire-and-forget)
    try {
      this.events.emitDraftEvent('draft:updated', existing.branchId, updated.id, {
        name: updated.name,
        tableId: updated.tableId || null,
        sectionId: updated.sectionId || null,
        status: updated.status,
        total: updated.total,
      }, userId);
    } catch {}

    return updated;
  }

  async remove(id: string, userId?: string, perms: string[] = [], overrideOwnerId?: string, overridePin?: string) {
    const existing = await this.prisma.draft.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Draft not found');
    const norm = (p: any) => (typeof p === 'string' ? p.toLowerCase() : '');
    const set = new Set((perms || []).map(norm));
    const hasDraftAllFlag = Array.from(set).some((p) => {
      if (p === 'view_drafts_all' || p === 'view_all_draft' || p === 'view_all_drafts' || p === 'edit_all_draft' || p === 'edit_all_drafts') return true;
      if ((p.startsWith('view_') || p.startsWith('edit_')) && p.includes('draft') && p.includes('all')) return true;
      return false;
    });
    // Same rationale as update(): allow users with payment/finalization rights to delete
    // drafts created by other users as part of the settlement flow, so that finalized
    // bills do not leave orphaned drafts behind. Basic POS-sell permission alone does
    // not grant cross-user delete rights.
    const hasPaymentFinalize = set.has('add_payment');
    const hasAll = set.has('all') || hasDraftAllFlag || hasPaymentFinalize;
    if (!hasAll) {
      if (!userId) throw new BadRequestException('User context required');
      if (!existing.waiterId || String(existing.waiterId) !== String(userId)) {
        let ownerOk = false;
        try {
          if ((existing as any).orderId) {
            const ord = await this.prisma.order.findUnique({ where: { id: (existing as any).orderId }, select: { userId: true } });
            if (ord && String(ord.userId || '') === String(userId)) ownerOk = true;
          }
        } catch {}
        if (!ownerOk) {
          throw new ForbiddenException('Cannot delete drafts belonging to other users');
        }
      }
    }

    // If this is a suspended (credit) draft, require per-user override PIN for deletion
    const isSuspended = String((existing as any).status || '').toUpperCase() === 'SUSPENDED';
    if (isSuspended) {
      if (!overrideOwnerId || !overridePin) {
        throw new ForbiddenException('Override PIN required to delete suspended sales');
      }
      try {
        const res = await this.overridePins.verifyUserPin(String(overrideOwnerId), (existing as any).branchId, String(overridePin));
        const ok = !!(res && (res as any).ok === true);
        if (!ok) throw new Error('invalid');
      } catch {
        throw new ForbiddenException('Invalid override PIN');
      }
    }

    const deleted = await this.prisma.draft.delete({ where: { id } });

    // Log draft deletion against linked order is disabled to prevent noisy timeline entries
    if (false && deleted.orderId) {
      try {
        await (this.prisma as any).saleEvent.create({
          data: {
            orderId: deleted.orderId,
            userId: userId || null,
            action: 'DELETED_DRAFT',
            prevStatus: null,
            newStatus: null,
            meta: {
              draftId: deleted.id,
              name: deleted.name,
              serviceType: deleted.serviceType,
              tableId: deleted.tableId,
              waiterId: deleted.waiterId,
              status: deleted.status,
              reservationKey: deleted.reservationKey,
            },
          },
        });
      } catch {}
    }

    // When a delete required a supervisor override PIN, record a dedicated audit entry
    // so Activity Log can show who authenticated the action.
    if (isSuspended && overrideOwnerId && userId && String(overrideOwnerId) !== String(userId)) {
      try {
        const owner = await this.prisma.user.findUnique({
          where: { id: overrideOwnerId },
          select: { id: true, username: true, firstName: true, surname: true },
        });
        const ownerName = owner
          ? (((owner.firstName || '') + (owner.surname ? ` ${owner.surname}` : '')).trim() || owner.username || owner.id)
          : String(overrideOwnerId);
        await this.audit.log({
          action: 'Override Used',
          userId,
          branchId: (deleted as any).branchId || undefined,
          meta: {
            subjectType: 'Override',
            draftId: deleted.id,
            orderId: deleted.orderId || null,
            actorUserId: userId,
            overrideOwnerId,
            overrideOwnerName: ownerName,
            note: `Authenticated by ${ownerName}'s PIN`,
            action: 'DELETED_DRAFT',
          },
        });
      } catch {}
    }

    // Emit real-time event for draft deletion (fire-and-forget)
    try {
      this.events.emitDraftEvent('draft:deleted', deleted.branchId, deleted.id, {
        name: deleted.name,
        tableId: deleted.tableId || null,
        sectionId: deleted.sectionId || null,
      }, userId);
    } catch {}

    return deleted;
  }
}
