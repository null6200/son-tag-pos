import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
  constructor(private prisma: PrismaService) {}

  private isLockingStatus(status: OrderStatus | undefined): boolean {
    return status === 'DRAFT' || status === 'ACTIVE' || status === 'PENDING_PAYMENT';
  }

  // Overloads for backward compatibility
  async list(branchId?: string, from?: string, to?: string): Promise<any>;
  async list(branchId: string | undefined, from: string | undefined, to: string | undefined, userId?: string, perms?: string[]): Promise<any>;
  async list(branchId?: string, from?: string, to?: string, userId?: string, perms: string[] = []) {
    const where: any = {
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
    const rows = await this.prisma.order.findMany({
      where,
      include: {
        items: true,
        payments: true,
        branch: { select: { id: true, name: true } },
        section: { select: { id: true, name: true } },
        drafts: { select: { id: true, subtotal: true, tax: true, discount: true, total: true, serviceType: true, waiterId: true } },
      } as any,
      orderBy: { createdAt: 'desc' },
    });
    // Add display invoice fields and merge draft data for credit orders
    return rows.map((o: any) => {
      const invoice = o.invoice_no || o.invoiceNo || o.receiptNo || (typeof o.orderNumber !== 'undefined' ? String(o.orderNumber) : undefined);
      const status = String(o.status || '').toUpperCase();
      const draft = Array.isArray(o.drafts) && o.drafts.length > 0 ? o.drafts[0] : null;
      const needsDraftFallback =
        (o.subtotal == null || Number(o.subtotal) === 0) ||
        (o.tax == null || (Number(o.tax) === 0 && draft?.tax && Number(draft.tax) > 0)) ||
        (o.discount == null || (Number(o.discount) === 0 && draft?.discount && Number(draft.discount) > 0)) ||
        (o.serviceType == null && !!draft?.serviceType);
      const merged: any = { ...o };
      if (((status === 'SUSPENDED' || status === 'PENDING_PAYMENT') || needsDraftFallback) && draft) {
        if (draft.subtotal != null) merged.subtotal = draft.subtotal as any;
        if (draft.tax != null) merged.tax = draft.tax as any;
        if (draft.discount != null) merged.discount = draft.discount as any;
        if (draft.total != null) merged.total = draft.total as any;
        if (!merged.serviceType && draft.serviceType) merged.serviceType = draft.serviceType;
        if ((!merged.waiterName || !String(merged.waiterName).trim()) && draft.waiterId) merged.waiterId = draft.waiterId;
      }
      // Normalize status: if sum(payments) >= total, mark PAID for list display
      try {
        const total = Number(merged.total ?? 0);
        const payments = Array.isArray(merged.payments) ? merged.payments : [];
        const paid = payments.reduce((a: number, p: any) => a + Number(p.amount || 0), 0);
        if (total > 0 && paid >= total) merged.status = 'PAID' as any;
      } catch {}
      return {
        ...merged,
        displayInvoice: invoice ? String(invoice) : undefined,
        branchName: merged?.branch?.name || undefined,
        sectionName: merged?.section?.name || undefined,
        waiter: merged?.waiterName || undefined,
        serviceType: merged?.serviceType || undefined,
      };
    });
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
        drafts: { select: { id: true, subtotal: true, discount: true, tax: true, total: true, serviceType: true, waiterId: true } },
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
    const needsDraftFallback =
      (enriched.subtotal == null || Number(enriched.subtotal) === 0) ||
      (enriched.tax == null || (Number(enriched.tax) === 0 && draft?.tax && Number(draft.tax) > 0)) ||
      (enriched.discount == null || (Number(enriched.discount) === 0 && draft?.discount && Number(draft.discount) > 0)) ||
      (enriched.serviceType == null && !!draft?.serviceType);
    if (((status === 'SUSPENDED' || status === 'PENDING_PAYMENT') || needsDraftFallback) && draft) {
      // Use draft financials when present
      if (draft.subtotal != null) enriched.subtotal = draft.subtotal as any;
      if (draft.tax != null) enriched.tax = draft.tax as any;
      if (draft.discount != null) enriched.discount = draft.discount as any;
      if (draft.total != null) enriched.total = draft.total as any;
      if (!enriched.serviceType && draft.serviceType) enriched.serviceType = draft.serviceType;
      // If waiter missing, we can keep waiterId (frontend displays name via waiter field)
      if ((!waiterName || !waiterName.trim()) && draft.waiterId) {
        try {
          const w = await this.prisma.user.findUnique({ where: { id: draft.waiterId }, select: { username: true, firstName: true, surname: true } });
          if (w) waiterName = (w.firstName || w.surname) ? `${w.firstName || ''} ${w.surname || ''}`.trim() : (w.username || null);
        } catch {}
      }
    }

    return { ...enriched, displayInvoice: invoice, waiter: waiterName } as any;
  }

  async create(dto: CreateOrderDto, userId?: string) {
    if (!dto.items?.length) throw new BadRequestException('No items');

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

      // allocate next order number for this branch
      const updated = await tx.branch.update({
        where: { id: resolvedBranchId },
        data: { nextOrderSeq: { increment: 1 } },
        select: { nextOrderSeq: true },
      });
      const orderNumber = updated.nextOrderSeq;

      // Initial status and strict table locking
      const initialStatus: OrderStatus = dto.status || 'ACTIVE';
      if (dto.tableId && this.isLockingStatus(initialStatus)) {
        const existing = await tx.order.findFirst({
          where: { tableId: dto.tableId, status: { in: ['DRAFT','ACTIVE','PENDING_PAYMENT'] as any } },
          orderBy: { updatedAt: 'desc' },
        });
        if (existing) throw new BadRequestException(`Table is occupied by order ${existing.id}`);
      }

      // create order
      // Pre-resolve waiterName if not provided but waiterId is present
      let waiterName: string | null = null;
      if (dto.waiterId && !dto['waiterName']) {
        try {
          const w = await tx.user.findUnique({ where: { id: dto.waiterId }, select: { username: true, firstName: true, surname: true } });
          if (w) waiterName = w.firstName || w.surname ? `${w.firstName || ''} ${w.surname || ''}`.trim() : (w.username || null);
        } catch {}
      }
      const order = await tx.order.create({
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
        },
      });

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
        // Compute reserved quantity (via ADJUST) to avoid double-deduct on finalize
        let reservedRecent = 0;
        if (dto.sectionId) {
          // If reservationKey provided, match all ADJUST movements tagged with it (no time limit)
          // Else, fallback to time-window to avoid scanning entire history
          const where: any = {
            productId: it.productId,
            branchId: resolvedBranchId,
            sectionFrom: dto.sectionId,
            reason: 'ADJUST',
          };
          if (!dto.reservationKey) {
            where.createdAt = { gte: new Date(Date.now() - 4 * 60 * 60 * 1000) }; // 4 hours window
          }
          const recent = await tx.stockMovement.findMany({ where, select: { delta: true, referenceId: true } });
          for (const m of recent) {
            const d = Number(m.delta || 0);
            if (d >= 0) continue; // only count reductions
            const ref = String(m.referenceId || '');
            if (!ref.startsWith('ADJ|')) continue;
            // If a reservationKey is present, only count adjustments tagged with it
            if (dto.reservationKey) {
              if (!ref.includes(`|RESV|${dto.reservationKey}`)) continue;
            } else if (userId) {
              const parts = ref.split('|');
              const refUserId = parts.length >= 4 ? (parts[3] || '') : '';
              if (refUserId && refUserId !== userId) continue;
            }
            reservedRecent += Math.abs(d);
          }
        }

        const netQty = Math.max(0, Number(it.qty || 0) - Number(isNaN(reservedRecent) ? 0 : reservedRecent));

        // decrement stock: per item, prefer section if permitted; if not permitted but section has stock, use section; else branch-level
        if (dto.sectionId && (canUseSectionByProduct[it.productId])) {
          const secInv = await tx.sectionInventory.upsert({
            where: { productId_sectionId: { productId: it.productId, sectionId: dto.sectionId } },
            update: {},
            create: { productId: it.productId, sectionId: dto.sectionId, qtyOnHand: 0 },
          });
          const newQty = secInv.qtyOnHand - netQty;
          if (newQty < 0 && !dto.allowOverselling)
            throw new BadRequestException(`Insufficient stock: product ${it.productId} in section ${dto.sectionId}. Available=${secInv.qtyOnHand}, Requested=${netQty}`);
          if (netQty > 0) {
            await tx.sectionInventory.update({
              where: { productId_sectionId: { productId: it.productId, sectionId: dto.sectionId } },
              data: { qtyOnHand: newQty },
            });
            // Movement: SALE from section (net quantity only)
            await tx.stockMovement.create({
              data: {
                productId: it.productId,
                branchId: resolvedBranchId,
                sectionFrom: dto.sectionId,
                sectionTo: null,
                delta: -Math.abs(netQty || 0),
                reason: 'SALE',
                referenceId: order.id,
              },
            });
          }
        } else if (dto.sectionId) {
          // Not permitted in section: if the section actually holds stock, use it
          const secInv = await tx.sectionInventory.upsert({
            where: { productId_sectionId: { productId: it.productId, sectionId: dto.sectionId } },
            update: {},
            create: { productId: it.productId, sectionId: dto.sectionId, qtyOnHand: 0 },
          });
          if (secInv.qtyOnHand >= netQty) {
            const newQty = secInv.qtyOnHand - netQty;
            await tx.sectionInventory.update({
              where: { productId_sectionId: { productId: it.productId, sectionId: dto.sectionId } },
              data: { qtyOnHand: newQty },
            });
            if (netQty > 0) {
              await tx.stockMovement.create({
                data: {
                  productId: it.productId,
                  branchId: resolvedBranchId,
                  sectionFrom: dto.sectionId,
                  sectionTo: null,
                  delta: -Math.abs(netQty || 0),
                  reason: 'SALE',
                  referenceId: order.id,
                },
              });
            }
          } else {
            // Fall back to branch-level
            const inv = await tx.inventory.upsert({
              where: { productId_branchId: { productId: it.productId, branchId: resolvedBranchId } },
              update: {},
              create: { productId: it.productId, branchId: resolvedBranchId, qtyOnHand: 0 },
            });
            const newQty = inv.qtyOnHand - netQty;
            if (newQty < 0 && !dto.allowOverselling)
              throw new BadRequestException(`Insufficient stock: product ${it.productId} in branch ${resolvedBranchId}. Available=${inv.qtyOnHand}, Requested=${netQty}`);
            if (netQty > 0) {
              await tx.inventory.update({
                where: { productId_branchId: { productId: it.productId, branchId: resolvedBranchId } },
                data: { qtyOnHand: newQty },
              });
              await tx.stockMovement.create({
                data: {
                  productId: it.productId,
                  branchId: resolvedBranchId,
                  sectionFrom: null,
                  sectionTo: null,
                  delta: -Math.abs(netQty || 0),
                  reason: 'SALE',
                  referenceId: order.id,
                },
              });
            }
          }
        } else {
          const inv = await tx.inventory.upsert({
            where: { productId_branchId: { productId: it.productId, branchId: resolvedBranchId } },
            update: {},
            create: { productId: it.productId, branchId: resolvedBranchId, qtyOnHand: 0 },
          });
          const newQty = inv.qtyOnHand - netQty;
          if (newQty < 0 && !dto.allowOverselling)
            throw new BadRequestException(`Insufficient stock: product ${it.productId} in branch ${resolvedBranchId}. Available=${inv.qtyOnHand}, Requested=${netQty}`);
          if (netQty > 0) {
            await tx.inventory.update({
              where: { productId_branchId: { productId: it.productId, branchId: resolvedBranchId } },
              data: { qtyOnHand: newQty },
            });
            // Movement: SALE from branch-level
            await tx.stockMovement.create({
              data: {
                productId: it.productId,
                branchId: resolvedBranchId,
                sectionFrom: null,
                sectionTo: null,
                delta: -Math.abs(netQty || 0),
                reason: 'SALE',
                referenceId: order.id,
              },
            });
          }
        }

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

      await tx.order.update({
        where: { id: order.id },
        data: {
          total: String(finalTotal) as any,
          subtotal: String(isNaN(sub) ? 0 : sub) as any,
          discount: String(isNaN(disc) ? 0 : disc) as any,
          tax: String(isNaN(txAmt) ? 0 : txAmt) as any,
          taxRate: txRate !== null && !isNaN(txRate) ? (String(txRate) as any) : undefined,
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
      }

      return tx.order.findUnique({
        where: { id: order.id },
        include: { items: true, payments: true } as any,
      });
    });
  }

  // Update order status; release table on non-locking (includes SUSPENDED)
  async updateStatus(orderId: string, status: OrderStatus) {
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
      if (!isLocking) data.tableId = null;
      // If moving to PAID, merge financials/meta from latest draft when order is missing values and recompute total
      if (status === 'PAID') {
        const draft = await tx.draft.findFirst({ where: { orderId }, orderBy: { updatedAt: 'desc' } });
        if (draft) {
          const o: any = order as any;
          const ordSub = Number(o.subtotal || 0);
          const ordTax = Number(o.tax || 0);
          const ordDisc = Number(o.discount || 0);
          const ordTotal = Number(o.total || 0);
          const dSub = draft.subtotal != null ? Number(draft.subtotal as any) : null;
          const dTax = draft.tax != null ? Number(draft.tax as any) : null;
          const dDisc = draft.discount != null ? Number(draft.discount as any) : null;
          const dTotal = draft.total != null ? Number(draft.total as any) : null;
          const sub = ordSub > 0 ? ordSub : (dSub ?? ordSub);
          const tax = ordTax > 0 ? ordTax : (dTax ?? ordTax);
          const disc = ordDisc > 0 ? ordDisc : (dDisc ?? ordDisc);
          let finalTotal = ordTotal;
          // Recompute total from parts if any were filled from draft
          if ((sub !== ordSub) || (tax !== ordTax) || (disc !== ordDisc) || (ordTotal === 0 && dTotal != null)) {
            finalTotal = sub + tax - disc;
          }
          data.subtotal = String(sub) as any;
          data.tax = String(tax) as any;
          data.discount = String(disc) as any;
          data.total = String(finalTotal) as any;
          if (!o.serviceType && draft.serviceType) data.serviceType = draft.serviceType;
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
        }
      }
      return tx.order.update({ where: { id: orderId }, data });
    });
  }

  async refund(orderId: string) {
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
        await tx.salesReturn.create({ data: { orderId, amount: String(amount) as any } });
      }
      // Mark order as REFUNDED
      return tx.order.update({ where: { id: orderId }, data: { status: 'REFUNDED' as any } });
    });
  }

  async addPayment(orderId: string, dto: PaymentDto) {
    if (!dto?.method || !dto?.amount) throw new BadRequestException('Payment method and amount are required');
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) throw new BadRequestException('Order not found');
      await tx.payment.create({
        data: {
          orderId,
          method: dto.method,
          amount: dto.amount as any,
          reference: dto.reference || null,
        },
      });
      return tx.order.findUnique({ where: { id: orderId }, include: { payments: true, items: true } as any });
    });
  }

  async refundItems(orderId: string, items: { productId: string; qty: number }[]) {
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

      return tx.order.findUnique({ where: { id: returnOrder.id }, include: { items: true } as any });
    });
  }
}
