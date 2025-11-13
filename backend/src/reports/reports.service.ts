import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface OverviewParams {
  branchId?: string;
  from?: string;
  to?: string;
}

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async overview(params: OverviewParams) {
    // Build date filters
    const dateFilter = {
      gte: params.from ? new Date(params.from) : undefined,
      lte: params.to ? new Date(params.to) : undefined,
    } as { gte?: Date; lte?: Date };

    // Payments within window (cashflow-based sales series)
    const payments = await this.prisma.payment.findMany({
      where: {
        createdAt: params.from || params.to ? dateFilter : undefined,
        order: {
          ...(params.branchId ? { branchId: params.branchId } : {}),
          status: { not: 'CANCELLED' as any },
        },
      },
      select: {
        amount: true,
        createdAt: true,
        order: { select: { id: true, total: true, branch: { select: { name: true } }, section: { select: { name: true } } } },
      },
    });

    const cashflowTotal = payments.reduce(
      (sum: number, p) => sum + parseFloat(String(p.amount ?? 0)),
      0,
    );

    // Group payments by day for series (total and per-branch)
    const totalSeriesMap = new Map<string, number>();
    const perBranchSeriesMap = new Map<string, Map<string, number>>(); // date -> (branchName -> value)
    const perSectionSeriesMap = new Map<string, Map<string, number>>(); // date -> (sectionName -> value)
    for (const p of payments) {
      const d = new Date(p.createdAt);
      const key = `${d.getFullYear()}-${(d.getMonth() + 1)
        .toString()
        .padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
      const amount = parseFloat(String(p.amount ?? 0));
      totalSeriesMap.set(key, (totalSeriesMap.get(key) || 0) + amount);
      const branchName = p.order?.branch?.name || 'Unknown';
      if (!perBranchSeriesMap.has(key)) perBranchSeriesMap.set(key, new Map());
      const m = perBranchSeriesMap.get(key)!;
      m.set(branchName, (m.get(branchName) || 0) + amount);
      const sectionName = p.order?.section?.name || 'Unknown';
      if (!perSectionSeriesMap.has(key)) perSectionSeriesMap.set(key, new Map());
      const sm = perSectionSeriesMap.get(key)!;
      sm.set(sectionName, (sm.get(sectionName) || 0) + amount);
    }
    const daily = Array.from(totalSeriesMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({ date, value }));

    const dailyByBranch = Array.from(perBranchSeriesMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, branches]) => {
        const row: Record<string, any> = { date };
        for (const [name, v] of branches.entries()) row[name] = v;
        return row;
      });

    const dailyBySection = Array.from(perSectionSeriesMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, sections]) => {
        const row: Record<string, any> = { date };
        for (const [name, v] of sections.entries()) row[name] = v;
        return row;
      });

    // Outstanding per order (Invoice Due): include SUSPENDED and PENDING_PAYMENT
    // Compute outstanding = total - sum(all payments for that order)
    const creditOrders = await this.prisma.order.findMany({
      where: {
        ...(params.branchId ? { branchId: params.branchId } : {}),
        // Consider all non-terminal orders; we'll include only those with unpaid balance
        status: { notIn: ['PAID', 'CANCELLED', 'VOIDED', 'REFUNDED'] as any },
      },
      select: {
        id: true,
        status: true,
        total: true,
        subtotal: true,
        tax: true,
        discount: true,
        drafts: {
          select: { total: true, subtotal: true, tax: true, discount: true, createdAt: true },
          orderBy: { createdAt: 'desc' as const },
          take: 1,
        },
      },
    } as any);
    const creditOrderIds = creditOrders.map(o => o.id);
    const creditPayments = creditOrderIds.length ? await this.prisma.payment.findMany({
      where: { orderId: { in: creditOrderIds } },
      select: { orderId: true, amount: true },
    }) : [];
    const paidByOrder = new Map<string, number>();
    for (const p of creditPayments) paidByOrder.set(p.orderId, (paidByOrder.get(p.orderId) || 0) + parseFloat(String(p.amount ?? 0)));
    let invoiceDue = 0;
    const countedOrders = new Set<string>();

    // 1) Primary: sum SUSPENDED drafts that are still credit (or no linked order)
    try {
      const extraDrafts = await this.prisma.draft.findMany({
        where: { status: 'SUSPENDED', ...(params.branchId ? { branchId: params.branchId } : {}) },
        select: { total: true, subtotal: true, tax: true, discount: true, orderId: true, order: { select: { id: true, status: true } } },
      } as any);
      if (Array.isArray(extraDrafts) && extraDrafts.length) {
        for (const d of extraDrafts) {
          const linkedId = String((d as any).orderId || (d as any).order?.id || '') || null;
          const linkedStatus = String((d as any).order?.status || '').toUpperCase();
          const isCreditStatus = (
            linkedStatus === 'SUSPENDED' || linkedStatus === 'PENDING_PAYMENT' || linkedStatus === 'ACTIVE' || linkedStatus === 'PENDING' || linkedStatus === 'CREDIT' || linkedStatus === 'DUE'
          );
          if (linkedId && !isCreditStatus) continue;
          const dTotal = parseFloat(String((d as any).total ?? 0));
          const dSub = parseFloat(String((d as any).subtotal ?? 0));
          const dTx = parseFloat(String((d as any).tax ?? 0));
          const dDisc = parseFloat(String((d as any).discount ?? 0));
          const derived = dSub + dTx - dDisc;
          const t = dTotal > 0 ? dTotal : (derived > 0 ? derived : 0);
          if (t > 0) {
            invoiceDue += t;
            if (linkedId) countedOrders.add(linkedId);
          }
        }
      }
    } catch {}

    // 2) Also include non-terminal orders not represented by drafts (e.g., legacy/other flows)
    for (const o of creditOrders) {
      const ordTotal = parseFloat(String((o as any).total ?? 0));
      const sub = parseFloat(String((o as any).subtotal ?? 0));
      const tx = parseFloat(String((o as any).tax ?? 0));
      const disc = parseFloat(String((o as any).discount ?? 0));
      const derived = sub + tx - disc;

      const latestDraft = ((o as any).drafts && (o as any).drafts[0]) ? (o as any).drafts[0] : undefined;
      const dSub = parseFloat(String(latestDraft?.subtotal ?? 0));
      const dTx = parseFloat(String(latestDraft?.tax ?? 0));
      const dDisc = parseFloat(String(latestDraft?.discount ?? 0));
      const derivedFromDraft = dSub + dTx - dDisc;
      const draftTotal = parseFloat(String(latestDraft?.total ?? 0));

      // Prefer totals first (draft.total, order.total). Derived only as fallback since tax may be a rate.
      const preferDraft = latestDraft != null;
      const fromDraft = draftTotal > 0 ? draftTotal : (derivedFromDraft > 0 ? derivedFromDraft : 0);
      const fromOrder = ordTotal > 0 ? ordTotal : (derived > 0 ? derived : 0);
      const tot = preferDraft ? (fromDraft || fromOrder) : (fromOrder || fromDraft);

      // Skip if this order was already counted via its SUSPENDED draft
      if (countedOrders.has((o as any).id)) continue;

      // Include only if unpaid
      const paid = paidByOrder.get((o as any).id) || 0;
      if (paid >= Math.max(0, tot)) {
        continue; // skip fully paid orders
      }

      // Sum full final totals for credit sales (do not subtract payments)
      const add = Math.max(0, tot);
      if (add > 0) {
        invoiceDue += add;
      }
    }

    // Base Net Sales as cash received within the window
    let netSalesCashflow = Math.max(0, cashflowTotal);

    // Additional metrics
    const purchaseWhere = {
      ...(params.branchId ? { branchId: params.branchId } : {}),
      ...(params.from || params.to ? { createdAt: dateFilter } : {}),
    };
    const totalPurchaseAgg = await this.prisma.purchase.aggregate({
      where: purchaseWhere,
      _sum: { total: true },
    });
    const totalPurchase = parseFloat(String(totalPurchaseAgg._sum.total ?? 0));

    const purchasePaymentsAgg = await this.prisma.purchasePayment.aggregate({
      where: {
        purchase: params.branchId ? { branchId: params.branchId } : undefined,
        createdAt: params.from || params.to ? dateFilter : undefined,
      },
      _sum: { amount: true },
    });
    const totalPurchasePaid = parseFloat(String(purchasePaymentsAgg._sum.amount ?? 0));
    const purchaseDue = Math.max(0, totalPurchase - totalPurchasePaid);

    const purchaseReturnAgg = await this.prisma.purchaseReturn.aggregate({
      where: {
        purchase: params.branchId ? { branchId: params.branchId } : undefined,
        createdAt: params.from || params.to ? dateFilter : undefined,
      },
      _sum: { amount: true },
    });
    const totalPurchaseReturn = parseFloat(String(purchaseReturnAgg._sum.amount ?? 0));

    const expenseAgg = await this.prisma.expense.aggregate({
      where: {
        ...(params.branchId ? { branchId: params.branchId } : {}),
        ...(params.from || params.to ? { createdAt: dateFilter } : {}),
      },
      _sum: { amount: true },
    });
    const expense = parseFloat(String(expenseAgg._sum.amount ?? 0));

    // Sales Returns in window: split impact between paid portion and due portion at refund time
    const salesReturns = await this.prisma.salesReturn.findMany({
      where: {
        order: params.branchId ? { branchId: params.branchId } : undefined,
        createdAt: params.from || params.to ? dateFilter : undefined,
      },
      select: { amount: true, createdAt: true, orderId: true, order: { select: { total: true } } },
    });
    let totalSellReturn = 0;
    if (salesReturns.length) {
      const rOrderIds = Array.from(new Set(salesReturns.map(r => r.orderId)));
      const paymentsForReturns = await this.prisma.payment.findMany({
        where: { orderId: { in: rOrderIds } },
        select: { orderId: true, amount: true, createdAt: true },
      });
      const paysByOrder = new Map<string, { createdAt: Date; amount: number }[]>();
      for (const p of paymentsForReturns) {
        const arr = paysByOrder.get(p.orderId) || [];
        arr.push({ createdAt: p.createdAt, amount: parseFloat(String(p.amount ?? 0)) });
        paysByOrder.set(p.orderId, arr);
      }
      let returnImpactPaid = 0;
      let returnImpactDue = 0;
      for (const r of salesReturns) {
        const refund = Math.abs(parseFloat(String(r.amount ?? 0)));
        if (!refund) continue;
        totalSellReturn += refund;
        const orderTotal = Math.max(0, parseFloat(String(r.order?.total ?? 0)));
        if (orderTotal <= 0) { returnImpactDue += refund; continue; }
        const pays = (paysByOrder.get(r.orderId) || []).filter(p => !r.createdAt || p.createdAt <= r.createdAt);
        const paidUpToReturn = pays.reduce((s, x) => s + (x.amount || 0), 0);
        const paidRatio = Math.max(0, Math.min(1, orderTotal > 0 ? paidUpToReturn / orderTotal : 0));
        const paidPart = refund * paidRatio;
        const duePart = refund - paidPart;
        returnImpactPaid += paidPart;
        returnImpactDue += duePart;
      }
      // Apply impacts: returns reduce cashflow net sales only; invoiceDue remains based on outstanding credit
      netSalesCashflow = Math.max(0, netSalesCashflow - returnImpactPaid);
    }

    // Note: no separate fallback pass needed; drafts were primary

    // Total sales = Net (paid) + Invoice Due
    const totalSales = netSalesCashflow + invoiceDue;

    return {
      totals: {
        totalSales,
        netSales: netSalesCashflow,
        invoiceDue,
        totalPurchase,
        purchaseDue,
        totalSellReturn,
        totalPurchaseReturn,
        expense,
      },
      daily,
      dailyByBranch,
      dailyBySection,
    };
  }

  async exportOrdersCsv(params: { branchId?: string; from?: string; to?: string }) {
    const where: any = {
      ...(params.branchId ? { branchId: params.branchId } : {}),
      ...(params.from || params.to
        ? { createdAt: { gte: params.from ? new Date(params.from) : undefined, lte: params.to ? new Date(params.to) : undefined } }
        : {}),
      status: { not: 'CANCELLED' as any },
    };
    const orders = await this.prisma.order.findMany({
      where,
      select: {
        id: true,
        createdAt: true,
        status: true,
        total: true,
        subtotal: true,
        tax: true,
        discount: true,
        serviceType: true,
        waiterName: true,
        section: { select: { name: true } },
        payments: { select: { amount: true } },
      },
      orderBy: { createdAt: 'desc' as const },
    } as any);

    const rows: string[] = [];
    const header = [
      'invoice',
      'date',
      'status',
      'subtotal',
      'tax',
      'discount',
      'total',
      'payments',
      'section',
      'serviceType',
      'waiter',
    ];
    rows.push(header.join(','));
    for (const o of orders) {
      const paid = (Array.isArray((o as any).payments) ? (o as any).payments : []).reduce((s: number, p: any) => s + parseFloat(String(p.amount ?? 0)), 0);
      const date = new Date((o as any).createdAt).toISOString();
      const csvRow = [
        (o as any).id,
        date,
        (o as any).status,
        String(parseFloat(String((o as any).subtotal ?? 0))),
        String(parseFloat(String((o as any).tax ?? 0))),
        String(parseFloat(String((o as any).discount ?? 0))),
        String(parseFloat(String((o as any).total ?? 0))),
        String(paid),
        ((o as any).section?.name || '').replace(/[\,\n]/g, ' '),
        String((o as any).serviceType || ''),
        String((o as any).waiterName || ''),
      ];
      rows.push(csvRow.map(v => typeof v === 'string' && (v.includes(',') || v.includes('\n')) ? '"' + v.replace(/"/g, '""') + '"' : String(v)).join(','));
    }
    const csv = rows.join('\n');
    const filename = `orders_${params.branchId || 'all'}_${Date.now()}.csv`;
    return { filename, csv };
  }

  async sales(params: { branchId?: string; from?: string; to?: string; limit?: number; offset?: number }) {
    const dateFilter = {
      gte: params.from ? new Date(params.from) : undefined,
      lte: params.to ? new Date(params.to) : undefined,
    } as { gte?: Date; lte?: Date };

    const whereOrder: any = {
      ...(params.branchId ? { branchId: params.branchId } : {}),
      ...(params.from || params.to ? { createdAt: dateFilter } : {}),
    };

    // Summary via payments
    const payments = await this.prisma.payment.findMany({
      where: {
        createdAt: params.from || params.to ? dateFilter : undefined,
        order: params.branchId ? { branchId: params.branchId } : undefined,
      },
      select: { amount: true, method: true },
    });
    const totalSales = payments.reduce((acc, p) => acc + parseFloat(String(p.amount ?? 0)), 0);
    const byMethod: Record<string, number> = {};
    for (const p of payments) {
      const key = String(p.method || 'unknown');
      byMethod[key] = (byMethod[key] || 0) + parseFloat(String(p.amount ?? 0));
    }

    const total = await this.prisma.order.count({ where: whereOrder });
    const rows = await this.prisma.order.findMany({
      where: whereOrder,
      orderBy: { createdAt: 'desc' },
      skip: params.offset || 0,
      take: params.limit || 10,
      select: {
        id: true,
        total: true,
        createdAt: true,
        user: { select: { username: true, firstName: true, surname: true } },
      },
    });
    const items = rows.map(r => ({
      id: r.id,
      cashier: r.user?.firstName || r.user?.username || '',
      total: parseFloat(String(r.total ?? 0)),
      createdAt: r.createdAt,
    }));

    return { items, total, summary: { totalSales, byMethod } };
  }

  async listInventory(params: { branchId?: string; from?: string; to?: string; limit: number; offset: number }) {
    const dateFilter = {
      gte: params.from ? new Date(params.from) : undefined,
      lte: params.to ? new Date(params.to) : undefined,
    } as { gte?: Date; lte?: Date };

    const where: any = {
      ...(params.branchId ? { branchId: params.branchId } : {}),
      ...(params.from || params.to ? { createdAt: dateFilter } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: params.offset,
        take: params.limit,
        include: { product: { select: { name: true } } },
      }),
      this.prisma.stockMovement.count({ where }),
    ]);

    const mapped = items.map((m) => ({
      id: m.id,
      productName: m.product?.name ?? m.productId,
      delta: m.delta,
      reason: m.reason,
      createdAt: m.createdAt,
    }));

    return { items: mapped, total };
  }

  async listStaff(params: { branchId?: string; from?: string; to?: string; limit: number; offset: number }) {
    const dateFilter = {
      gte: params.from ? new Date(params.from) : undefined,
      lte: params.to ? new Date(params.to) : undefined,
    } as { gte?: Date; lte?: Date };

    // Base users in scope
    const whereUser: any = { ...(params.branchId ? { branchId: params.branchId } : {}) };
    const total = await this.prisma.user.count({ where: whereUser });
    const users = await this.prisma.user.findMany({
      where: whereUser,
      skip: params.offset,
      take: params.limit,
      orderBy: { username: 'asc' },
      select: { id: true, username: true, firstName: true, surname: true, role: true },
    });
    const ids = users.map(u => u.id);

    // Shifts per user in window
    const shifts = await this.prisma.shiftAssignment.groupBy({
      by: ['userId'],
      _count: { _all: true },
      where: {
        userId: { in: ids },
        ...(params.from || params.to ? { startAt: dateFilter } : {}),
      },
    });
    const shiftMap = new Map<string, number>();
    for (const s of shifts) shiftMap.set(s.userId as unknown as string, Number(s._count._all || 0));

    // Payments per user (via order.userId)
    const payments = await this.prisma.payment.findMany({
      where: {
        createdAt: params.from || params.to ? dateFilter : undefined,
        order: { userId: { in: ids } },
      },
      select: { amount: true, createdAt: true, order: { select: { userId: true } } },
    });
    const salesMap = new Map<string, { total: number; last: Date | null }>();
    for (const p of payments) {
      const uid = p.order?.userId as string;
      const prev = salesMap.get(uid) || { total: 0, last: null };
      const amt = parseFloat(String(p.amount ?? 0));
      const last = !prev.last || (p.createdAt && p.createdAt > prev.last) ? p.createdAt : prev.last;
      salesMap.set(uid, { total: prev.total + amt, last });
    }

    // Fallback lastActive from attendances
    const atts = await this.prisma.attendance.groupBy({
      by: ['userId'],
      _max: { clockIn: true },
      where: { userId: { in: ids }, ...(params.from || params.to ? { clockIn: dateFilter } : {}) },
    });
    const attMap = new Map<string, Date | null>();
    for (const a of atts) attMap.set(a.userId as unknown as string, (a._max.clockIn as Date) || null);

    const items = users.map(u => {
      const name = (u.firstName || '') + (u.surname ? ` ${u.surname}` : '') || u.username;
      const s = salesMap.get(u.id) || { total: 0, last: null };
      const lastActive = s.last || attMap.get(u.id) || null;
      return {
        id: u.id,
        name,
        role: u.role,
        totalShifts: shiftMap.get(u.id) || 0,
        totalSales: s.total,
        lastActive: lastActive || new Date(0),
      };
    });

    return { items, total };
  }

  async listCashMovements(params: { branchId?: string; from?: string; to?: string; limit: number; offset: number }) {
    const dateFilter = {
      gte: params.from ? new Date(params.from) : undefined,
      lte: params.to ? new Date(params.to) : undefined,
    } as { gte?: Date; lte?: Date };

    const where: any = {
      ...(params.from || params.to ? { createdAt: dateFilter } : {}),
      order: params.branchId ? { branchId: params.branchId } : undefined,
    };

    const [rows, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: params.offset,
        take: params.limit,
        select: { id: true, amount: true, method: true, createdAt: true, order: { select: { id: true } }, },
      }),
      this.prisma.payment.count({ where }),
    ]);

    const items = rows.map(r => ({
      id: r.id,
      amount: parseFloat(String(r.amount ?? 0)),
      type: parseFloat(String(r.amount ?? 0)) >= 0 ? 'PAY_IN' : 'PAY_OUT',
      method: r.method,
      orderId: r.order?.id,
      createdAt: r.createdAt,
    }));

    return { items, total };
  }

  async shiftReport(params: { shiftId?: string; branchId?: string; sectionId?: string }) {
    // Resolve shift
    const shift = params.shiftId
      ? await this.prisma.shift.findUnique({ where: { id: params.shiftId } })
      : await this.prisma.shift.findFirst({
          where: {
            ...(params.branchId ? { branchId: params.branchId } : {}),
            ...(params.sectionId ? { sectionId: params.sectionId } : {}),
          },
          orderBy: { openedAt: 'desc' },
        });
    if (!shift) return { ok: false, message: 'Shift not found' } as any;

    const from = shift.openedAt;
    const to = shift.closedAt || new Date();
    const dateFilter = { gte: from, lte: to } as { gte?: Date; lte?: Date };

    // Payments in window (cashflow)
    const payWhere: any = {
      createdAt: dateFilter,
      order: {
        ...(shift.branchId ? { branchId: shift.branchId } : {}),
        ...(shift.sectionId ? { sectionId: shift.sectionId } : {}),
      },
    };
    const payments = await this.prisma.payment.findMany({
      where: payWhere,
      select: { amount: true, method: true, order: { select: { id: true, userId: true } } },
    });
    const byMethod: Record<string, number> = {};
    let totalSales = 0;
    const salesByCashier = new Map<string, number>();
    for (const p of payments) {
      const amt = parseFloat(String(p.amount ?? 0));
      totalSales += amt;
      const m = (p.method || 'unknown').toLowerCase();
      byMethod[m] = (byMethod[m] || 0) + amt;
      const uid = p.order?.userId || 'unknown';
      salesByCashier.set(uid, (salesByCashier.get(uid) || 0) + amt);
    }

    // Credit sales during window (orders suspended)
    const creditOrders = await this.prisma.order.findMany({
      where: {
        status: 'SUSPENDED' as any,
        createdAt: dateFilter,
        ...(shift.branchId ? { branchId: shift.branchId } : {}),
        ...(shift.sectionId ? { sectionId: shift.sectionId } : {}),
      },
      select: { id: true, total: true },
    });
    const totalCreditSales = creditOrders.reduce((acc, o) => acc + parseFloat(String(o.total ?? 0)), 0);

    // Items sold and breakdowns (by order create time)
    const orderItems = await this.prisma.orderItem.findMany({
      where: {
        order: {
          createdAt: dateFilter,
          status: { not: 'CANCELLED' as any },
          ...(shift.branchId ? { branchId: shift.branchId } : {}),
          ...(shift.sectionId ? { sectionId: shift.sectionId } : {}),
        },
      },
      select: { qty: true, product: { select: { category: true, name: true } } },
    });
    let totalItemsSold = 0;
    const byCategory = new Map<string, number>();
    const byBrand = new Map<string, number>();
    for (const it of orderItems) {
      const q = Number(it.qty || 0);
      totalItemsSold += q;
      const cat = (it.product?.category || 'Unknown');
      const brand = 'N/A';
      byCategory.set(cat, (byCategory.get(cat) || 0) + q);
      byBrand.set(brand, (byBrand.get(brand) || 0) + q);
    }

    // Resolve names for staff
    const cashierIds = Array.from(salesByCashier.keys()).filter(Boolean) as string[];
    const users = cashierIds.length
      ? await this.prisma.user.findMany({ where: { id: { in: cashierIds } }, select: { id: true, username: true, firstName: true, surname: true } })
      : [];
    const cashierList = cashierIds.map((id) => {
      const u = users.find((x) => x.id === id);
      const name = u ? ((u.firstName || '') + (u.surname ? ` ${u.surname}` : '') || u.username) : 'Unknown';
      return { id, name, totalSales: salesByCashier.get(id) || 0 };
    });

    // Branch/section names
    const [branch, section] = await Promise.all([
      this.prisma.branch.findUnique({ where: { id: shift.branchId }, select: { id: true, name: true } }),
      shift.sectionId ? this.prisma.section.findUnique({ where: { id: shift.sectionId }, select: { id: true, name: true } }) : Promise.resolve(null),
    ]);

    return {
      shift: {
        id: shift.id,
        branchId: shift.branchId,
        branchName: branch?.name || '',
        sectionId: shift.sectionId || null,
        sectionName: section?.name || null,
        startedAt: shift.openedAt,
        endedAt: shift.closedAt || null,
        status: shift.status,
      },
      summary: {
        totalSales,
        byMethod,
        totalCreditSales,
      },
      items: {
        totalItemsSold,
        byCategory: Array.from(byCategory.entries()).map(([name, count]) => ({ name, count })),
        byBrand: Array.from(byBrand.entries()).map(([name, count]) => ({ name, count })),
      },
      staff: {
        cashiers: cashierList,
        serviceStaff: [],
      },
      window: { from, to },
    };
  }
}
