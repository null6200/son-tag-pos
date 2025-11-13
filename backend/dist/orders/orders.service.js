"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let OrdersService = class OrdersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    isLockingStatus(status) {
        return status === 'DRAFT' || status === 'ACTIVE' || status === 'PENDING_PAYMENT';
    }
    async list(branchId, from, to, userId, perms = []) {
        const where = {
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
            },
            orderBy: { createdAt: 'desc' },
        });
        return rows.map((o) => {
            const invoice = o.invoice_no || o.invoiceNo || o.receiptNo || (typeof o.orderNumber !== 'undefined' ? String(o.orderNumber) : undefined);
            const status = String(o.status || '').toUpperCase();
            const draft = Array.isArray(o.drafts) && o.drafts.length > 0 ? o.drafts[0] : null;
            const needsDraftFallback = (o.subtotal == null || Number(o.subtotal) === 0) ||
                (o.tax == null || (Number(o.tax) === 0 && draft?.tax && Number(draft.tax) > 0)) ||
                (o.discount == null || (Number(o.discount) === 0 && draft?.discount && Number(draft.discount) > 0)) ||
                (o.serviceType == null && !!draft?.serviceType);
            const merged = { ...o };
            if (((status === 'SUSPENDED' || status === 'PENDING_PAYMENT') || needsDraftFallback) && draft) {
                if (draft.subtotal != null)
                    merged.subtotal = draft.subtotal;
                if (draft.tax != null)
                    merged.tax = draft.tax;
                if (draft.discount != null)
                    merged.discount = draft.discount;
                if (draft.total != null)
                    merged.total = draft.total;
                if (!merged.serviceType && draft.serviceType)
                    merged.serviceType = draft.serviceType;
                if ((!merged.waiterName || !String(merged.waiterName).trim()) && draft.waiterId)
                    merged.waiterId = draft.waiterId;
            }
            try {
                const total = Number(merged.total ?? 0);
                const payments = Array.isArray(merged.payments) ? merged.payments : [];
                const paid = payments.reduce((a, p) => a + Number(p.amount || 0), 0);
                if (total > 0 && paid >= total)
                    merged.status = 'PAID';
            }
            catch { }
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
    async getOne(id) {
        const order = await this.prisma.order.findUnique({
            where: { id },
            include: {
                items: { include: { product: { select: { id: true, name: true } } } },
                payments: true,
                user: { select: { id: true, username: true, firstName: true, surname: true } },
                branch: { select: { id: true, name: true } },
                section: { select: { id: true, name: true } },
                drafts: { select: { id: true, subtotal: true, discount: true, tax: true, total: true, serviceType: true, waiterId: true } },
            },
        });
        if (!order)
            throw new common_1.BadRequestException('Order not found');
        const invoice = order.invoice_no || order.invoiceNo || order.receiptNo || (typeof order.orderNumber !== 'undefined' ? String(order.orderNumber) : undefined);
        const status = String(order.status || '').toUpperCase();
        const hasDraft = Array.isArray(order.drafts) && order.drafts.length > 0;
        const draft = hasDraft ? order.drafts[0] : null;
        let waiterName = order.waiterName;
        if ((!waiterName || !waiterName.trim()) && order.waiterId) {
            try {
                const w = await this.prisma.user.findUnique({ where: { id: order.waiterId }, select: { username: true, firstName: true, surname: true } });
                if (w)
                    waiterName = (w.firstName || w.surname) ? `${w.firstName || ''} ${w.surname || ''}`.trim() : (w.username || null);
            }
            catch { }
        }
        const enriched = { ...order };
        const needsDraftFallback = (enriched.subtotal == null || Number(enriched.subtotal) === 0) ||
            (enriched.tax == null || (Number(enriched.tax) === 0 && draft?.tax && Number(draft.tax) > 0)) ||
            (enriched.discount == null || (Number(enriched.discount) === 0 && draft?.discount && Number(draft.discount) > 0)) ||
            (enriched.serviceType == null && !!draft?.serviceType);
        if (((status === 'SUSPENDED' || status === 'PENDING_PAYMENT') || needsDraftFallback) && draft) {
            if (draft.subtotal != null)
                enriched.subtotal = draft.subtotal;
            if (draft.tax != null)
                enriched.tax = draft.tax;
            if (draft.discount != null)
                enriched.discount = draft.discount;
            if (draft.total != null)
                enriched.total = draft.total;
            if (!enriched.serviceType && draft.serviceType)
                enriched.serviceType = draft.serviceType;
            if ((!waiterName || !waiterName.trim()) && draft.waiterId) {
                try {
                    const w = await this.prisma.user.findUnique({ where: { id: draft.waiterId }, select: { username: true, firstName: true, surname: true } });
                    if (w)
                        waiterName = (w.firstName || w.surname) ? `${w.firstName || ''} ${w.surname || ''}`.trim() : (w.username || null);
                }
                catch { }
            }
        }
        return { ...enriched, displayInvoice: invoice, waiter: waiterName };
    }
    async create(dto, userId) {
        if (!dto.items?.length)
            throw new common_1.BadRequestException('No items');
        return this.prisma.$transaction(async (tx) => {
            let resolvedBranchId = dto.branchId;
            if (!dto.sectionId && dto.sectionName && resolvedBranchId) {
                const secByName = await tx.section.findFirst({ where: { name: dto.sectionName, branchId: resolvedBranchId }, select: { id: true } });
                if (!secByName)
                    throw new common_1.BadRequestException('Section not found');
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
            if (!resolvedBranchId)
                throw new common_1.BadRequestException('branchId required');
            const canUseSectionByProduct = {};
            let sectionFnId = null;
            if (dto.sectionId) {
                const section = await tx.section.findUnique({ where: { id: dto.sectionId } });
                if (!section)
                    throw new common_1.BadRequestException('Section not found');
                sectionFnId = section.sectionFunctionId || null;
                if (sectionFnId) {
                    const productIds = Array.from(new Set(dto.items.map(i => i.productId)));
                    const products = await tx.product.findMany({ where: { id: { in: productIds } }, select: { id: true, productTypeId: true } });
                    const byProductId = Object.fromEntries(products.map(p => [p.id, p.productTypeId || null]));
                    const distinctTypes = Array.from(new Set(products.map(p => p.productTypeId).filter(Boolean)));
                    const links = distinctTypes.length > 0
                        ? await tx.productTypeAllowedFunction.findMany({ where: { productTypeId: { in: distinctTypes } } })
                        : [];
                    const allowedCache = {};
                    for (const ptId of distinctTypes) {
                        const pts = links.filter(l => l.productTypeId === ptId).map(l => l.sectionFunctionId);
                        allowedCache[ptId] = pts.length === 0 ? 'ALL' : new Set(pts);
                    }
                    for (const it of dto.items) {
                        const ptId = byProductId[it.productId] || null;
                        if (!ptId) {
                            canUseSectionByProduct[it.productId] = true;
                            continue;
                        }
                        const allowed = allowedCache[ptId];
                        if (!allowed || allowed === 'ALL' || allowed.has(sectionFnId)) {
                            canUseSectionByProduct[it.productId] = true;
                        }
                        else {
                            canUseSectionByProduct[it.productId] = false;
                        }
                    }
                }
                else {
                    for (const it of dto.items)
                        canUseSectionByProduct[it.productId] = true;
                }
            }
            else {
                for (const it of dto.items)
                    canUseSectionByProduct[it.productId] = false;
            }
            const updated = await tx.branch.update({
                where: { id: resolvedBranchId },
                data: { nextOrderSeq: { increment: 1 } },
                select: { nextOrderSeq: true },
            });
            const orderNumber = updated.nextOrderSeq;
            const initialStatus = dto.status || 'ACTIVE';
            if (dto.tableId && this.isLockingStatus(initialStatus)) {
                const existing = await tx.order.findFirst({
                    where: { tableId: dto.tableId, status: { in: ['DRAFT', 'ACTIVE', 'PENDING_PAYMENT'] } },
                    orderBy: { updatedAt: 'desc' },
                });
                if (existing)
                    throw new common_1.BadRequestException(`Table is occupied by order ${existing.id}`);
            }
            let waiterName = null;
            if (dto.waiterId && !dto['waiterName']) {
                try {
                    const w = await tx.user.findUnique({ where: { id: dto.waiterId }, select: { username: true, firstName: true, surname: true } });
                    if (w)
                        waiterName = w.firstName || w.surname ? `${w.firstName || ''} ${w.surname || ''}`.trim() : (w.username || null);
                }
                catch { }
            }
            const order = await tx.order.create({
                data: {
                    branchId: resolvedBranchId,
                    sectionId: dto.sectionId || null,
                    userId: userId || null,
                    status: initialStatus || 'ACTIVE',
                    total: '0',
                    orderNumber,
                    tableId: dto.tableId || null,
                    waiterId: dto.waiterId || null,
                    waiterName: dto.waiterName || waiterName,
                    serviceType: dto.serviceType || null,
                },
            });
            let total = 0;
            for (const it of dto.items) {
                await tx.orderItem.create({
                    data: {
                        orderId: order.id,
                        productId: it.productId,
                        qty: Number(it.qty),
                        price: it.price,
                    },
                });
                let reservedRecent = 0;
                if (dto.sectionId) {
                    const where = {
                        productId: it.productId,
                        branchId: resolvedBranchId,
                        sectionFrom: dto.sectionId,
                        reason: 'ADJUST',
                    };
                    if (!dto.reservationKey) {
                        where.createdAt = { gte: new Date(Date.now() - 4 * 60 * 60 * 1000) };
                    }
                    const recent = await tx.stockMovement.findMany({ where, select: { delta: true, referenceId: true } });
                    for (const m of recent) {
                        const d = Number(m.delta || 0);
                        if (d >= 0)
                            continue;
                        const ref = String(m.referenceId || '');
                        if (!ref.startsWith('ADJ|'))
                            continue;
                        if (dto.reservationKey) {
                            if (!ref.includes(`|RESV|${dto.reservationKey}`))
                                continue;
                        }
                        else if (userId) {
                            const parts = ref.split('|');
                            const refUserId = parts.length >= 4 ? (parts[3] || '') : '';
                            if (refUserId && refUserId !== userId)
                                continue;
                        }
                        reservedRecent += Math.abs(d);
                    }
                }
                const netQty = Math.max(0, Number(it.qty || 0) - Number(isNaN(reservedRecent) ? 0 : reservedRecent));
                if (dto.sectionId && (canUseSectionByProduct[it.productId])) {
                    const secInv = await tx.sectionInventory.upsert({
                        where: { productId_sectionId: { productId: it.productId, sectionId: dto.sectionId } },
                        update: {},
                        create: { productId: it.productId, sectionId: dto.sectionId, qtyOnHand: 0 },
                    });
                    const newQty = secInv.qtyOnHand - netQty;
                    if (newQty < 0 && !dto.allowOverselling)
                        throw new common_1.BadRequestException(`Insufficient stock: product ${it.productId} in section ${dto.sectionId}. Available=${secInv.qtyOnHand}, Requested=${netQty}`);
                    if (netQty > 0) {
                        await tx.sectionInventory.update({
                            where: { productId_sectionId: { productId: it.productId, sectionId: dto.sectionId } },
                            data: { qtyOnHand: newQty },
                        });
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
                }
                else if (dto.sectionId) {
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
                    }
                    else {
                        const inv = await tx.inventory.upsert({
                            where: { productId_branchId: { productId: it.productId, branchId: resolvedBranchId } },
                            update: {},
                            create: { productId: it.productId, branchId: resolvedBranchId, qtyOnHand: 0 },
                        });
                        const newQty = inv.qtyOnHand - netQty;
                        if (newQty < 0 && !dto.allowOverselling)
                            throw new common_1.BadRequestException(`Insufficient stock: product ${it.productId} in branch ${resolvedBranchId}. Available=${inv.qtyOnHand}, Requested=${netQty}`);
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
                }
                else {
                    const inv = await tx.inventory.upsert({
                        where: { productId_branchId: { productId: it.productId, branchId: resolvedBranchId } },
                        update: {},
                        create: { productId: it.productId, branchId: resolvedBranchId, qtyOnHand: 0 },
                    });
                    const newQty = inv.qtyOnHand - netQty;
                    if (newQty < 0 && !dto.allowOverselling)
                        throw new common_1.BadRequestException(`Insufficient stock: product ${it.productId} in branch ${resolvedBranchId}. Available=${inv.qtyOnHand}, Requested=${netQty}`);
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
                total += parseFloat(it.price) * Number(it.qty);
            }
            const sub = dto.subtotal != null ? Number(dto.subtotal) : Number(total);
            const disc = dto.discount != null ? Number(dto.discount) : 0;
            const txAmt = dto.tax != null ? Number(dto.tax) : 0;
            const txRate = dto.taxRate != null ? Number(dto.taxRate) : null;
            const finalTotal = dto.total != null && !isNaN(Number(dto.total))
                ? Number(dto.total)
                : (Number(sub) + Number(txAmt) - Number(disc));
            await tx.order.update({
                where: { id: order.id },
                data: {
                    total: String(finalTotal),
                    subtotal: String(isNaN(sub) ? 0 : sub),
                    discount: String(isNaN(disc) ? 0 : disc),
                    tax: String(isNaN(txAmt) ? 0 : txAmt),
                    taxRate: txRate !== null && !isNaN(txRate) ? String(txRate) : undefined,
                },
            });
            if (dto.payment && dto.payment.method && dto.payment.amount) {
                await tx.payment.create({
                    data: {
                        orderId: order.id,
                        method: dto.payment.method,
                        amount: dto.payment.amount,
                        reference: dto.payment.reference || null,
                    },
                });
            }
            return tx.order.findUnique({
                where: { id: order.id },
                include: { items: true, payments: true },
            });
        });
    }
    async updateStatus(orderId, status) {
        return this.prisma.$transaction(async (tx) => {
            const order = await tx.order.findUnique({ where: { id: orderId } });
            if (!order)
                throw new common_1.BadRequestException('Order not found');
            if (order.tableId && this.isLockingStatus(status)) {
                const existing = await tx.order.findFirst({
                    where: { tableId: order.tableId, status: { in: ['DRAFT', 'ACTIVE', 'PENDING_PAYMENT'] }, NOT: { id: orderId } },
                    orderBy: { updatedAt: 'desc' },
                });
                if (existing)
                    throw new common_1.BadRequestException(`Table is occupied by order ${existing.id}`);
            }
            const isLocking = this.isLockingStatus(status);
            const data = { status: status };
            if (!isLocking)
                data.tableId = null;
            if (status === 'PAID') {
                const draft = await tx.draft.findFirst({ where: { orderId }, orderBy: { updatedAt: 'desc' } });
                if (draft) {
                    const o = order;
                    const ordSub = Number(o.subtotal || 0);
                    const ordTax = Number(o.tax || 0);
                    const ordDisc = Number(o.discount || 0);
                    const ordTotal = Number(o.total || 0);
                    const dSub = draft.subtotal != null ? Number(draft.subtotal) : null;
                    const dTax = draft.tax != null ? Number(draft.tax) : null;
                    const dDisc = draft.discount != null ? Number(draft.discount) : null;
                    const dTotal = draft.total != null ? Number(draft.total) : null;
                    const sub = ordSub > 0 ? ordSub : (dSub ?? ordSub);
                    const tax = ordTax > 0 ? ordTax : (dTax ?? ordTax);
                    const disc = ordDisc > 0 ? ordDisc : (dDisc ?? ordDisc);
                    let finalTotal = ordTotal;
                    if ((sub !== ordSub) || (tax !== ordTax) || (disc !== ordDisc) || (ordTotal === 0 && dTotal != null)) {
                        finalTotal = sub + tax - disc;
                    }
                    data.subtotal = String(sub);
                    data.tax = String(tax);
                    data.discount = String(disc);
                    data.total = String(finalTotal);
                    if (!o.serviceType && draft.serviceType)
                        data.serviceType = draft.serviceType;
                    let waiterName = o.waiterName;
                    let waiterId = o.waiterId;
                    if (!waiterId && draft.waiterId)
                        waiterId = draft.waiterId;
                    if ((!waiterName || !waiterName.trim()) && waiterId) {
                        try {
                            const w = await tx.user.findUnique({ where: { id: waiterId }, select: { username: true, firstName: true, surname: true } });
                            if (w)
                                waiterName = (w.firstName || w.surname) ? `${w.firstName || ''} ${w.surname || ''}`.trim() : (w.username || null);
                        }
                        catch { }
                    }
                    if (waiterId)
                        data.waiterId = waiterId;
                    if (waiterName)
                        data.waiterName = waiterName;
                }
            }
            return tx.order.update({ where: { id: orderId }, data });
        });
    }
    async refund(orderId) {
        return this.prisma.$transaction(async (tx) => {
            const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
            if (!order)
                throw new common_1.BadRequestException('Order not found');
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
                }
                else {
                    const inv = await tx.inventory.upsert({
                        where: { productId_branchId: { productId: it.productId, branchId: order.branchId } },
                        update: {},
                        create: { productId: it.productId, branchId: order.branchId, qtyOnHand: 0 },
                    });
                    await tx.inventory.update({
                        where: { productId_branchId: { productId: it.productId, branchId: order.branchId } },
                        data: { qtyOnHand: inv.qtyOnHand + it.qty },
                    });
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
            const amount = Math.abs(Number(order.total || 0));
            if (amount > 0) {
                await tx.salesReturn.create({ data: { orderId, amount: String(amount) } });
            }
            return tx.order.update({ where: { id: orderId }, data: { status: 'REFUNDED' } });
        });
    }
    async addPayment(orderId, dto) {
        if (!dto?.method || !dto?.amount)
            throw new common_1.BadRequestException('Payment method and amount are required');
        return this.prisma.$transaction(async (tx) => {
            const order = await tx.order.findUnique({ where: { id: orderId } });
            if (!order)
                throw new common_1.BadRequestException('Order not found');
            await tx.payment.create({
                data: {
                    orderId,
                    method: dto.method,
                    amount: dto.amount,
                    reference: dto.reference || null,
                },
            });
            return tx.order.findUnique({ where: { id: orderId }, include: { payments: true, items: true } });
        });
    }
    async refundItems(orderId, items) {
        if (!Array.isArray(items) || items.length === 0)
            throw new common_1.BadRequestException('No items to refund');
        return this.prisma.$transaction(async (tx) => {
            const orig = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
            if (!orig)
                throw new common_1.BadRequestException('Order not found');
            const byProduct = {};
            for (const it of orig.items) {
                byProduct[it.productId] = { soldQty: Number(it.qty || 0), price: Number(it.price || 0) };
            }
            const clean = [];
            for (const r of items) {
                const pid = String(r.productId || '');
                const qty = Math.max(0, Number(r.qty || 0));
                const meta = byProduct[pid];
                if (!pid || !qty || !meta)
                    continue;
                const allowed = Math.min(qty, Math.abs(meta.soldQty));
                if (allowed <= 0)
                    continue;
                clean.push({ productId: pid, qty: allowed, price: meta.price });
            }
            if (clean.length === 0)
                throw new common_1.BadRequestException('No valid items to refund');
            const updated = await tx.branch.update({
                where: { id: orig.branchId },
                data: { nextOrderSeq: { increment: 1 } },
                select: { nextOrderSeq: true },
            });
            const orderNumber = updated.nextOrderSeq;
            const returnOrder = await tx.order.create({
                data: {
                    branchId: orig.branchId,
                    sectionId: orig.sectionId,
                    userId: orig.userId,
                    status: 'REFUNDED',
                    total: '0',
                    orderNumber,
                    tableId: null,
                },
            });
            let negTotal = 0;
            for (const it of clean) {
                await tx.orderItem.create({
                    data: {
                        orderId: returnOrder.id,
                        productId: it.productId,
                        qty: -Math.abs(it.qty),
                        price: String(it.price),
                    },
                });
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
                }
                else {
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
            await tx.order.update({ where: { id: returnOrder.id }, data: { total: String(negTotal) } });
            const refundAmt = Math.abs(Number(negTotal || 0));
            if (refundAmt > 0) {
                await tx.salesReturn.create({ data: { orderId, amount: String(refundAmt) } });
            }
            return tx.order.findUnique({ where: { id: returnOrder.id }, include: { items: true } });
        });
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], OrdersService);
//# sourceMappingURL=orders.service.js.map