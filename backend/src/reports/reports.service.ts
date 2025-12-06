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

    // Outstanding per order (Invoice Due): include ONLY SUSPENDED and PENDING_PAYMENT
    // Compute outstanding = total - sum(all payments for that order)
    const creditOrders = await this.prisma.order.findMany({
      where: {
        ...(params.branchId ? { branchId: params.branchId } : {}),
        status: { in: ['PENDING_PAYMENT', 'SUSPENDED'] as any },
      },
      select: {
        id: true,
        status: true,
        total: true,
        subtotal: true,
        tax: true,
        discount: true,
        // Only consider SUSPENDED drafts when deriving totals for credit orders.
        // Plain DRAFT updates must not influence Invoice Due until suspended or marked pending.
        drafts: {
          where: { status: 'SUSPENDED' as any },
          select: { total: true, subtotal: true, tax: true, discount: true, createdAt: true, status: true },
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

    // Note: Drafts are excluded from Invoice Due. Only orders with credit statuses
    // (PENDING_PAYMENT or SUSPENDED) contribute to the KPI.

    // 2) Also include credit orders not represented by drafts (e.g., legacy/other flows)
    for (const o of creditOrders) {
      const ordTotal = parseFloat(String((o as any).total ?? 0));
      const sub = parseFloat(String((o as any).subtotal ?? 0));
      const tx = parseFloat(String((o as any).tax ?? 0));
      const disc = parseFloat(String((o as any).discount ?? 0));
      const derived = sub + tx - disc;

      // Compute using order financials only (ignore drafts); only credit statuses counted above
      const fromOrder = ordTotal > 0 ? ordTotal : (derived > 0 ? derived : 0);
      const tot = fromOrder;

      // No draft pass; each credit order is evaluated once

      // Include only if there is outstanding balance
      const paid = paidByOrder.get((o as any).id) || 0;
      const outstanding = Math.max(0, tot - paid);
      if (outstanding > 0) invoiceDue += outstanding;
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

  async listActivityLog(params: { branchId?: string; from?: string; to?: string; limit: number; offset: number }) {
    const { branchId, from, to, limit, offset } = params;

    const dateFilter = {
      gte: from ? new Date(from) : undefined,
      lte: to ? new Date(to) : undefined,
    } as { gte?: Date; lte?: Date };

    const anyPrisma = this.prisma as any;
    if (!anyPrisma.auditLog?.findMany) {
      return { items: [], total: 0 };
    }

    const where: any = {};
    if (branchId) where.branchId = branchId;
    if (from || to) where.createdAt = dateFilter;
    // Exclude low-level HTTP request logs (GET/POST/PUT/DELETE/PATCH ...) so that
    // the Activity Log focuses on business events (Sale Added, Shift Opened, etc.).
    // This keeps pagination correct because the filter is applied in the DB query.
    where.AND = [
      {
        NOT: {
          OR: [
            { action: { startsWith: 'GET ' } },
            { action: { startsWith: 'POST ' } },
            { action: { startsWith: 'PUT ' } },
            { action: { startsWith: 'DELETE ' } },
            { action: { startsWith: 'PATCH ' } },
          ],
        },
      },
    ];

    const [rows, total] = await Promise.all([
      anyPrisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        select: { id: true, action: true, userId: true, branchId: true, meta: true, createdAt: true },
      }),
      anyPrisma.auditLog.count({ where }),
    ]);

    const userIds = Array.from(new Set(rows.map((r: any) => r.userId).filter((x: any) => !!x))) as string[];
    const users = userIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, username: true, firstName: true, surname: true },
        })
      : [];

    // Pre-collect override entries so we can merge their note into the matching
    // business-event row (e.g. "Deleted draft", "Sale Added") instead of
    // showing a separate "Override Used" row.
    const overrideEntries: any[] = [];
    for (const r of rows) {
      const meta: any = r.meta || {};
      if (r.action === 'Override Used' && (meta && meta.subjectType === 'Override')) {
        overrideEntries.push(r);
      }
    }

    const items = rows.map((r: any) => {
      const u = users.find((x) => x.id === r.userId);
      const userName = u
        ? (((u.firstName || '') + (u.surname ? ` ${u.surname}` : '')).trim() || u.username)
        : 'Unknown';
      const meta: any = r.meta || {};
      const subjectType = meta.subjectType || meta.entityType || meta.type || null;
      let note =
        meta.note ||
        meta.details ||
        meta.description ||
        meta.invoiceNo ||
        meta.reference ||
        null;

      // Merge override PIN info into the same row as the corresponding
      // business event instead of showing a separate Override row.
      if (r.action === 'Deleted draft') {
        const matchIdx = overrideEntries.findIndex((o) => {
          if (!o) return false;
          if (o.userId !== r.userId) return false;
          const ometa: any = o.meta || {};
          // Link primarily by draftId/orderId if available, otherwise by close timestamp.
          const sharesId =
            (meta && ometa && meta.draftId && ometa.draftId && String(meta.draftId) === String(ometa.draftId)) ||
            (meta && ometa && meta.orderId && ometa.orderId && String(meta.orderId) === String(ometa.orderId));
          const timeDiff = Math.abs(new Date(o.createdAt).getTime() - new Date(r.createdAt).getTime());
          return sharesId || timeDiff <= 10_000; // within 10s window
        });
        if (matchIdx >= 0) {
          const o = overrideEntries[matchIdx];
          overrideEntries.splice(matchIdx, 1);
          const ometa: any = o.meta || {};
          const overrideNote =
            ometa.note ||
            (ometa.overrideOwnerName ? `Authenticated by ${ometa.overrideOwnerName}'s PIN` : null);
          if (overrideNote) {
            note = note ? `${note} | ${overrideNote}` : overrideNote;
          }
        }
      }

      // Merge discount override info into the same row as the corresponding
      // "Sale Added" entry so the Activity Log shows a single line per sale.
      if (r.action === 'Sale Added') {
        const matchIdx = overrideEntries.findIndex((o) => {
          if (!o) return false;
          const ometa: any = o.meta || {};
          if (!ometa || ometa.action !== 'APPLIED_DISCOUNT') return false;
          // Match by orderId when possible, otherwise fall back to a small time window.
          const sharesOrder =
            (meta && ometa && meta.orderId && ometa.orderId && String(meta.orderId) === String(ometa.orderId));
          const timeDiff = Math.abs(new Date(o.createdAt).getTime() - new Date(r.createdAt).getTime());
          return sharesOrder || timeDiff <= 10_000; // within 10s window
        });
        if (matchIdx >= 0) {
          const o = overrideEntries[matchIdx];
          overrideEntries.splice(matchIdx, 1);
          const ometa: any = o.meta || {};
          const overrideNote =
            ometa.note ||
            (ometa.overrideOwnerName ? `Authenticated by ${ometa.overrideOwnerName}'s PIN for discount` : null);
          if (overrideNote) {
            note = note ? `${note} | ${overrideNote}` : overrideNote;
          }
        }
      }

      // Build a richer, user-friendly note for key business events.
      // Example for sales: "Invoice: INV-00123 | Status: PAID | Total: ₦12,000.00".
      const invoiceNo = meta.invoiceNo || meta.invoice || null;
      const status = meta.status || null;
      const totalRaw = typeof meta.total !== 'undefined' ? Number(meta.total) : NaN;
      if (!note && (invoiceNo || status || !isNaN(totalRaw))) {
        const parts: string[] = [];
        if (invoiceNo) parts.push(`Invoice: ${invoiceNo}`);
        if (status) parts.push(`Status: ${String(status).toUpperCase()}`);
        if (!isNaN(totalRaw)) {
          try {
            const formatted = totalRaw.toLocaleString('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 2 });
            parts.push(`Total: ${formatted}`);
          } catch {
            parts.push(`Total: ${totalRaw}`);
          }
        }
        if (parts.length) note = parts.join(' | ');
      }

        // Hide standalone override rows used only for enriching business events
        // (Deleted draft, Sale Added, etc.) so the Activity Log shows a single
        // merged row per business event.
        if (r.action === 'Override Used') {
          const m: any = (r.meta || {});
          if (m && m.subjectType === 'Override') {
            return null;
          }
        }

        return {
          id: r.id,
          date: r.createdAt,
          userName,
          action: r.action,
          subjectType,
          note,
          branchId: r.branchId || null,
        };
      })
      .filter((x: any) => !!x);

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

  async shiftRegisterList(params: { branchId?: string; sectionId?: string; userId?: string; status?: 'OPEN' | 'CLOSED' | 'ALL'; from?: string; to?: string; limit: number; offset: number }) {
    const { sectionId, userId } = params;
    let { branchId, status = 'ALL', from, to, limit, offset } = params;
    const dateFilter = {
      gte: from ? new Date(from) : undefined,
      lte: to ? new Date(to) : undefined,
    } as { gte?: Date; lte?: Date };

    if (!branchId) {
      const first = await this.prisma.branch.findFirst({ select: { id: true }, orderBy: { createdAt: 'asc' } });
      branchId = first?.id || undefined;
    }
    if (!branchId) throw new Error('branchId is required');

    const whereShift: any = { branchId };
    if (sectionId) whereShift.sectionId = sectionId;
    if (status && status !== 'ALL') whereShift.status = status;
    if (from || to) {
      whereShift.openedAt = dateFilter;
    }
    if (userId) whereShift.openedById = userId;

    const [shifts, total] = await Promise.all([
      this.prisma.shift.findMany({
        where: whereShift,
        orderBy: { openedAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.shift.count({ where: whereShift }),
    ]);

    if (!shifts.length) {
      return {
        items: [],
        total,
        totals: {
          totalCash: 0,
          totalCard: 0,
          totalTransfer: 0,
          totalOther: 0,
          totalCredit: 0,
          grandTotal: 0,
        },
      } as any;
    }

    // Preload branches, sections, and users for display
    const branchIds = Array.from(new Set(shifts.map(s => s.branchId).filter(Boolean))) as string[];
    const sectionIds = Array.from(new Set(shifts.map(s => s.sectionId).filter(Boolean))) as string[];
    const userIds = Array.from(new Set(shifts.map(s => s.openedById).filter(Boolean))) as string[];

    const [branches, sections, users] = await Promise.all([
      branchIds.length ? this.prisma.branch.findMany({ where: { id: { in: branchIds } }, select: { id: true, name: true } }) : Promise.resolve([]),
      sectionIds.length ? this.prisma.section.findMany({ where: { id: { in: sectionIds } }, select: { id: true, name: true } }) : Promise.resolve([]),
      userIds.length ? this.prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, username: true, email: true, firstName: true, surname: true } }) : Promise.resolve([]),
    ]);

    const branchById = new Map(branches.map(b => [b.id, b.name] as [string, string]));
    const sectionById = new Map(sections.map(s => [s.id, s.name] as [string, string]));
    const userById = new Map(users.map(u => [u.id, u] as [string, typeof users[number]]));

    let totalCash = 0;
    let totalCard = 0;
    let totalTransfer = 0;
    let totalOther = 0;
    let totalCredit = 0;

    const items = [] as any[];

    for (const shift of shifts) {
      const fromShift = shift.openedAt;
      const toShift = shift.closedAt || new Date();
      const shiftWindow = { gte: fromShift, lte: toShift } as { gte: Date; lte: Date };

      // Payments in this shift window
      const payments = await this.prisma.payment.findMany({
        where: {
          createdAt: shiftWindow,
          order: {
            branchId: shift.branchId,
            ...(shift.sectionId ? { sectionId: shift.sectionId } : {}),
          },
        },
        select: { amount: true, method: true },
      });

      let cash = 0;
      let card = 0;
      let transfer = 0;
      let other = 0;
      for (const p of payments) {
        const amt = parseFloat(String(p.amount ?? 0));
        const m = String(p.method || '').toLowerCase();
        if (m === 'cash') cash += amt;
        else if (m === 'card') card += amt;
        else if (m === 'transfer') transfer += amt;
        else other += amt;
      }

      // Credit / debt during window: SUSPENDED or PENDING_PAYMENT orders
      const creditOrders = await this.prisma.order.findMany({
        where: {
          createdAt: shiftWindow,
          status: { in: ['SUSPENDED', 'PENDING_PAYMENT'] as any },
          ...(shift.branchId ? { branchId: shift.branchId } : {}),
          ...(shift.sectionId ? { sectionId: shift.sectionId } : {}),
        },
        select: { total: true },
      });
      const credit = creditOrders.reduce((acc, o) => acc + parseFloat(String(o.total ?? 0)), 0);

      const grand = cash + card + transfer + other;

      totalCash += cash;
      totalCard += card;
      totalTransfer += transfer;
      totalOther += other;
      totalCredit += credit;

      const user = shift.openedById ? userById.get(shift.openedById) : null;
      const name = user ? ((user.firstName || '') + (user.surname ? ` ${user.surname}` : '') || user.username) : (shift as any).openedById || 'Unknown';

      items.push({
        id: shift.id,
        openedAt: shift.openedAt,
        closedAt: shift.closedAt,
        date: shift.openedAt,
        branchId: shift.branchId,
        branchName: shift.branchId ? (branchById.get(shift.branchId) || '') : '',
        sectionId: shift.sectionId,
        sectionName: shift.sectionId ? (sectionById.get(shift.sectionId) || '') : '',
        userId: shift.openedById,
        userName: name,
        userEmail: user?.email || null,
        totalCash: cash,
        totalCard: card,
        totalTransfer: transfer,
        totalOther: other,
        totalCredit: credit,
        grandTotal: grand,
      });
    }

    return {
      items,
      total,
      totals: {
        totalCash,
        totalCard,
        totalTransfer,
        totalOther,
        totalCredit,
        grandTotal: totalCash + totalCard + totalTransfer + totalOther,
      },
    } as any;
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

    // Enrich shift with branch/section names and openedBy details for UI footer
    const [branch, section, openedBy] = await Promise.all([
      shift.branchId ? this.prisma.branch.findUnique({ where: { id: shift.branchId }, select: { id: true, name: true, location: true } }) : Promise.resolve(null),
      shift.sectionId ? this.prisma.section.findUnique({ where: { id: shift.sectionId }, select: { id: true, name: true } }) : Promise.resolve(null),
      this.prisma.user.findUnique({ where: { id: shift.openedById }, select: { id: true, username: true, firstName: true, surname: true, email: true } }),
    ]);
    const openedByName = openedBy ? (((openedBy.firstName || '') + (openedBy.surname ? ` ${openedBy.surname}` : '')).trim() || openedBy.username) : undefined;
    const openedByEmail = openedBy?.email || undefined;
    const branchName = branch?.name || undefined;
    const branchLocation = branch?.location || undefined;
    const sectionName = section?.name || undefined;

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

    // Discounts for orders in this window (using draft fallback similar to overview)
    const ordersInWindow = await this.prisma.order.findMany({
      where: {
        createdAt: dateFilter,
        status: { not: 'CANCELLED' as any },
        ...(shift.branchId ? { branchId: shift.branchId } : {}),
        ...(shift.sectionId ? { sectionId: shift.sectionId } : {}),
      },
      select: {
        subtotal: true,
        tax: true,
        discount: true,
        total: true,
        drafts: {
          select: { total: true, subtotal: true, tax: true, discount: true, createdAt: true },
          orderBy: { createdAt: 'desc' as const },
          take: 1,
        },
      },
    } as any);

    let totalDiscounts = 0;
    if (Array.isArray(ordersInWindow) && ordersInWindow.length) {
      for (const o of ordersInWindow as any[]) {
        const ordDisc = parseFloat(String((o as any).discount ?? 0));
        const latestDraft = Array.isArray((o as any).drafts) && (o as any).drafts.length ? (o as any).drafts[0] : undefined;
        const dDisc = latestDraft ? parseFloat(String((latestDraft as any).discount ?? 0)) : 0;
        const effDisc = latestDraft != null ? dDisc : ordDisc;
        if (!isNaN(effDisc) && effDisc > 0) {
          totalDiscounts += effDisc;
        }
      }
    }

    // Expenses in this window for the branch
    const expenseAgg = await this.prisma.expense.aggregate({
      where: {
        ...(shift.branchId ? { branchId: shift.branchId } : {}),
        createdAt: dateFilter,
      },
      _sum: { amount: true },
    });
    const totalExpenses = parseFloat(String(expenseAgg._sum.amount ?? 0));

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
      select: { qty: true, price: true, product: { select: { name: true, category: true, subCategory: true } } },
    });
    let totalItemsSold = 0;
    const byCategory = new Map<string, { qty: number; total: number }>();
    const byBrand = new Map<string, { qty: number; total: number }>();
    const productsMap = new Map<string, { name: string; qty: number; totalAmount: number }>();
    for (const it of orderItems) {
      const q = Number(it.qty || 0);
      const price = parseFloat(String((it as any).price ?? 0));
      const lineTotal = q * (isNaN(price) ? 0 : price);
      totalItemsSold += q;
      const cat = (it.product?.category || 'Uncategorized');
      const brand = (it.product?.subCategory || 'Unbranded');
      const name = it.product?.name || 'Unknown';
      const prevCat = byCategory.get(cat) || { qty: 0, total: 0 };
      prevCat.qty += q;
      prevCat.total += lineTotal;
      byCategory.set(cat, prevCat);
      const prevBrand = byBrand.get(brand) || { qty: 0, total: 0 };
      prevBrand.qty += q;
      prevBrand.total += lineTotal;
      byBrand.set(brand, prevBrand);
      const prev = productsMap.get(name) || { name, qty: 0, totalAmount: 0 };
      prev.qty += q;
      prev.totalAmount += lineTotal;
      productsMap.set(name, prev);
    }

    // Resolve names for staff
    const cashierIds = Array.from(salesByCashier.keys()).filter(Boolean) as string[];
    const users = cashierIds.length
      ? await this.prisma.user.findMany({ where: { id: { in: cashierIds } }, select: { id: true, username: true, firstName: true, surname: true, email: true } })
      : [];
    const cashierList = cashierIds.map((id) => {
      const u = users.find((x) => x.id === id);
      const name = u ? ((u.firstName || '') + (u.surname ? ` ${u.surname}` : '') || u.username) : 'Unknown';
      const total = salesByCashier.get(id) || 0;
      return { id, name, total, email: u?.email || null };
    });

    return {
      shift: {
        id: shift.id,
        branchId: shift.branchId,
        branchName,
        branchLocation,
        sectionId: shift.sectionId || null,
        sectionName,
        startedAt: shift.openedAt,
        endedAt: shift.closedAt || null,
        status: shift.status,
        openedByName,
        openedByEmail,
      },
      summary: {
        totalSales,
        byMethod,
        totalCreditSales,
        totalDiscounts,
        totalExpenses,
      },
      items: {
        totalItemsSold,
        products: Array.from(productsMap.values()).map(p => ({ name: p.name, count: p.qty, totalAmount: p.totalAmount })),
        byCategory: Array.from(byCategory.entries()).map(([name, v]) => ({ name, count: v.qty, totalAmount: v.total })),
        byBrand: Array.from(byBrand.entries()).map(([name, v]) => ({ name, count: v.qty, totalAmount: v.total })),
      },
      staff: {
        cashiers: cashierList,
        serviceStaff: [],
      },
      window: { from, to },
    };
  }
}
