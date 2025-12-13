import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EventsService } from '../events';

interface CreateOrderItem {
  productId: string;
  qty: string;
  price: string;
}

interface PaymentDto {
  method: string;
  amount: string;
  reference?: string;
}

type OrderStatus = 'DRAFT' | 'ACTIVE' | 'PENDING_PAYMENT' | 'SUSPENDED' | 'PAID' | 'CANCELLED' | 'VOIDED' | 'REFUNDED';

interface CreateOrderDto {
  branchId: string;
  sectionId?: string; // selling section (optional)
  sectionName?: string; // alternative to sectionId; requires branchId
  tableId?: string | null; // optional table binding; used for status-driven locking
  // When finalising a draft-backed order, the POS can send an explicit
  // orderId to force reuse of that backing order instead of creating a
  // new one.
  orderId?: string;
  status?: OrderStatus;    // default: ACTIVE
  items: CreateOrderItem[];
  payment?: PaymentDto;
  allowOverselling?: boolean;
  reservationKey?: string; // binds POS reservations (RESV|<key>) to this order
  // Optional client-computed financials
  subtotal?: string | number;
  discount?: string | number;
  tax?: string | number;
  total?: string | number;
  taxRate?: string | number;
  // Meta
  serviceType?: string;
  waiterId?: string;
}

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly events: EventsService,
  ) {}

  // Internal helper: record a structured event against an order for accountability.
  private async logEvent(orderId: string, params: { userId?: string | null; action: string; prevStatus?: string | null; newStatus?: string | null; meta?: any }) {
    try {
      console.log('[logEvent] Creating event:', { orderId, action: params.action, newStatus: params.newStatus });
      await this.prisma.saleEvent.create({
        data: {
          orderId,
          userId: params.userId || null,
          action: params.action,
          prevStatus: params.prevStatus || null,
          newStatus: params.newStatus || null,
          meta: params.meta ?? null,
        } as any,
      });
      console.log('[logEvent] Event created successfully');
    } catch (err) {
      // Best-effort only; never break core flow because of history logging
      console.error('[logEvent] Failed to create event:', err);
    }
  }

  // Public method to log sale events (e.g., override actions) from the controller
  async logSaleEvent(orderId: string, params: { userId?: string | null; action: string; meta?: any }) {
    return this.logEvent(orderId, params);
  }

  private isLockingStatus(status: OrderStatus | undefined): boolean {
    return status === 'DRAFT' || status === 'ACTIVE' || status === 'PENDING_PAYMENT';
  }

  // List orders with optional pagination. When page/pageSize are omitted, returns a plain array
  // to preserve backward compatibility. When provided, returns a { items, total } envelope.
  async list(branchId?: string, from?: string, to?: string, userId?: string, perms: string[] = [], page?: number, pageSize?: number) {
    const where: any = {
      // Exclude DRAFT orders from sales history - drafts should only appear in the drafts list
      status: { notIn: ['DRAFT'] },
      ...(branchId ? { branchId } : {}),
      ...(from || to
        ? {
            createdAt: {
              gte: from ? new Date(from) : undefined,
              lte: to ? new Date(to) : undefined,
            },
          }
        : {}),
    };
    const hasAll = (perms || []).includes('all')
      || (perms || []).includes('view_sales_all')
      || (perms || []).some(p => typeof p === 'string' && /all/i.test(p) && /sales?/i.test(p));
    if (!hasAll && userId) {
      where.userId = userId;
    }
    const usePaging = typeof page !== 'undefined' || typeof pageSize !== 'undefined';

    if (!usePaging) {
      const rows = await this.prisma.order.findMany({
        where,
        include: {
          items: true,
          payments: true,
          branch: { select: { id: true, name: true } },
          section: { select: { id: true, name: true } },
          table: { select: { id: true, name: true } },
          drafts: { select: { id: true, subtotal: true, tax: true, discount: true, total: true, serviceType: true, waiterId: true } },
        } as any,
        orderBy: { createdAt: 'desc' },
      });
      // Add display invoice fields and merge draft data for credit orders
      return rows.map((o: any) => {
        const invoice = o.invoice_no || o.invoiceNo || o.receiptNo || (typeof o.orderNumber !== 'undefined' ? String(o.orderNumber) : undefined);
        const status = String(o.status || '').toUpperCase();
        const draft = Array.isArray(o.drafts) && o.drafts.length > 0 ? o.drafts[0] : null;
        const emptyService = !o.serviceType || !String(o.serviceType).trim();
        const needsDraftFallback =
          (o.subtotal == null || Number(o.subtotal) === 0) ||
          (o.tax == null || (Number(o.tax) === 0 && draft?.tax && Number(draft.tax) > 0)) ||
          (o.discount == null || (Number(o.discount) === 0 && draft?.discount && Number(draft.discount) > 0)) ||
          ((o.serviceType == null || emptyService) && !!draft?.serviceType);
        const merged: any = { ...o };
        if (((status === 'SUSPENDED' || status === 'PENDING_PAYMENT') || needsDraftFallback) && draft) {
          if (draft.subtotal != null) merged.subtotal = draft.subtotal as any;
          if (draft.tax != null) merged.tax = draft.tax as any;
          if (draft.discount != null) merged.discount = draft.discount as any;
          if (draft.total != null) merged.total = draft.total as any;
          if (emptyService && draft.serviceType) merged.serviceType = draft.serviceType;
          if ((!merged.waiterName || !String(merged.waiterName).trim()) && draft.waiterId) merged.waiterId = draft.waiterId;
        }
        // Normalize status for display: if sum(payments) >= total, mark PAID
        // but **never** override terminal statuses like REFUNDED / CANCELLED / VOIDED / DRAFT.
        try {
          const total = Number(merged.total ?? 0);
          const payments = Array.isArray(merged.payments) ? merged.payments : [];
          const paid = payments.reduce((a: number, p: any) => a + Number(p.amount || 0), 0);
          const currentStatus = String(merged.status || '').toUpperCase();
          const isTerminal = currentStatus === 'REFUNDED' || currentStatus === 'CANCELLED' || currentStatus === 'VOIDED' || currentStatus === 'DRAFT';
          if (!isTerminal && total > 0 && paid >= total) merged.status = 'PAID' as any;
        } catch {}
        return {
          ...merged,
          displayInvoice: invoice ? String(invoice) : undefined,
          branchName: merged?.branch?.name || undefined,
          sectionName: merged?.section?.name || undefined,
          tableName: merged?.table?.name || undefined,
          waiter: merged?.waiterName || undefined,
          serviceType: merged?.serviceType || undefined,
        };
      });
    }

    const pageNum = Math.max(1, Number(page) || 1);
    const size = Math.min(Math.max(Number(pageSize) || 20, 1), 200);
    const skip = (pageNum - 1) * size;

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: {
          items: true,
          payments: true,
          branch: { select: { id: true, name: true } },
          section: { select: { id: true, name: true } },
          table: { select: { id: true, name: true } },
          drafts: { select: { id: true, subtotal: true, tax: true, discount: true, total: true, serviceType: true, waiterId: true } },
        } as any,
        orderBy: { createdAt: 'desc' },
        skip,
        take: size,
      }),
      this.prisma.order.count({ where }),
    ]);
    // Add display invoice fields and merge draft data for credit orders
    const mapped = rows.map((o: any) => {
      const invoice = o.invoice_no || o.invoiceNo || o.receiptNo || (typeof o.orderNumber !== 'undefined' ? String(o.orderNumber) : undefined);
      const status = String(o.status || '').toUpperCase();
      const draft = Array.isArray(o.drafts) && o.drafts.length > 0 ? o.drafts[0] : null;
      const emptyService = !o.serviceType || !String(o.serviceType).trim();
      const needsDraftFallback =
        (o.subtotal == null || Number(o.subtotal) === 0) ||
        (o.tax == null || (Number(o.tax) === 0 && draft?.tax && Number(draft.tax) > 0)) ||
        (o.discount == null || (Number(o.discount) === 0 && draft?.discount && Number(draft.discount) > 0)) ||
        ((o.serviceType == null || emptyService) && !!draft?.serviceType);
      const merged: any = { ...o };
      if (((status === 'SUSPENDED' || status === 'PENDING_PAYMENT') || needsDraftFallback) && draft) {
        if (draft.subtotal != null) merged.subtotal = draft.subtotal as any;
        if (draft.tax != null) merged.tax = draft.tax as any;
        if (draft.discount != null) merged.discount = draft.discount as any;
        if (draft.total != null) merged.total = draft.total as any;
        if (emptyService && draft.serviceType) merged.serviceType = draft.serviceType;
        if ((!merged.waiterName || !String(merged.waiterName).trim()) && draft.waiterId) merged.waiterId = draft.waiterId;
      }
      // Normalize status for display: if sum(payments) >= total, mark PAID
      // but **never** override terminal statuses like REFUNDED / CANCELLED / VOIDED / DRAFT.
      try {
        const total = Number(merged.total ?? 0);
        const payments = Array.isArray(merged.payments) ? merged.payments : [];
        const paid = payments.reduce((a: number, p: any) => a + Number(p.amount || 0), 0);
        const currentStatus = String(merged.status || '').toUpperCase();
        const isTerminal = currentStatus === 'REFUNDED' || currentStatus === 'CANCELLED' || currentStatus === 'VOIDED' || currentStatus === 'DRAFT';
        if (!isTerminal && total > 0 && paid >= total) merged.status = 'PAID' as any;
      } catch {}
      return {
        ...merged,
        displayInvoice: invoice ? String(invoice) : undefined,
        branchName: merged?.branch?.name || undefined,
        sectionName: merged?.section?.name || undefined,
        tableName: merged?.table?.name || undefined,
        waiter: merged?.waiterName || undefined,
        serviceType: merged?.serviceType || undefined,
      };
    });
    return { items: mapped, total };
  }

  async getOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { product: { select: { id: true, name: true } } } },
        payments: true,
        user: { select: { id: true, username: true, firstName: true, surname: true } },
        branch: { select: { id: true, name: true } },
        section: { select: { id: true, name: true } },
        table: { select: { id: true, name: true } },
        drafts: { select: { id: true, subtotal: true, discount: true, tax: true, total: true, serviceType: true, waiterId: true, tableId: true, sectionId: true } },
        saleEvents: {
          orderBy: { createdAt: 'asc' },
        } as any,
      } as any,
    });
    if (!order) throw new BadRequestException('Order not found');
    const invoice = (order as any).invoice_no || (order as any).invoiceNo || (order as any).receiptNo || (typeof (order as any).orderNumber !== 'undefined' ? String((order as any).orderNumber) : undefined);

    // Fallbacks for credit orders (suspended / pending) using linked draft
    const status = String((order as any).status || '').toUpperCase();
    const hasDraft = Array.isArray((order as any).drafts) && (order as any).drafts.length > 0;
    const draft = hasDraft ? (order as any).drafts[0] : null;

    let waiterName = (order as any).waiterName as string | null;
    if ((!waiterName || !waiterName.trim()) && (order as any).waiterId) {
      try {
        const w = await this.prisma.user.findUnique({ where: { id: (order as any).waiterId }, select: { username: true, firstName: true, surname: true } });
        if (w) waiterName = (w.firstName || w.surname) ? `${w.firstName || ''} ${w.surname || ''}`.trim() : (w.username || null);
      } catch {}
    }

    const enriched: any = { ...(order as any) };
    const emptyService = !enriched.serviceType || !String(enriched.serviceType).trim();
    const needsDraftFallback =
      (enriched.subtotal == null || Number(enriched.subtotal) === 0) ||
      (enriched.tax == null || (Number(enriched.tax) === 0 && draft?.tax && Number(draft.tax) > 0)) ||
      (enriched.discount == null || (Number(enriched.discount) === 0 && draft?.discount && Number(draft.discount) > 0)) ||
      ((enriched.serviceType == null || emptyService) && !!draft?.serviceType);
    if (((status === 'SUSPENDED' || status === 'PENDING_PAYMENT') || needsDraftFallback) && draft) {
      // Use draft financials when present
      if (draft.subtotal != null) enriched.subtotal = draft.subtotal as any;
      if (draft.tax != null) enriched.tax = draft.tax as any;
      if (draft.discount != null) enriched.discount = draft.discount as any;
      if (draft.total != null) enriched.total = draft.total as any;
      if (emptyService && draft.serviceType) enriched.serviceType = draft.serviceType;
      // If waiter missing, we can keep waiterId (frontend displays name via waiter field)
      if ((!waiterName || !waiterName.trim()) && draft.waiterId) {
        try {
          const w = await this.prisma.user.findUnique({ where: { id: draft.waiterId }, select: { username: true, firstName: true, surname: true } });
          if (w) waiterName = (w.firstName || w.surname) ? `${w.firstName || ''} ${w.surname || ''}`.trim() : (w.username || null);
        } catch {}
      }
    }

    // If the persisted order lost its tableId (e.g. older logic cleared it on PAID), but the
    // latest draft still has tableId, backfill tableId and table so Sales Details can always
    // show the correct table even for finalized credit sales.
    if (!enriched.tableId && draft?.tableId) {
      enriched.tableId = draft.tableId as any;
      try {
        const t = await this.prisma.table.findUnique({
          where: { id: draft.tableId },
          select: { id: true, name: true },
        });
        if (t) {
          (enriched as any).table = t as any;
        }
      } catch {}
    }
    // Attach timeline of events for full accountability on invoice details
    const rawEvents = Array.isArray((order as any).saleEvents)
      ? (order as any).saleEvents
      : [];

    let events: any[] = [];
    if (rawEvents.length > 0) {
      // Enrich each event with human-readable names for display, including actorUserId embedded in meta
      const collectIds: string[] = [];
      for (const ev of rawEvents as any[]) {
        if (ev.userId) collectIds.push(String(ev.userId));
        const actorId = ev?.meta?.actorUserId ? String(ev.meta.actorUserId) : null;
        if (actorId) collectIds.push(actorId);
      }
      const userIds = Array.from(new Set(collectIds));
      let usersById: Map<string, { id: string; username?: string | null; firstName?: string | null; surname?: string | null }>;
      try {
        const users = userIds.length
          ? await this.prisma.user.findMany({
              where: { id: { in: userIds as any } },
              select: { id: true, username: true, firstName: true, surname: true },
            })
          : [];
        usersById = new Map(users.map((u: any) => [String(u.id), u]));
      } catch {
        usersById = new Map();
      }

      events = rawEvents.map((ev: any) => {
        const u = ev.userId ? usersById.get(String(ev.userId)) : null;
        const fullName = u
          ? (((u.firstName || '') + (u.surname ? ` ${u.surname}` : '')).trim() || u.username || u.id)
          : null;
        const actorId = ev?.meta?.actorUserId ? String(ev.meta.actorUserId) : null;
        const actor = actorId ? usersById.get(actorId) : null;
        const actorFull = actor
          ? (((actor.firstName || '') + (actor.surname ? ` ${actor.surname}` : '')).trim() || actor.username || actor.id)
          : null;
        const meta = ev.meta ? { ...ev.meta, actorUserName: actorFull } : (actorFull ? { actorUserName: actorFull } : null);
        return {
          id: ev.id,
          action: ev.action,
          prevStatus: ev.prevStatus,
          newStatus: ev.newStatus,
          meta,
          createdAt: ev.createdAt,
          userId: ev.userId,
          userName: fullName,
        };
      });
    }

    return { ...enriched, displayInvoice: invoice, waiter: waiterName, tableName: (enriched as any)?.table?.name || undefined, events } as any;
  }

  async create(dto: CreateOrderDto, userId?: string, overrideOwnerId?: string) {
    if (!dto.items?.length) throw new BadRequestException('No items');

    // Idempotency check: if client provided an idempotencyKey, check if order already exists
    const idempotencyKey = (dto as any).idempotencyKey || null;
    if (idempotencyKey) {
      const existing = await this.prisma.order.findUnique({ 
        where: { idempotencyKey },
        include: { items: true, payments: true }
      });
      if (existing) {
        // Order already created - return existing (idempotent response)
        console.log('[create] Idempotent hit - returning existing order:', idempotencyKey);
        return existing;
      }
    }

    return this.prisma.$transaction(async (tx) => {
      // Resolve branchId if missing: from section -> earliest branch
      let resolvedBranchId: string | undefined = dto.branchId;
      // If sectionName is provided (and branchId known), resolve sectionId first
      if (!dto.sectionId && dto.sectionName && resolvedBranchId) {
        const secByName = await tx.section.findFirst({ where: { name: dto.sectionName, branchId: resolvedBranchId }, select: { id: true } });
        if (!secByName) throw new BadRequestException('Section not found');
        dto.sectionId = secByName.id;
      }
      if (!resolvedBranchId && dto.sectionId) {
        const sec = await tx.section.findUnique({ where: { id: dto.sectionId }, select: { branchId: true } });
        resolvedBranchId = sec?.branchId || undefined;
      }
      if (!resolvedBranchId) {
        const first = await tx.branch.findFirst({ select: { id: true }, orderBy: { createdAt: 'asc' } });
        resolvedBranchId = first?.id || undefined;
      }
      if (!resolvedBranchId) throw new BadRequestException('branchId required');
      // Determine per-item permission for section sale. If any item is not allowed in the section function,
      // that item alone will be processed at branch level; allowed items remain section-scoped.
      const canUseSectionByProduct: Record<string, boolean> = {};
      let sectionFnId: string | null = null;
      if (dto.sectionId) {
        const section = await tx.section.findUnique({ where: { id: dto.sectionId } });
        if (!section) throw new BadRequestException('Section not found');
        sectionFnId = section.sectionFunctionId || null;
        if (sectionFnId) {
          const productIds = Array.from(new Set(dto.items.map(i => i.productId)));
          const products = await tx.product.findMany({ where: { id: { in: productIds } }, select: { id: true, productTypeId: true } });
          const byProductId: Record<string, string | null> = Object.fromEntries(products.map(p => [p.id, p.productTypeId || null]));
          const distinctTypes = Array.from(new Set(products.map(p => p.productTypeId).filter(Boolean) as string[]));
          const links = distinctTypes.length > 0
            ? await tx.productTypeAllowedFunction.findMany({ where: { productTypeId: { in: distinctTypes } } })
            : [];
          const allowedCache: Record<string, Set<string> | 'ALL'> = {};
          for (const ptId of distinctTypes) {
            const pts = links.filter(l => l.productTypeId === ptId).map(l => l.sectionFunctionId);
            allowedCache[ptId] = pts.length === 0 ? 'ALL' : new Set(pts);
          }
          for (const it of dto.items) {
            const ptId = byProductId[it.productId] || null;
            if (!ptId) { canUseSectionByProduct[it.productId] = true; continue; }
            const allowed = allowedCache[ptId];
            if (!allowed || allowed === 'ALL' || (allowed as Set<string>).has(sectionFnId!)) {
              canUseSectionByProduct[it.productId] = true;
            } else {
              canUseSectionByProduct[it.productId] = false;
            }
          }
        } else {
          // No function configured -> allow section sale for all
          for (const it of dto.items) canUseSectionByProduct[it.productId] = true;
        }
      } else {
        // No section specified -> all items branch-level
        for (const it of dto.items) canUseSectionByProduct[it.productId] = false;
      }

      // Initial status and strict table locking. Reuse logic prefers an explicit
      // orderId (for draft-backed orders) and falls back to table-based lookup
      // when the client sets reuseExisting. When replacing, clear items.
      const initialStatus: OrderStatus = dto.status || 'ACTIVE';
      let order: any = null;

      // 1) Explicit orderId from client (e.g. finalising a draft-backed order).
      //    If the client passes an orderId we always attempt reuse, even if
      //    validation/whitelisting stripped a reuseExisting flag on the DTO.
      //    Always delete existing items when reusing to avoid duplicates.
      if ((dto as any).orderId) {
        const existingById = await tx.order.findUnique({ where: { id: (dto as any).orderId } });
        if (existingById) {
          order = existingById;
          // Always clear existing items when reusing an order to prevent duplicates
          await tx.orderItem.deleteMany({ where: { orderId: order.id } });
        }
      }

      // 1b) Fallback reuse by reservationKey: if the client forgot to send orderId
      // but the cart still carries the same reservationKey as a draft, reuse the
      // backing order from the most recent matching draft. This keeps the draft
      // lifecycle and the paid sale on the same order id even when the POS
      // omits orderId in the finalisation payload.
      if (!order && (dto as any).reservationKey) {
        const draft = await tx.draft.findFirst({
          where: { reservationKey: (dto as any).reservationKey },
          orderBy: { updatedAt: 'desc' },
        });
        if (draft?.orderId) {
          const existingByDraft = await tx.order.findUnique({ where: { id: draft.orderId } });
          if (existingByDraft) {
            order = existingByDraft;
            // Always clear existing items when reusing an order to prevent duplicates
            await tx.orderItem.deleteMany({ where: { orderId: order.id } });
          }
        }
      }

      // 2) Fallback: reuse most recent open order on the same table
      if (!order && dto.tableId && this.isLockingStatus(initialStatus) && (dto as any)['reuseExisting']) {
        const existing = await tx.order.findFirst({
          where: { tableId: dto.tableId, status: { in: ['DRAFT','ACTIVE','PENDING_PAYMENT'] as any } },
          orderBy: { updatedAt: 'desc' },
        });
        if (existing) {
          order = existing;
          if ((dto as any)['replaceItems']) {
            await tx.orderItem.deleteMany({ where: { orderId: order.id } });
          }
        }
      }

      // create order if we didn't reuse an existing one
      // Pre-resolve waiterName if not provided but waiterId is present
      let waiterName: string | null = null;
      if (dto.waiterId && !dto['waiterName']) {
        try {
          const w = await tx.user.findUnique({ where: { id: dto.waiterId }, select: { username: true, firstName: true, surname: true } });
          if (w) waiterName = w.firstName || w.surname ? `${w.firstName || ''} ${w.surname || ''}`.trim() : (w.username || null);
        } catch {}
      }
      const isReused = !!order;
      if (!order) {
        // allocate next order number for this branch ONLY when creating a new order
        const updated = await tx.branch.update({
          where: { id: resolvedBranchId },
          data: { nextOrderSeq: { increment: 1 } },
          select: { nextOrderSeq: true },
        });
        const orderNumber = updated.nextOrderSeq;
        order = await tx.order.create({
          data: {
            branchId: resolvedBranchId,
            sectionId: dto.sectionId || null,
            userId: userId || null,
            status: (initialStatus as any) || ('ACTIVE' as any),
            total: '0' as any,
            orderNumber,
            tableId: dto.tableId || null,
            waiterId: dto.waiterId || null,
            waiterName: (dto as any).waiterName || waiterName,
            serviceType: dto.serviceType || null,
            idempotencyKey: idempotencyKey,
          },
        });
      }

      let total = 0;

      for (const it of dto.items) {
        // create item
        await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: it.productId,
            qty: Number(it.qty),
            price: it.price as any,
          },
        });
        // NOTE: Stock is now decremented on add-to-cart in the frontend (CART_ADD reason)
        // No stock decrement or validation needed here - stock was already decremented when items were added to cart
        total += parseFloat(it.price) * Number(it.qty);
      }

      // Apply client-provided totals if present: total = subtotal + tax - discount
      const sub = dto.subtotal != null ? Number(dto.subtotal as any) : Number(total);
      const disc = dto.discount != null ? Number(dto.discount as any) : 0;
      const txAmt = dto.tax != null ? Number(dto.tax as any) : 0;
      const txRate = dto.taxRate != null ? Number(dto.taxRate as any) : null;
      const finalTotal = dto.total != null && !isNaN(Number(dto.total as any))
        ? Number(dto.total as any)
        : (Number(sub) + Number(txAmt) - Number(disc));

      // If an immediate payment is provided that fully covers the total, mark as PAID
      let effectiveStatus: OrderStatus = initialStatus;
      if (dto.payment && dto.payment.method && dto.payment.amount) {
        const payAmt = Number(dto.payment.amount as any);
        if (!isNaN(payAmt) && finalTotal > 0 && payAmt >= finalTotal) {
          effectiveStatus = 'PAID';
        }
      }

      await tx.order.update({
        where: { id: order.id },
        data: {
          total: String(finalTotal) as any,
          subtotal: String(isNaN(sub) ? 0 : sub) as any,
          discount: String(isNaN(disc) ? 0 : disc) as any,
          tax: String(isNaN(txAmt) ? 0 : txAmt) as any,
          taxRate: txRate !== null && !isNaN(txRate) ? (String(txRate) as any) : undefined,
          status: effectiveStatus as any,
        },
      });

      // optional payment persistence
      if (dto.payment && dto.payment.method && dto.payment.amount) {
        await tx.payment.create({
          data: {
            orderId: order.id,
            method: dto.payment.method,
            amount: dto.payment.amount as any,
            reference: dto.payment.reference || null,
          },
        });
        try {
          await tx.saleEvent.create({
            data: {
              orderId: order.id,
              userId: userId || null,
              action: 'ADDED_PAYMENT',
              prevStatus: String(((order as any).status || initialStatus) as any),
              newStatus: String(effectiveStatus as any),
              meta: {
                method: dto.payment.method,
                amount: Number(dto.payment.amount as any) || 0,
                reference: dto.payment.reference || null,
                paid: Number(dto.payment.amount as any) || 0,
                total: Number(finalTotal) || 0,
              },
            } as any,
          });
        } catch (err) {
          console.error('[create] Failed to log ADDED_PAYMENT event:', err);
        }
      }

      const created = await tx.order.findUnique({
        where: { id: order.id },
        include: {
          items: { include: { product: { select: { id: true, name: true } } } },
          payments: true,
        } as any,
      });

      // Fire-and-forget audit log entry for Activity Log
      try {
        const anyCreated: any = created as any;
        const invoice = anyCreated?.invoice_no
          || anyCreated?.invoiceNo
          || anyCreated?.receiptNo
          || (typeof anyCreated?.orderNumber !== 'undefined' ? String(anyCreated.orderNumber) : undefined);
        await this.audit.log({
          action: 'Sale Added',
          userId: userId,
          branchId: resolvedBranchId,
          meta: {
            subjectType: 'Sell',
            invoiceNo: invoice,
            status: anyCreated?.status || effectiveStatus,
            total: finalTotal,
          },
        });
      } catch (err) {
        console.error('[create] Failed to log audit entry:', err);
      }

      // Enrich the initial CREATED_ORDER event with financial totals so the
      // Activities timeline can show status + amount for the first row.
      // For draft-backed orders, DraftsService.create has already logged
      // CREATED_ORDER, so avoid duplicating the event when reusing.
      if (!isReused) {
        try {
          console.log('[create] Logging CREATED_ORDER event for order:', order.id);
          await tx.saleEvent.create({
            data: {
              orderId: order.id,
              userId: userId || null,
              action: 'CREATED_ORDER',
              prevStatus: null,
              newStatus: String(initialStatus || 'ACTIVE'),
              meta: {
                branchId: resolvedBranchId,
                sectionId: dto.sectionId || null,
                tableId: dto.tableId || null,
                waiterId: dto.waiterId || null,
                serviceType: dto.serviceType || null,
                reservationKey: dto.reservationKey || null,
                prevTotal: null,
                newTotal: finalTotal,
              },
            } as any,
          });
          console.log('[create] CREATED_ORDER event logged successfully');
        } catch (err) {
          console.error('[create] Failed to log CREATED_ORDER event:', err);
        }
      }

      // If the effective status differs from initial (e.g., payment made it PAID),
      // log a STATUS_CHANGED event so the Activities timeline shows the transition.
      if (effectiveStatus !== initialStatus) {
        try {
          await tx.saleEvent.create({
            data: {
              orderId: order.id,
              userId: userId || null,
              action: 'STATUS_CHANGED',
              prevStatus: String(initialStatus || 'ACTIVE'),
              newStatus: String(effectiveStatus),
              meta: {
                prevTotal: finalTotal,
                newTotal: finalTotal,
              },
            } as any,
          });
        } catch (err) {
          console.error('[create] Failed to log STATUS_CHANGED event:', err);
        }
      }

      // Optional override PIN audit for discounts
      if (overrideOwnerId) {
        try {
          const numDisc = dto.discount != null ? Number(dto.discount as any) : 0;
          if (!isNaN(numDisc) && numDisc > 0) {
            const supervisor = await this.prisma.user.findUnique({
              where: { id: overrideOwnerId },
              select: { username: true, firstName: true, surname: true },
            });
            const overrideOwnerName = supervisor
              ? (((supervisor.firstName || '') + (supervisor.surname ? ` ${supervisor.surname}` : '')).trim() || supervisor.username)
              : overrideOwnerId;

            await this.audit.log({
              action: 'Override Used',
              userId: overrideOwnerId,
              branchId: resolvedBranchId,
              meta: {
                action: 'APPLIED_DISCOUNT',
                subjectType: 'Override',
                orderId: order.id,
                overrideOwnerId,
                overrideOwnerName,
                actorUserId: userId || null,
                discountAmount: numDisc,
              },
            });
          }
        } catch {}
      }

      // Emit real-time event for sale creation (fire-and-forget, never blocks)
      try {
        this.events.emitSaleEvent('sale:created', resolvedBranchId, order.id, {
          status: effectiveStatus,
          total: finalTotal,
          tableId: dto.tableId || null,
          sectionId: dto.sectionId || null,
        }, userId);
      } catch {}

      return created;
    });
  }

  // Update order status; release table on non-locking (includes SUSPENDED)
  async updateStatus(orderId: string, status: OrderStatus, reuseExisting: boolean = false, actorUserId?: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) throw new BadRequestException('Order not found');

      // If entering a locking status and we still have tableId, ensure no conflict
      if (order.tableId && this.isLockingStatus(status)) {
        const existing = await tx.order.findFirst({
          where: { tableId: order.tableId, status: { in: ['DRAFT','ACTIVE','PENDING_PAYMENT'] as any }, NOT: { id: orderId } },
          orderBy: { updatedAt: 'desc' },
        });
        if (existing) throw new BadRequestException(`Table is occupied by order ${existing.id}`);
      }

      const isLocking = this.isLockingStatus(status);
      const data: any = { status: status as any };

      // For non-locking statuses, proactively unlock the table
      const shouldUnlock = !isLocking && !!order.tableId && ['PAID','SUSPENDED','CANCELLED','VOIDED','REFUNDED'].includes(status as any);
      if (shouldUnlock) {
        try {
          await tx.table.update({ where: { id: order.tableId as any }, data: { status: 'available' } });
        } catch {}
      }

      // If moving to PAID, merge financials/meta from latest draft when order is missing values and recompute total.
      if (status === 'PAID') {
        const draft = await tx.draft.findFirst({ where: { orderId }, orderBy: { updatedAt: 'desc' } });
        const o: any = order as any;
        try {
          // TEMP-DEBUG: trace tableId when updating status to PAID
          console.log('[OrdersService.updateStatus][PAID]', {
            orderId,
            statusFrom: order.status,
            statusTo: status,
            tableFromOrder: o.tableId || null,
            tableFromDraft: draft ? (draft as any).tableId || null : null,
          });
        } catch {}

        if (draft) {
          const ordSub = Number(o.subtotal ?? 0);
          const ordTax = Number(o.tax ?? 0);
          const ordDisc = Number(o.discount ?? 0);
          const ordTotal = Number(o.total ?? 0);
          const dSub = draft.subtotal !== null && draft.subtotal !== undefined ? Number(draft.subtotal as any) : null;
          const dTax = draft.tax !== null && draft.tax !== undefined ? Number(draft.tax as any) : null;
          const dDisc = draft.discount !== null && draft.discount !== undefined ? Number(draft.discount as any) : null;
          const dTotal = draft.total !== null && draft.total !== undefined ? Number(draft.total as any) : null;

          // Prefer draft values when present; otherwise keep order values
          const sub = dSub != null ? dSub : ordSub;
          const tax = dTax != null ? dTax : ordTax;
          const disc = dDisc != null ? dDisc : ordDisc;
          const finalTotal = dTotal != null ? dTotal : (sub + tax - disc);

          data.subtotal = String(sub) as any;
          data.tax = String(tax) as any;
          data.discount = String(disc) as any;
          data.total = String(finalTotal) as any;
          // Backfill sectionId and serviceType if missing or empty on order
          if (!o.sectionId && draft.sectionId) data.sectionId = draft.sectionId as any;
          if ((!o.serviceType || !String(o.serviceType).trim()) && draft.serviceType) data.serviceType = draft.serviceType;
          // waiter fallback from order.waiterId or draft.waiterId
          let waiterName: string | null = o.waiterName as any;
          let waiterId: string | null = o.waiterId as any;
          if (!waiterId && (draft as any).waiterId) waiterId = (draft as any).waiterId;
          if ((!waiterName || !waiterName.trim()) && waiterId) {
            try {
              const w = await tx.user.findUnique({ where: { id: waiterId }, select: { username: true, firstName: true, surname: true } });
              if (w) waiterName = (w.firstName || w.surname) ? `${w.firstName || ''} ${w.surname || ''}`.trim() : (w.username || null);
            } catch {}
          }
          if (waiterId) data.waiterId = waiterId;
          if (waiterName) data.waiterName = waiterName as any;
        } else {
          // No draft: nothing to backfill for tableId
        }

        // If this order is being finalized and has no printed number yet, allocate a new receipt number.
        // Include orderNumber in the check to avoid double-allocating when draft/order creation already assigned one.
        const hasPrintedNumber = (o as any).invoice_no || (o as any).invoiceNo || (o as any).receiptNo || (o as any).orderNumber;
        try {
          if (!hasPrintedNumber) {
            const upd = await tx.branch.update({
              where: { id: (o as any).branchId },
              data: { nextOrderSeq: { increment: 1 } },
              select: { nextOrderSeq: true },
            });
            (data as any).receiptNo = String(upd.nextOrderSeq) as any;
          }
        } catch {}

        // NOTE: Stock is now decremented on add-to-cart in the frontend (CART_ADD reason)
        // No stock decrement needed here - stock was already decremented when items were added to cart
      }
      // If moving to SUSPENDED, we also want to free the table and unlink it from the order
      if (status === 'SUSPENDED') {
        // no financial backfill needed here; just ensure unlink happens below
      }

      // NOTE: We no longer clear tableId on PAID/SUSPENDED - table info should be preserved
      // for historical/reporting purposes. Table availability is managed separately.
      const prevTotal = Number((order as any).total ?? 0);
      const updated = await tx.order.update({ where: { id: orderId }, data });

      // Log status change event for full lifecycle trace (including financials)
      // Skip logging if status hasn't actually changed (e.g., PAID → PAID)
      const prevStatusStr = String(order.status || '');
      const newStatusStr = String(updated.status || '');
      if (prevStatusStr !== newStatusStr) {
        try {
          await tx.saleEvent.create({
            data: {
              orderId,
              userId: actorUserId || null,
              action: 'STATUS_CHANGED',
              prevStatus: prevStatusStr,
              newStatus: newStatusStr,
              meta: {
                reuseExisting,
                prevTotal,
                newTotal: Number((updated as any).total ?? prevTotal),
              },
            } as any,
          });
        } catch (err) {
          console.error('[updateStatus] Failed to log STATUS_CHANGED event:', err);
        }

        // Emit real-time event for status change (fire-and-forget)
        try {
          this.events.emitSaleEvent('sale:status_changed', order.branchId, orderId, {
            prevStatus: prevStatusStr,
            newStatus: newStatusStr,
            tableId: order.tableId || null,
          }, actorUserId);
        } catch {}
      }

      return updated;
    });
  }

  // Log a dedicated override suspend event so invoice history clearly shows which
  // supervisor/manager's override PIN was used, separate from the actor who
  // performed the status change.
  async logOverrideSuspend(orderId: string, actorUserId?: string, overrideOwnerId?: string) {
    if (!overrideOwnerId) return;
    try {
      const order = await this.prisma.order.findUnique({ where: { id: orderId } });
      if (!order) return;
      await this.logEvent(orderId, {
        userId: overrideOwnerId,
        action: 'OVERRIDE_SUSPEND',
        prevStatus: String(order.status || ''),
        newStatus: String(order.status || ''),
        meta: {
          actorUserId: actorUserId || null,
        },
      });
    } catch (err) {
      console.error('[logOverrideSuspend] Failed to log override event:', err);
    }
  }

  // Update order totals (subtotal, tax, taxRate, discount, total) without changing status
  async updateTotals(orderId: string, data: { subtotal?: string; discount?: string; tax?: string; total?: string; taxRate?: string }, actorUserId?: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new BadRequestException('Order not found');

    const updateData: any = {};
    if (data.subtotal !== undefined) updateData.subtotal = data.subtotal;
    if (data.discount !== undefined) updateData.discount = data.discount;
    if (data.tax !== undefined) updateData.tax = data.tax;
    if (data.total !== undefined) updateData.total = data.total;
    if (data.taxRate !== undefined) updateData.taxRate = data.taxRate;

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: updateData,
    });

    return updated;
  }

  async refund(orderId: string, actorUserId?: string, overrideOwnerId?: string, idempotencyKey?: string) {
    // Idempotency check: if client provided an idempotencyKey, check if refund already exists
    if (idempotencyKey) {
      const existing = await this.prisma.salesReturn.findUnique({ where: { idempotencyKey } });
      if (existing) {
        // Refund already processed - return current order state (idempotent response)
        console.log('[refund] Idempotent hit - returning existing refund:', idempotencyKey);
        const order = await this.prisma.order.findUnique({ 
          where: { id: orderId }, 
          include: { items: true, payments: true, salesReturns: true } 
        });
        return order;
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
      if (!order) throw new BadRequestException('Order not found');

      // Restock items back to inventory (per-section if order.sectionId present; else branch-level)
      for (const it of order.items) {
        if (order.sectionId) {
          const inv = await tx.sectionInventory.upsert({
            where: { productId_sectionId: { productId: it.productId, sectionId: order.sectionId } },
            update: {},
            create: { productId: it.productId, sectionId: order.sectionId, qtyOnHand: 0 },
          });
          await tx.sectionInventory.update({
            where: { productId_sectionId: { productId: it.productId, sectionId: order.sectionId } },
            data: { qtyOnHand: inv.qtyOnHand + it.qty },
          });
          // Movement: REFUND to section
          await tx.stockMovement.create({
            data: {
              productId: it.productId,
              branchId: order.branchId,
              sectionFrom: null,
              sectionTo: order.sectionId,
              delta: Math.abs(it.qty || 0),
              reason: 'REFUND',
              referenceId: order.id,
            },
          });
        } else {
          const inv = await tx.inventory.upsert({
            where: { productId_branchId: { productId: it.productId, branchId: order.branchId } },
            update: {},
            create: { productId: it.productId, branchId: order.branchId, qtyOnHand: 0 },
          });
          await tx.inventory.update({
            where: { productId_branchId: { productId: it.productId, branchId: order.branchId } },
            data: { qtyOnHand: inv.qtyOnHand + it.qty },
          });
          // Movement: REFUND to branch
          await tx.stockMovement.create({
            data: {
              productId: it.productId,
              branchId: order.branchId,
              sectionFrom: null,
              sectionTo: null,
              delta: Math.abs(it.qty || 0),
              reason: 'REFUND',
              referenceId: order.id,
            },
          });
        }
      }

      // Create SalesReturn audit row for full amount
      const amount = Math.abs(Number(order.total as any || 0));
      if (amount > 0) {
        await tx.salesReturn.create({ data: { orderId, amount: String(amount) as any, idempotencyKey: idempotencyKey } });
      }
      // Mark order as REFUNDED
      const updated = await tx.order.update({ where: { id: orderId }, data: { status: 'REFUNDED' as any } });

      // Log full refund event
      try {
        await tx.saleEvent.create({
          data: {
            orderId,
            userId: actorUserId || null,
            action: 'REFUNDED_ORDER',
            prevStatus: String(order.status || ''),
            newStatus: String(updated.status || ''),
            meta: {
              type: 'FULL',
              amount,
            },
          } as any,
        });
      } catch (err) {
        console.error('[refund] Failed to log REFUNDED_ORDER event:', err);
      }

      // Emit real-time event for refund (fire-and-forget)
      try {
        this.events.emitSaleEvent('sale:refunded', order.branchId, orderId, {
          amount,
          type: 'FULL',
        }, actorUserId);
      } catch (err) {
        console.error('[refund] Failed to emit refund event:', err);
      }

      // Optional override PIN audit for full refunds
      if (overrideOwnerId) {
        try {
          const supervisor = await this.prisma.user.findUnique({ where: { id: overrideOwnerId }, select: { username: true, firstName: true, surname: true } });
          const overrideOwnerName = supervisor
            ? (((supervisor.firstName || '') + (supervisor.surname ? ` ${supervisor.surname}` : '')).trim() || supervisor.username)
            : overrideOwnerId;
          await this.audit.log({
            action: 'Override Used',
            userId: overrideOwnerId,
            branchId: order.branchId,
            meta: {
              action: 'REFUNDED_ORDER',
              subjectType: 'Override',
              orderId,
              overrideOwnerId,
              overrideOwnerName,
              actorUserId: actorUserId || null,
            },
          });
        } catch (err) {
          console.error('[refund] Failed to log override audit:', err);
        }
      }

      return updated;
    });
  }

  async addPayment(orderId: string, dto: PaymentDto, actorUserId?: string) {
    if (!dto?.method || !dto?.amount) throw new BadRequestException('Payment method and amount are required');
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) throw new BadRequestException('Order not found');

      // Idempotency check: if client provided an idempotencyKey, check if payment already exists
      const idempotencyKey = (dto as any).idempotencyKey || null;
      if (idempotencyKey) {
        const existing = await tx.payment.findUnique({ where: { idempotencyKey } });
        if (existing) {
          // Payment already processed - return current order state (idempotent response)
          console.log('[addPayment] Idempotent hit - returning existing payment:', idempotencyKey);
          const result = await tx.order.findUnique({ where: { id: orderId }, include: { payments: true, items: true } as any });
          return result;
        }
      }

      await tx.payment.create({
        data: {
          orderId,
          method: dto.method,
          amount: dto.amount as any,
          reference: dto.reference || null,
          idempotencyKey: idempotencyKey,
        },
      });
      // After recording payment, backfill from latest draft and auto-mark PAID when fully paid
      const payments = await tx.payment.findMany({ where: { orderId }, select: { amount: true } });
      const paid = payments.reduce((a, p) => a + Number(p.amount || 0), 0);
      const draft = await tx.draft.findFirst({ where: { orderId }, orderBy: { updatedAt: 'desc' } });
      const data: any = {};
      try {
        // TEMP-DEBUG: trace tableId before applying payment logic
        console.log('[OrdersService.addPayment][START]', {
          orderId,
          orderStatus: order.status,
          orderTableId: (order as any).tableId || null,
          hasDraft: !!draft,
          draftTableId: draft ? (draft as any).tableId || null : null,
          paidAmount: paid,
        });
      } catch {}
      if (draft) {
        const o: any = order as any;
        const ordSub = Number(o.subtotal ?? 0);
        const ordTax = Number(o.tax ?? 0);
        const ordDisc = Number(o.discount ?? 0);
        const ordTotal = Number(o.total ?? 0);
        const dSub = draft.subtotal !== null && draft.subtotal !== undefined ? Number(draft.subtotal as any) : null;
        const dTax = draft.tax !== null && draft.tax !== undefined ? Number(draft.tax as any) : null;
        const dDisc = draft.discount !== null && draft.discount !== undefined ? Number(draft.discount as any) : null;
        const dTotal = draft.total !== null && draft.total !== undefined ? Number(draft.total as any) : null;
        // Prefer order values over draft values (order may have been updated with current POS state before payment)
        const sub = ordSub > 0 ? ordSub : (dSub != null ? dSub : 0);
        const tax = ordTax > 0 ? ordTax : (dTax != null ? dTax : 0);
        const disc = ordDisc > 0 ? ordDisc : (dDisc != null ? dDisc : 0);
        const finalTotal = ordTotal > 0 ? ordTotal : (dTotal != null ? dTotal : (sub + tax - disc));
        data.subtotal = String(sub) as any;
        data.tax = String(tax) as any;
        data.discount = String(disc) as any;
        data.total = String(finalTotal) as any;
        // taxRate should already be on the order from draft creation/update
        if (!(order as any).sectionId && draft.sectionId) data.sectionId = draft.sectionId as any;
        if ((!(order as any).serviceType || !String((order as any).serviceType).trim()) && draft.serviceType) data.serviceType = draft.serviceType;
        let waiterName: string | null = (order as any).waiterName as any;
        let waiterId: string | null = (order as any).waiterId as any;
        if (!waiterId && (draft as any).waiterId) waiterId = (draft as any).waiterId;
        if ((!waiterName || !waiterName.trim()) && waiterId) {
          try {
            const w = await tx.user.findUnique({ where: { id: waiterId }, select: { username: true, firstName: true, surname: true } });
            if (w) waiterName = (w.firstName || w.surname) ? `${w.firstName || ''} ${w.surname || ''}`.trim() : (w.username || null);
          } catch {}
        }
        if (waiterId) data.waiterId = waiterId;
        if (waiterName) data.waiterName = waiterName as any;
        // Always preserve/restore tableId for PAID orders when we end up marking it here
        const tableFromOrder = (order as any).tableId || null;
        const tableFromDraft = (draft as any).tableId || null;
        if (tableFromOrder || tableFromDraft) data.tableId = tableFromOrder || tableFromDraft;
        // Auto set PAID when fully paid
        if (paid >= finalTotal && finalTotal > 0) data.status = 'PAID' as any;
      } else {
        // No draft: still auto set PAID if payments cover recorded order total
        const ordTotal = Number((order as any).total ?? 0);
        if (ordTotal > 0 && paid >= ordTotal) {
          data.status = 'PAID' as any;
          // Preserve tableId from the existing order when auto-marking PAID
          if ((order as any).tableId) data.tableId = (order as any).tableId;
        }
      }

      // FINAL SAFEGUARD: if this update is marking the order as PAID, always keep the
      // current order.tableId on the record so that table info is never lost.
      if (data.status && String(data.status).toUpperCase() === 'PAID') {
        const ordTable = (order as any).tableId || null;
        if (ordTable) data.tableId = ordTable;
      }

      const updated = await tx.order.update({ where: { id: orderId }, data });

      // NOTE: Stock is now decremented on add-to-cart in the frontend (CART_ADD reason)
      // No stock decrement needed here - stock was already decremented when items were added to cart

      // Log payment event ONLY when the order transitions to PAID (fully paid)
      // This avoids duplicate audit entries for split/multiple payment methods
      // since the payment breakdown is already stored in the payments table
      const prevStatus = String(order.status || '').toUpperCase();
      const newStatus = String(updated.status || '').toUpperCase();
      if (prevStatus !== 'PAID' && newStatus === 'PAID') {
        try {
          await tx.saleEvent.create({
            data: {
              orderId,
              userId: actorUserId || null,
              action: 'ADDED_PAYMENT',
              prevStatus: prevStatus,
              newStatus: newStatus,
              meta: {
                method: dto.method,
                amount: Number(dto.amount as any) || 0,
                reference: dto.reference || null,
                paid,
                total: data.total ? Number(data.total as any) : Number((order as any).total ?? 0),
              },
            } as any,
          });
        } catch (err) {
          console.error('[addPayment] Failed to log ADDED_PAYMENT event:', err);
        }
      }

      const result = await tx.order.findUnique({ where: { id: orderId }, include: { payments: true, items: true } as any });

      // Emit real-time event for payment added (fire-and-forget)
      try {
        this.events.emitSaleEvent('sale:payment_added', order.branchId, orderId, {
          method: dto.method,
          amount: Number(dto.amount || 0),
          newStatus: newStatus,
          paid,
        }, actorUserId);
      } catch (err) {
        console.error('[addPayment] Failed to emit payment event:', err);
      }

      return result;
    });
  }

  async refundItems(orderId: string, items: { productId: string; qty: number }[], actorUserId?: string, overrideOwnerId?: string) {
    if (!Array.isArray(items) || items.length === 0) throw new BadRequestException('No items to refund');
    return this.prisma.$transaction(async (tx) => {
      const orig = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
      if (!orig) throw new BadRequestException('Order not found');

      // Build a map of original sold qty and price
      const byProduct: Record<string, { soldQty: number; price: number }> = {};
      for (const it of orig.items) {
        byProduct[it.productId] = { soldQty: Number(it.qty || 0), price: Number(it.price as any || 0) };
      }

      // Sanitize requested returns
      const clean: { productId: string; qty: number; price: number }[] = [];
      for (const r of items) {
        const pid = String(r.productId || '');
        const qty = Math.max(0, Number(r.qty || 0));
        const meta = byProduct[pid];
        if (!pid || !qty || !meta) continue;
        const allowed = Math.min(qty, Math.abs(meta.soldQty));
        if (allowed <= 0) continue;
        clean.push({ productId: pid, qty: allowed, price: meta.price });
      }
      if (clean.length === 0) throw new BadRequestException('No valid items to refund');

      // allocate next order number for this branch for the return order
      const updated = await tx.branch.update({
        where: { id: orig.branchId },
        data: { nextOrderSeq: { increment: 1 } },
        select: { nextOrderSeq: true },
      });
      const orderNumber = updated.nextOrderSeq;

      // Create a RETURN order with negative quantities and negative total
      const returnOrder = await tx.order.create({
        data: {
          branchId: orig.branchId,
          sectionId: orig.sectionId,
          userId: orig.userId,
          status: 'REFUNDED' as any,
          total: '0' as any,
          orderNumber,
          tableId: null,
        },
      });

      let negTotal = 0;
      for (const it of clean) {
        // create negative item
        await tx.orderItem.create({
          data: {
            orderId: returnOrder.id,
            productId: it.productId,
            qty: -Math.abs(it.qty),
            price: String(it.price) as any,
          },
        });

        // Restock inventory similar to refund()
        if (orig.sectionId) {
          const inv = await tx.sectionInventory.upsert({
            where: { productId_sectionId: { productId: it.productId, sectionId: orig.sectionId } },
            update: {},
            create: { productId: it.productId, sectionId: orig.sectionId, qtyOnHand: 0 },
          });
          await tx.sectionInventory.update({
            where: { productId_sectionId: { productId: it.productId, sectionId: orig.sectionId } },
            data: { qtyOnHand: inv.qtyOnHand + it.qty },
          });
          await tx.stockMovement.create({
            data: {
              productId: it.productId,
              branchId: orig.branchId,
              sectionFrom: null,
              sectionTo: orig.sectionId,
              delta: Math.abs(it.qty),
              reason: 'REFUND',
              referenceId: returnOrder.id,
            },
          });
        } else {
          const inv = await tx.inventory.upsert({
            where: { productId_branchId: { productId: it.productId, branchId: orig.branchId } },
            update: {},
            create: { productId: it.productId, branchId: orig.branchId, qtyOnHand: 0 },
          });
          await tx.inventory.update({
            where: { productId_branchId: { productId: it.productId, branchId: orig.branchId } },
            data: { qtyOnHand: inv.qtyOnHand + it.qty },
          });
          await tx.stockMovement.create({
            data: {
              productId: it.productId,
              branchId: orig.branchId,
              sectionFrom: null,
              sectionTo: null,
              delta: Math.abs(it.qty),
              reason: 'REFUND',
              referenceId: returnOrder.id,
            },
          });
        }

        negTotal += -Math.abs(it.qty) * Number(it.price);
      }

      await tx.order.update({ where: { id: returnOrder.id }, data: { total: String(negTotal) as any } });

      // SalesReturn audit row linked to original order
      const refundAmt = Math.abs(Number(negTotal || 0));
      if (refundAmt > 0) {
        await tx.salesReturn.create({ data: { orderId, amount: String(refundAmt) as any } });
      }

      // Log partial refund event
      try {
        await tx.saleEvent.create({
          data: {
            orderId,
            userId: actorUserId || null,
            action: 'REFUND_ITEMS',
            prevStatus: String(orig.status || ''),
            newStatus: String(orig.status || ''),
            meta: {
              returnOrderId: returnOrder.id,
              items: clean,
              amount: refundAmt,
            },
          } as any,
        });
      } catch (err) {
        console.error('[refundItems] Failed to log REFUND_ITEMS event:', err);
      }

      // Optional override PIN audit for partial refunds
      if (overrideOwnerId) {
        try {
          const supervisor = await this.prisma.user.findUnique({ where: { id: overrideOwnerId }, select: { username: true, firstName: true, surname: true } });
          const overrideOwnerName = supervisor
            ? (((supervisor.firstName || '') + (supervisor.surname ? ` ${supervisor.surname}` : '')).trim() || supervisor.username)
            : overrideOwnerId;
          await this.audit.log({
            action: 'Override Used',
            userId: overrideOwnerId,
            branchId: orig.branchId,
            meta: {
              action: 'REFUND_ITEMS',
              subjectType: 'Override',
              orderId,
              returnOrderId: returnOrder.id,
              overrideOwnerId,
              overrideOwnerName,
              actorUserId: actorUserId || null,
            },
          });
        } catch {}
      }

      return tx.order.findUnique({ where: { id: returnOrder.id }, include: { items: true } as any });
    });
  }
}
