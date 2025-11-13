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
exports.InventoryService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let InventoryService = class InventoryService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async listByBranch(branchId) {
        return this.prisma.inventory.findMany({
            where: { branchId },
            include: { product: true },
            orderBy: { product: { name: 'asc' } },
        });
    }
    async releaseReservationsAll(branchId, user) {
        if (!user?.id)
            throw new common_1.BadRequestException('user required');
        const whereBranch = branchId ? { branchId } : {};
        const rows = await this.prisma.stockMovement.findMany({
            where: {
                ...whereBranch,
                reason: 'ADJUST',
                referenceId: { contains: `|${user.id}|` },
            },
            select: { productId: true, delta: true, referenceId: true, sectionFrom: true, sectionTo: true, branchId: true },
            orderBy: { createdAt: 'asc' },
        });
        const outstanding = {};
        for (const r of rows) {
            const ref = String(r.referenceId || '');
            if (!ref.includes('|RESV|'))
                continue;
            const sec = r.sectionFrom || r.sectionTo || null;
            if (!sec)
                continue;
            const pid = r.productId;
            const d = Number(r.delta || 0);
            outstanding[sec] = outstanding[sec] || {};
            outstanding[sec][pid] = (outstanding[sec][pid] || 0) + d;
        }
        const sections = Object.keys(outstanding);
        if (sections.length === 0)
            return { restored: [] };
        const restoredAll = [];
        for (const sectionId of sections) {
            const entries = outstanding[sectionId];
            const toRestore = Object.entries(entries)
                .map(([pid, sum]) => ({ productId: pid, qty: -Math.min(0, Number(sum)) }))
                .filter(it => it.qty > 0);
            if (!toRestore.length)
                continue;
            const section = await this.prisma.section.findUnique({ where: { id: sectionId }, select: { id: true, branchId: true } });
            if (!section)
                continue;
            await this.prisma.$transaction(async (tx) => {
                for (const it of toRestore) {
                    const inv = await tx.sectionInventory.upsert({ where: { productId_sectionId: { productId: it.productId, sectionId } }, update: {}, create: { productId: it.productId, sectionId, qtyOnHand: 0 } });
                    await tx.sectionInventory.update({ where: { productId_sectionId: { productId: it.productId, sectionId } }, data: { qtyOnHand: inv.qtyOnHand + it.qty } });
                    await tx.stockMovement.create({ data: { productId: it.productId, branchId: section.branchId, sectionFrom: null, sectionTo: sectionId, delta: it.qty, reason: 'ADJUST', referenceId: `ADJ|${inv.qtyOnHand}|${inv.qtyOnHand + it.qty}|${user?.id || ''}|${user?.name || ''}|RESV_RELEASE_ALL` } });
                    restoredAll.push({ sectionId, productId: it.productId, qty: it.qty });
                }
            });
        }
        return { restored: restoredAll };
    }
    async listTransfers(branchId, limit = 100) {
        if (!branchId)
            throw new common_1.BadRequestException('branchId required');
        const [movesAll, sections] = await Promise.all([
            this.prisma.stockMovement.findMany({
                where: { branchId },
                orderBy: { createdAt: 'desc' },
                take: Math.min(Math.max(Number(limit) || 100, 1), 500),
            }),
            this.prisma.section.findMany({ where: { branchId }, select: { id: true, name: true } }),
        ]);
        const moves = (movesAll || []).filter((m) => String(m.reason).toUpperCase() === 'TRANSFER');
        const nameBySection = Object.fromEntries((sections || []).map(s => [s.id, s.name]));
        const bucket = (d) => {
            try {
                const t = new Date(d).getTime();
                return Math.floor(t / 1000);
            }
            catch {
                return 0;
            }
        };
        const pairs = new Map();
        for (const m of moves) {
            let metaUserName;
            const ref = String(m.referenceId || '');
            if (ref.startsWith('XFER|')) {
                const parts = ref.split('|');
                if (parts.length >= 3)
                    metaUserName = parts[2] || undefined;
            }
            const keyRoot = `${m.productId}:${bucket(m.createdAt)}`;
            if (m.sectionFrom && (!m.sectionTo || m.delta < 0)) {
                const key = `${keyRoot}:${m.sectionFrom}:>`;
                const t = pairs.get(key) || { id: key, fromSection: m.sectionFrom, toSection: null, createdAt: m.createdAt, items: [] };
                t.fromSection = m.sectionFrom;
                t.createdAt = t.createdAt || m.createdAt;
                t.items.push({ productId: m.productId, qty: Math.abs(Number(m.delta || 0)) });
                if (metaUserName)
                    t.userName = metaUserName;
                pairs.set(key, t);
            }
            else if (m.sectionTo && (!m.sectionFrom || m.delta > 0)) {
                const key = `${keyRoot}:>:${m.sectionTo}`;
                const t = pairs.get(key) || { id: key, fromSection: null, toSection: m.sectionTo, createdAt: m.createdAt, items: [] };
                t.toSection = m.sectionTo;
                t.createdAt = t.createdAt || m.createdAt;
                t.items.push({ productId: m.productId, qty: Math.abs(Number(m.delta || 0)) });
                if (metaUserName)
                    t.userName = metaUserName;
                pairs.set(key, t);
            }
        }
        const outByProdTime = new Map();
        const inByProdTime = new Map();
        for (const t of pairs.values()) {
            const time = bucket(t.createdAt);
            const key = `${time}`;
            if (t.fromSection && !t.toSection) {
                const arr = outByProdTime.get(key) || [];
                arr.push(t);
                outByProdTime.set(key, arr);
            }
            if (t.toSection && !t.fromSection) {
                const arr = inByProdTime.get(key) || [];
                arr.push(t);
                inByProdTime.set(key, arr);
            }
        }
        const results = [];
        for (const [timeKey, outs] of outByProdTime.entries()) {
            const ins = inByProdTime.get(timeKey) || [];
            const max = Math.max(outs.length, ins.length);
            for (let i = 0; i < max; i++) {
                const o = outs[i];
                const inn = ins[i];
                if (o && inn) {
                    const outByProd = {};
                    const inByProd = {};
                    for (const it of (o.items || []))
                        outByProd[it.productId] = (outByProd[it.productId] || 0) + Number(it.qty || 0);
                    for (const it of (inn.items || []))
                        inByProd[it.productId] = (inByProd[it.productId] || 0) + Number(it.qty || 0);
                    const allProdIds = Array.from(new Set([...Object.keys(outByProd), ...Object.keys(inByProd)]));
                    const items = allProdIds.map((productId) => ({
                        productId,
                        qty: Math.max(outByProd[productId] || 0, inByProd[productId] || 0),
                    }));
                    results.push({
                        id: `${timeKey}:${i}`,
                        fromSection: o.fromSection || null,
                        toSection: inn.toSection || null,
                        fromSectionName: o.fromSection ? (nameBySection[o.fromSection] || o.fromSection) : undefined,
                        toSectionName: inn.toSection ? (nameBySection[inn.toSection] || inn.toSection) : undefined,
                        createdAt: o.createdAt || inn.createdAt,
                        items,
                        userName: o.userName || inn.userName,
                    });
                }
                else if (o) {
                    results.push({ id: `${timeKey}:${i}`, fromSection: o.fromSection || null, toSection: null, fromSectionName: o.fromSection ? (nameBySection[o.fromSection] || o.fromSection) : undefined, toSectionName: undefined, createdAt: o.createdAt, items: o.items, userName: o.userName });
                }
                else if (inn) {
                    results.push({ id: `${timeKey}:${i}`, fromSection: null, toSection: inn.toSection || null, fromSectionName: undefined, toSectionName: inn.toSection ? (nameBySection[inn.toSection] || inn.toSection) : undefined, createdAt: inn.createdAt, items: inn.items, userName: inn.userName });
                }
            }
        }
        results.sort((a, b) => (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        const allProductIds = Array.from(new Set(results.flatMap(r => r.items.map(it => it.productId))));
        const products = allProductIds.length ? await this.prisma.product.findMany({ where: { id: { in: allProductIds } }, select: { id: true, name: true } }) : [];
        const prodName = Object.fromEntries(products.map(p => [p.id, p.name]));
        return results.map(r => ({
            ...r,
            items: r.items.map(it => ({ ...it, productName: prodName[it.productId] || it.productId })),
        }));
    }
    async listBySection(sectionId) {
        if (!sectionId)
            throw new common_1.BadRequestException('sectionId required');
        const section = await this.prisma.section.findUnique({ where: { id: sectionId }, select: { id: true, branchId: true, name: true } });
        if (!section)
            throw new common_1.NotFoundException('Section not found');
        const secRows = await this.prisma.sectionInventory.findMany({
            where: { sectionId },
            include: { product: true, section: true },
            orderBy: { product: { name: 'asc' } },
        });
        return secRows;
    }
    async listMovements(branchId, limit = 100) {
        return this.prisma.stockMovement.findMany({
            where: { branchId },
            orderBy: { createdAt: 'desc' },
            take: Math.min(Math.max(Number(limit) || 100, 1), 500),
        });
    }
    async listAdjustments(branchId, limit = 100) {
        const rows = await this.prisma.stockMovement.findMany({
            where: { branchId },
            orderBy: { createdAt: 'desc' },
            take: Math.min(Math.max(Number(limit) || 100, 1), 500),
        });
        const adj = (rows || []).filter((m) => String(m.reason).toUpperCase().startsWith('ADJUST'));
        if (adj.length === 0)
            return adj;
        const parsedMeta = adj.map((r) => {
            const meta = {};
            const ref = String(r.referenceId || '');
            if (ref.startsWith('ADJ|')) {
                const parts = ref.split('|');
                if (parts.length >= 5) {
                    const prev = Number(parts[1]);
                    const next = Number(parts[2]);
                    const uId = parts[3] || undefined;
                    let uName;
                    let reasonText;
                    if (parts.length >= 6) {
                        uName = parts[4] || undefined;
                        reasonText = parts.slice(5).join('|') || undefined;
                    }
                    else {
                        reasonText = parts.slice(4).join('|') || undefined;
                    }
                    meta.previousStock = isNaN(prev) ? undefined : prev;
                    meta.newStock = isNaN(next) ? undefined : next;
                    meta.userId = uId;
                    meta.userName = uName;
                    meta.reasonText = reasonText;
                }
            }
            return meta;
        });
        const productIds = Array.from(new Set(adj.map((r) => r.productId).filter(Boolean)));
        const sectionIds = Array.from(new Set(adj.flatMap((r) => [r.sectionFrom, r.sectionTo]).filter(Boolean)));
        const userIds = Array.from(new Set(parsedMeta.map((m) => m.userId).filter(Boolean)));
        const [products, sections, users] = await Promise.all([
            productIds.length ? this.prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true } }) : Promise.resolve([]),
            sectionIds.length ? this.prisma.section.findMany({ where: { id: { in: sectionIds } }, select: { id: true, name: true } }) : Promise.resolve([]),
            userIds.length && this.prisma.user ? this.prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, username: true, firstName: true, surname: true } }) : Promise.resolve([]),
        ]);
        const prodName = Object.fromEntries(products.map((p) => [p.id, p.name]));
        const secName = Object.fromEntries(sections.map((s) => [s.id, s.name]));
        const userName = Object.fromEntries(users.map((u) => [u.id, (u.firstName && u.surname) ? `${u.firstName} ${u.surname}` : (u.username || u.id)]));
        return adj.map((r, idx) => {
            const meta = parsedMeta[idx] || {};
            const toSection = r.delta > 0 ? r.sectionTo : null;
            const fromSection = r.delta < 0 ? r.sectionFrom : null;
            const sectionResolved = toSection || fromSection || null;
            return {
                ...r,
                productName: prodName[r.productId] || r.productId,
                sectionName: sectionResolved ? (secName[sectionResolved] || sectionResolved) : null,
                userName: meta.userName || (meta.userId ? (userName[meta.userId] || meta.userId) : undefined),
                previousStock: meta.previousStock,
                newStock: meta.newStock,
                reason: meta.reasonText || r.reason,
            };
        });
    }
    async aggregateByBranch(branchId) {
        const sections = await this.prisma.section.findMany({ where: { branchId }, select: { id: true, name: true } });
        const sectionIds = sections.map((s) => s.id);
        if (sectionIds.length === 0)
            return [];
        const nameById = Object.fromEntries(sections.map(s => [s.id, s.name]));
        const rows = await this.prisma.sectionInventory.findMany({
            where: { sectionId: { in: sectionIds } },
            select: { productId: true, sectionId: true, qtyOnHand: true },
        });
        const byProduct = {};
        for (const r of rows) {
            const entry = (byProduct[r.productId] ||= { productId: r.productId, total: 0, perSection: {} });
            const secName = nameById[r.sectionId] || r.sectionId;
            entry.total += Number(r.qtyOnHand || 0);
            entry.perSection[secName] = (entry.perSection[secName] || 0) + Number(r.qtyOnHand || 0);
        }
        const branchInv = await this.prisma.inventory.findMany({
            where: { branchId },
            select: { productId: true, qtyOnHand: true },
        });
        for (const r of branchInv) {
            const entry = (byProduct[r.productId] ||= { productId: r.productId, total: 0, perSection: {} });
            const qty = Number(r.qtyOnHand || 0);
            entry.total += qty;
            entry.perSection['Branch'] = (entry.perSection['Branch'] || 0) + qty;
        }
        return Object.values(byProduct);
    }
    async adjust(productId, branchId, dto, role, userId) {
        const inv = await this.prisma.inventory.upsert({
            where: { productId_branchId: { productId, branchId } },
            update: {},
            create: { productId, branchId, qtyOnHand: 0 },
        });
        const deltaNum = Math.trunc(Number(dto?.delta) || 0);
        const prevQty = inv.qtyOnHand;
        const newQtyCandidate = prevQty + deltaNum;
        let allowOverselling = false;
        try {
            const s = await this.prisma.setting.findFirst({ where: { branchId }, select: { allowOverselling: true } });
            allowOverselling = !!s?.allowOverselling;
        }
        catch { }
        const newQty = newQtyCandidate < 0 && allowOverselling ? newQtyCandidate : Math.max(newQtyCandidate, 0);
        if (newQtyCandidate < 0 && !allowOverselling)
            throw new common_1.NotFoundException('Insufficient stock');
        const updated = await this.prisma.inventory.update({
            where: { productId_branchId: { productId, branchId } },
            data: { qtyOnHand: { increment: deltaNum } },
        });
        const userNameSafe = dto?.__userName;
        const dataBranch = {
            productId,
            branchId,
            sectionFrom: dto.delta < 0 ? null : null,
            sectionTo: dto.delta > 0 ? null : null,
            delta: deltaNum,
            reason: 'ADJUST',
            referenceId: `ADJ|${prevQty}|${updated.qtyOnHand}|${userId || ''}|${userNameSafe || ''}|${dto.reason || ''}`,
        };
        await this.prisma.stockMovement.create({ data: dataBranch });
        return updated;
    }
    async adjustInSection(productId, sectionId, dto, role, userId) {
        const section = await this.prisma.section.findUnique({ where: { id: sectionId } });
        if (!section)
            throw new common_1.NotFoundException('Section not found');
        const inv = await this.prisma.sectionInventory.upsert({
            where: { productId_sectionId: { productId, sectionId } },
            update: {},
            create: { productId, sectionId, qtyOnHand: 0 },
        });
        const deltaNum = Math.trunc(Number(dto?.delta) || 0);
        const newQtyCandidate = inv.qtyOnHand + deltaNum;
        let allowOverselling = false;
        try {
            const s = await this.prisma.setting.findFirst({ where: { branchId: section?.branchId || undefined }, select: { allowOverselling: true } });
            allowOverselling = !!s?.allowOverselling;
        }
        catch { }
        const newQty = newQtyCandidate < 0 && allowOverselling ? newQtyCandidate : Math.max(newQtyCandidate, 0);
        if (newQtyCandidate < 0 && !allowOverselling)
            throw new common_1.NotFoundException('Insufficient stock');
        const updated = await this.prisma.sectionInventory.update({
            where: { productId_sectionId: { productId, sectionId } },
            data: { qtyOnHand: newQty },
        });
        const userNameSafe2 = dto?.__userName;
        const resv = dto?.reason && String(dto.reason).startsWith('RESV|') ? String(dto.reason) : '';
        const dataSection = {
            productId,
            branchId: section?.branchId || '',
            sectionFrom: deltaNum < 0 ? sectionId : null,
            sectionTo: deltaNum > 0 ? sectionId : null,
            delta: deltaNum,
            reason: 'ADJUST',
            referenceId: `ADJ|${inv.qtyOnHand}|${newQty}|${userId || ''}|${userNameSafe2 || ''}|${dto.reason || ''}${resv ? `|RESV|${resv.slice(5)}` : ''}`,
        };
        await this.prisma.stockMovement.create({ data: dataSection });
        return updated;
    }
    async transfer(fromSectionId, toSectionId, items, role, user) {
        if (!fromSectionId || !toSectionId || fromSectionId === toSectionId)
            throw new common_1.BadRequestException('Invalid sections');
        if (!Array.isArray(items) || items.length === 0)
            throw new common_1.BadRequestException('No items to transfer');
        const [from, to] = await Promise.all([
            this.prisma.section.findUnique({ where: { id: fromSectionId } }),
            this.prisma.section.findUnique({ where: { id: toSectionId } }),
        ]);
        if (!from || !to)
            throw new common_1.NotFoundException('Section not found');
        return this.prisma.$transaction(async (tx) => {
            for (const it of items) {
                const inv = await tx.sectionInventory.findUnique({
                    where: { productId_sectionId: { productId: it.productId, sectionId: fromSectionId } },
                });
                const available = inv?.qtyOnHand || 0;
                if (available < (it.qty || 0))
                    throw new common_1.NotFoundException(`Insufficient stock for product ${it.productId} in source section`);
            }
            for (const it of items) {
                const qty = Math.max(0, Math.floor(it.qty || 0));
                if (qty === 0)
                    continue;
                const src = await tx.sectionInventory.upsert({
                    where: { productId_sectionId: { productId: it.productId, sectionId: fromSectionId } },
                    update: {},
                    create: { productId: it.productId, sectionId: fromSectionId, qtyOnHand: 0 },
                });
                if (src.qtyOnHand < qty)
                    throw new common_1.NotFoundException(`Insufficient stock for product ${it.productId}`);
                await tx.sectionInventory.update({
                    where: { productId_sectionId: { productId: it.productId, sectionId: fromSectionId } },
                    data: { qtyOnHand: src.qtyOnHand - qty },
                });
                const fromSec = await tx.section.findUnique({ where: { id: fromSectionId } });
                await tx.stockMovement.create({
                    data: {
                        productId: it.productId,
                        branchId: fromSec?.branchId || '',
                        sectionFrom: fromSectionId,
                        sectionTo: null,
                        delta: -qty,
                        reason: 'TRANSFER',
                        referenceId: `XFER|${user?.id || ''}|${user?.name || ''}`,
                    },
                });
                const dest = await tx.sectionInventory.upsert({
                    where: { productId_sectionId: { productId: it.productId, sectionId: toSectionId } },
                    update: {},
                    create: { productId: it.productId, sectionId: toSectionId, qtyOnHand: 0 },
                });
                await tx.sectionInventory.update({
                    where: { productId_sectionId: { productId: it.productId, sectionId: toSectionId } },
                    data: { qtyOnHand: dest.qtyOnHand + qty },
                });
                const toSec = await tx.section.findUnique({ where: { id: toSectionId } });
                await tx.stockMovement.create({
                    data: {
                        productId: it.productId,
                        branchId: toSec?.branchId || '',
                        sectionFrom: null,
                        sectionTo: toSectionId,
                        delta: qty,
                        reason: 'TRANSFER',
                        referenceId: `XFER|${user?.id || ''}|${user?.name || ''}`,
                    },
                });
            }
            return { status: 'ok' };
        });
    }
    async releaseReservations(sectionId, reservationKey, user) {
        if (!sectionId)
            throw new common_1.BadRequestException('sectionId is required');
        const section = await this.prisma.section.findUnique({ where: { id: sectionId }, select: { id: true, branchId: true } });
        if (!section)
            throw new common_1.NotFoundException('Section not found');
        const rows = await this.prisma.stockMovement.findMany({
            where: {
                branchId: section.branchId,
                reason: 'ADJUST',
            },
            select: { productId: true, delta: true, referenceId: true, sectionFrom: true, sectionTo: true },
            orderBy: { createdAt: 'asc' },
        });
        const bySection = {};
        for (const r of rows) {
            const ref = String(r.referenceId || '');
            if (reservationKey) {
                const key = `|RESV|${reservationKey}`;
                if (!ref.includes(key))
                    continue;
            }
            else if (user?.id) {
                const uid = String(user.id);
                if (!ref.includes(`|${uid}|`))
                    continue;
            }
            else {
                continue;
            }
            const sec = r.sectionFrom || r.sectionTo || null;
            if (!sec)
                continue;
            const d = Number(r.delta || 0);
            if (!bySection[sec])
                bySection[sec] = {};
            bySection[sec][r.productId] = (bySection[sec][r.productId] || 0) + d;
        }
        const restores = [];
        Object.entries(bySection).forEach(([sec, map]) => {
            Object.entries(map).forEach(([pid, sum]) => {
                const qty = -Math.min(0, Number(sum));
                if (qty > 0)
                    restores.push({ sectionId: sec, productId: pid, qty });
            });
        });
        if (restores.length === 0)
            return { restored: [] };
        const restored = [];
        await this.prisma.$transaction(async (tx) => {
            for (const r of restores) {
                const sec = await tx.section.findUnique({ where: { id: r.sectionId }, select: { id: true, branchId: true } });
                if (!sec)
                    continue;
                const inv = await tx.sectionInventory.upsert({ where: { productId_sectionId: { productId: r.productId, sectionId: r.sectionId } }, update: {}, create: { productId: r.productId, sectionId: r.sectionId, qtyOnHand: 0 } });
                await tx.sectionInventory.update({ where: { productId_sectionId: { productId: r.productId, sectionId: r.sectionId } }, data: { qtyOnHand: inv.qtyOnHand + r.qty } });
                await tx.stockMovement.create({ data: { productId: r.productId, branchId: sec.branchId, sectionFrom: null, sectionTo: r.sectionId, delta: r.qty, reason: 'ADJUST', referenceId: `ADJ|${inv.qtyOnHand}|${inv.qtyOnHand + r.qty}|${user?.id || ''}|${user?.name || ''}|RESV_RELEASE${reservationKey ? `|RESV|${reservationKey}` : ''}` } });
                restored.push(r);
            }
        });
        return { restored };
    }
};
exports.InventoryService = InventoryService;
exports.InventoryService = InventoryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], InventoryService);
//# sourceMappingURL=inventory.service.js.map