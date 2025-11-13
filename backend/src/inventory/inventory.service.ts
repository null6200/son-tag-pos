import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface AdjustStockDto {
  delta: number; // positive to add, negative to remove
}

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async listByBranch(branchId: string) {
    return this.prisma.inventory.findMany({
      where: { branchId },
      include: { product: true },
      orderBy: { product: { name: 'asc' } },
    });
  }

  async releaseReservationsAll(
    branchId: string | undefined,
    user?: { id?: string; name?: string },
  ) {
    if (!user?.id) throw new BadRequestException('user required');
    const whereBranch: any = branchId ? { branchId } : {};
    const rows = await this.prisma.stockMovement.findMany({
      where: {
        ...whereBranch,
        reason: 'ADJUST',
        referenceId: { contains: `|${user.id}|` },
      },
      select: { productId: true, delta: true, referenceId: true, sectionFrom: true, sectionTo: true, branchId: true },
      orderBy: { createdAt: 'asc' },
    });
    // Compute net outstanding per sectionFrom/product considering both OUT and IN
    const outstanding: Record<string, Record<string, number>> = {};
    for (const r of rows) {
      const ref = String(r.referenceId || '');
      if (!ref.includes('|RESV|')) continue; // only reservation-tagged movements
      const sec = r.sectionFrom || r.sectionTo || null;
      if (!sec) continue;
      const pid = r.productId;
      const d = Number(r.delta || 0);
      outstanding[sec] = outstanding[sec] || {};
      outstanding[sec][pid] = (outstanding[sec][pid] || 0) + d;
    }
    const sections = Object.keys(outstanding);
    if (sections.length === 0) return { restored: [] };
    const restoredAll: any[] = [];
    for (const sectionId of sections) {
      const entries = outstanding[sectionId];
      const toRestore = Object.entries(entries)
        .map(([pid, sum]) => ({ productId: pid, qty: -Math.min(0, Number(sum)) }))
        .filter(it => it.qty > 0);
      if (!toRestore.length) continue;
      const section = await this.prisma.section.findUnique({ where: { id: sectionId }, select: { id: true, branchId: true } });
      if (!section) continue;
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

  async listTransfers(branchId: string, limit = 100) {
    if (!branchId) throw new BadRequestException('branchId required');
    // Load recent TRANSFER movements
    const [movesAll, sections] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where: { branchId },
        orderBy: { createdAt: 'desc' },
        take: Math.min(Math.max(Number(limit) || 100, 1), 500),
      }),
      this.prisma.section.findMany({ where: { branchId }, select: { id: true, name: true } }),
    ]);
    const moves = (movesAll || []).filter((m: any) => String(m.reason).toUpperCase() === 'TRANSFER');
    const nameBySection: Record<string, string> = Object.fromEntries((sections || []).map(s => [s.id, s.name]));
    // Pair OUT and IN per product and timestamp bucket
    const bucket = (d: Date | string | null) => {
      try { const t = new Date(d as any).getTime(); return Math.floor(t / 1000); } catch { return 0; }
    };
    type Item = { productId: string; qty: number };
    type Transfer = { id: string; fromSection?: string | null; toSection?: string | null; fromSectionName?: string; toSectionName?: string; createdAt: Date; items: Item[]; userName?: string };
    const pairs = new Map<string, Transfer>();
    for (const m of moves) {
      // Parse user metadata from referenceId if present: XFER|userId|userName
      let metaUserName: string | undefined;
      const ref = String((m as any).referenceId || '');
      if (ref.startsWith('XFER|')) {
        const parts = ref.split('|');
        if (parts.length >= 3) metaUserName = parts[2] || undefined;
      }
      const keyRoot = `${m.productId}:${bucket(m.createdAt)}`;
      if (m.sectionFrom && (!m.sectionTo || m.delta < 0)) {
        const key = `${keyRoot}:${m.sectionFrom}:>`;
        const t: Transfer = pairs.get(key) || { id: key, fromSection: m.sectionFrom, toSection: null, createdAt: m.createdAt as any, items: [] as Item[] };
        t.fromSection = m.sectionFrom;
        t.createdAt = t.createdAt || (m.createdAt as any);
        t.items.push({ productId: m.productId, qty: Math.abs(Number(m.delta || 0)) });
        if (metaUserName) t.userName = metaUserName;
        pairs.set(key, t);
      } else if (m.sectionTo && (!m.sectionFrom || m.delta > 0)) {
        const key = `${keyRoot}:>:${m.sectionTo}`;
        const t: Transfer = pairs.get(key) || { id: key, fromSection: null, toSection: m.sectionTo, createdAt: m.createdAt as any, items: [] as Item[] };
        t.toSection = m.sectionTo;
        t.createdAt = t.createdAt || (m.createdAt as any);
        t.items.push({ productId: m.productId, qty: Math.abs(Number(m.delta || 0)) });
        if (metaUserName) t.userName = metaUserName;
        pairs.set(key, t);
      }
    }
    // Merge likely matching from/to buckets by product+time
    const outByProdTime = new Map<string, Transfer[]>();
    const inByProdTime = new Map<string, Transfer[]>();
    for (const t of pairs.values()) {
      const time = bucket(t.createdAt as any);
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
    const results: Transfer[] = [];
    for (const [timeKey, outs] of outByProdTime.entries()) {
      const ins = inByProdTime.get(timeKey) || [];
      // Greedy pair by index (since transfer() records OUT then IN per item)
      const max = Math.max(outs.length, ins.length);
      for (let i = 0; i < max; i++) {
        const o = outs[i];
        const inn = ins[i];
        if (o && inn) {
          // Aggregate by productId without doubling: take max(outTotal, inTotal)
          const outByProd: Record<string, number> = {};
          const inByProd: Record<string, number> = {};
          for (const it of (o.items || [])) outByProd[it.productId] = (outByProd[it.productId] || 0) + Number(it.qty || 0);
          for (const it of (inn.items || [])) inByProd[it.productId] = (inByProd[it.productId] || 0) + Number(it.qty || 0);
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
            createdAt: (o.createdAt as any) || (inn.createdAt as any),
            items,
            userName: o.userName || inn.userName,
          });
        } else if (o) {
          results.push({ id: `${timeKey}:${i}`, fromSection: o.fromSection || null, toSection: null, fromSectionName: o.fromSection ? (nameBySection[o.fromSection] || o.fromSection) : undefined, toSectionName: undefined, createdAt: o.createdAt as any, items: o.items, userName: o.userName });
        } else if (inn) {
          results.push({ id: `${timeKey}:${i}`, fromSection: null, toSection: inn.toSection || null, fromSectionName: undefined, toSectionName: inn.toSection ? (nameBySection[inn.toSection] || inn.toSection) : undefined, createdAt: inn.createdAt as any, items: inn.items, userName: inn.userName });
        }
      }
    }
    // Sort desc by createdAt
    results.sort((a, b) => (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
    // Attach product names
    const allProductIds = Array.from(new Set(results.flatMap(r => r.items.map(it => it.productId))));
    const products = allProductIds.length ? await this.prisma.product.findMany({ where: { id: { in: allProductIds } }, select: { id: true, name: true } }) : [];
    const prodName = Object.fromEntries(products.map(p => [p.id, p.name]));
    return results.map(r => ({
      ...r,
      items: r.items.map(it => ({ ...it, productName: prodName[it.productId] || it.productId })),
    }));
  }

  async listBySection(sectionId: string) {
    if (!sectionId) throw new BadRequestException('sectionId required');
    // Resolve section to obtain branchId
    const section = await this.prisma.section.findUnique({ where: { id: sectionId }, select: { id: true, branchId: true, name: true } });
    if (!section) throw new NotFoundException('Section not found');

    // Fetch strictly the section's own inventory only
    const secRows = await this.prisma.sectionInventory.findMany({
      where: { sectionId },
      include: { product: true, section: true },
      orderBy: { product: { name: 'asc' } },
    });

    // Return as-is, preserving only this section's quantities
    return secRows;
  }

  async listMovements(branchId: string, limit = 100) {
    return this.prisma.stockMovement.findMany({
      where: { branchId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(Number(limit) || 100, 1), 500),
    });
  }

  async listAdjustments(branchId: string, limit = 100) {
    const rows = await this.prisma.stockMovement.findMany({
      where: { branchId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(Number(limit) || 100, 1), 500),
    });
    const adj = (rows || []).filter((m: any) => String(m.reason).toUpperCase().startsWith('ADJUST')) as any[];
    if (adj.length === 0) return adj;
    // Parse referenceId pattern (new): ADJ|prev|next|userId|userName|reasonText
    // Backward compatible with old format: ADJ|prev|next|userId|reasonText
    const parsedMeta = adj.map((r: any) => {
      const meta: any = {};
      const ref = String(r.referenceId || '');
      if (ref.startsWith('ADJ|')) {
        const parts = ref.split('|');
        if (parts.length >= 5) {
          const prev = Number(parts[1]);
          const next = Number(parts[2]);
          const uId = parts[3] || undefined;
          let uName: string | undefined;
          let reasonText: string | undefined;
          if (parts.length >= 6) {
            uName = parts[4] || undefined;
            reasonText = parts.slice(5).join('|') || undefined;
          } else {
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
    // Collect lookups
    const productIds = Array.from(new Set(adj.map((r: any) => r.productId).filter(Boolean)));
    const sectionIds = Array.from(new Set(adj.flatMap((r: any) => [r.sectionFrom, r.sectionTo]).filter(Boolean)));
    const userIds = Array.from(new Set(parsedMeta.map((m: any) => m.userId).filter(Boolean)));
    const [products, sections, users] = await Promise.all([
      productIds.length ? this.prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true } }) : Promise.resolve([]),
      sectionIds.length ? this.prisma.section.findMany({ where: { id: { in: sectionIds } }, select: { id: true, name: true } }) : Promise.resolve([]),
      userIds.length && (this.prisma as any).user ? (this.prisma as any).user.findMany({ where: { id: { in: userIds } }, select: { id: true, username: true, firstName: true, surname: true } }) : Promise.resolve([]),
    ]);
    const prodName = Object.fromEntries((products as any[]).map((p: any) => [p.id, p.name]));
    const secName = Object.fromEntries((sections as any[]).map((s: any) => [s.id, s.name]));
    const userName = Object.fromEntries((users as any[]).map((u: any) => [u.id, (u.firstName && u.surname) ? `${u.firstName} ${u.surname}` : (u.username || u.id)]));
    return adj.map((r: any, idx: number) => {
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

  async aggregateByBranch(branchId: string) {
    // Get sections for branch
    const sections = await this.prisma.section.findMany({ where: { branchId }, select: { id: true, name: true } });
    const sectionIds = sections.map((s) => s.id);
    if (sectionIds.length === 0) return [];
    const nameById = Object.fromEntries(sections.map(s => [s.id, s.name]));

    const rows = await this.prisma.sectionInventory.findMany({
      where: { sectionId: { in: sectionIds } },
      select: { productId: true, sectionId: true, qtyOnHand: true },
    });

    const byProduct: Record<string, { productId: string; total: number; perSection: Record<string, number> }> = {};
    for (const r of rows) {
      const entry = (byProduct[r.productId] ||= { productId: r.productId, total: 0, perSection: {} });
      const secName = nameById[r.sectionId] || r.sectionId;
      entry.total += Number(r.qtyOnHand || 0);
      entry.perSection[secName] = (entry.perSection[secName] || 0) + Number(r.qtyOnHand || 0);
    }

    // Also include branch-level Inventory table as fallback (virtual section "Branch")
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

  async adjust(
    productId: string,
    branchId: string,
    dto: AdjustStockDto,
    role: string,
    userId?: string,
  ) {
    // Permission is enforced at controller via PermissionsGuard

    // Ensure inventory row exists
    const inv = await this.prisma.inventory.upsert({
      where: { productId_branchId: { productId, branchId } },
      update: {},
      create: { productId, branchId, qtyOnHand: 0 },
    });

    const deltaNum = Math.trunc(Number((dto as any)?.delta) || 0);
    const prevQty = inv.qtyOnHand;
    const newQtyCandidate = prevQty + deltaNum;
    // Check branch overselling setting
    let allowOverselling = false;
    try {
      const s = await this.prisma.setting.findFirst({ where: { branchId }, select: { allowOverselling: true } });
      allowOverselling = !!s?.allowOverselling;
    } catch {}
    const newQty = newQtyCandidate < 0 && allowOverselling ? newQtyCandidate : Math.max(newQtyCandidate, 0);
    if (newQtyCandidate < 0 && !allowOverselling) throw new NotFoundException('Insufficient stock');

    const updated = await this.prisma.inventory.update({
      where: { productId_branchId: { productId, branchId } },
      data: { qtyOnHand: { increment: deltaNum } },
    });
    // Movement: ADJUST at branch level
    const userNameSafe = (dto as any)?.__userName as (string|undefined);
    const dataBranch: any = {
      productId,
      branchId,
      sectionFrom: dto.delta < 0 ? null : null,
      sectionTo: dto.delta > 0 ? null : null,
      delta: deltaNum,
      reason: 'ADJUST',
      referenceId: `ADJ|${prevQty}|${updated.qtyOnHand}|${userId || ''}|${userNameSafe || ''}|${(dto as any).reason || ''}`,
    };
    await this.prisma.stockMovement.create({ data: dataBranch });
    return updated;
  }

  async adjustInSection(
    productId: string,
    sectionId: string,
    dto: AdjustStockDto,
    role: string,
    userId?: string,
  ) {
    // POS reservation/release: allow any authenticated role; permissions are enforced at controller level
    // Ensure section exists
    const section = await this.prisma.section.findUnique({ where: { id: sectionId } });
    if (!section) throw new NotFoundException('Section not found');
    const inv = await this.prisma.sectionInventory.upsert({
      where: { productId_sectionId: { productId, sectionId } },
      update: {},
      create: { productId, sectionId, qtyOnHand: 0 },
    });
    const deltaNum = Math.trunc(Number((dto as any)?.delta) || 0);
    const newQtyCandidate = inv.qtyOnHand + deltaNum;
    // Respect branch overselling setting
    let allowOverselling = false;
    try {
      const s = await this.prisma.setting.findFirst({ where: { branchId: section?.branchId || undefined }, select: { allowOverselling: true } });
      allowOverselling = !!s?.allowOverselling;
    } catch {}
    const newQty = newQtyCandidate < 0 && allowOverselling ? newQtyCandidate : Math.max(newQtyCandidate, 0);
    if (newQtyCandidate < 0 && !allowOverselling) throw new NotFoundException('Insufficient stock');
    const updated = await this.prisma.sectionInventory.update({
      where: { productId_sectionId: { productId, sectionId } },
      data: { qtyOnHand: newQty },
    });
    // Movement: ADJUST at section level
    const userNameSafe2 = (dto as any)?.__userName as (string|undefined);
    const resv = (dto as any)?.reason && String((dto as any).reason).startsWith('RESV|') ? String((dto as any).reason) : '';
    const dataSection: any = {
      productId,
      branchId: section?.branchId || '',
      sectionFrom: deltaNum < 0 ? sectionId : null,
      sectionTo: deltaNum > 0 ? sectionId : null,
      delta: deltaNum,
      reason: 'ADJUST',
      referenceId: `ADJ|${inv.qtyOnHand}|${newQty}|${userId || ''}|${userNameSafe2 || ''}|${(dto as any).reason || ''}${resv ? `|RESV|${resv.slice(5)}` : ''}`,
    };
    await this.prisma.stockMovement.create({ data: dataSection });
    return updated;
  }

  async transfer(
    fromSectionId: string,
    toSectionId: string,
    items: { productId: string; qty: number }[],
    role: string,
    user?: { id?: string; name?: string },
  ) {
    // Permission is enforced at controller via PermissionsGuard
    if (!fromSectionId || !toSectionId || fromSectionId === toSectionId)
      throw new BadRequestException('Invalid sections');
    if (!Array.isArray(items) || items.length === 0)
      throw new BadRequestException('No items to transfer');

    // Validate sections exist
    const [from, to] = await Promise.all([
      this.prisma.section.findUnique({ where: { id: fromSectionId } }),
      this.prisma.section.findUnique({ where: { id: toSectionId } }),
    ]);
    if (!from || !to) throw new NotFoundException('Section not found');

    // Transaction: check stock, then move
    return this.prisma.$transaction(async (tx) => {
      // availability checks
      for (const it of items) {
        const inv = await tx.sectionInventory.findUnique({
          where: { productId_sectionId: { productId: it.productId, sectionId: fromSectionId } },
        });
        const available = inv?.qtyOnHand || 0;
        if (available < (it.qty || 0))
          throw new NotFoundException(`Insufficient stock for product ${it.productId} in source section`);
      }

      // apply moves
      for (const it of items) {
        const qty = Math.max(0, Math.floor(it.qty || 0));
        if (qty === 0) continue;
        // decrement from
        const src = await tx.sectionInventory.upsert({
          where: { productId_sectionId: { productId: it.productId, sectionId: fromSectionId } },
          update: {},
          create: { productId: it.productId, sectionId: fromSectionId, qtyOnHand: 0 },
        });
        if (src.qtyOnHand < qty) throw new NotFoundException(`Insufficient stock for product ${it.productId}`);
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
        // increment to
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

  async releaseReservations(
    sectionId: string,
    reservationKey?: string,
    user?: { id?: string; name?: string },
  ) {
    if (!sectionId) throw new BadRequestException('sectionId is required');
    const section = await this.prisma.section.findUnique({ where: { id: sectionId }, select: { id: true, branchId: true } });
    if (!section) throw new NotFoundException('Section not found');
    // Load all relevant movements across the branch and compute balances by ORIGINAL sectionFrom
    const rows = await this.prisma.stockMovement.findMany({
      where: {
        branchId: section.branchId,
        reason: 'ADJUST',
      },
      select: { productId: true, delta: true, referenceId: true, sectionFrom: true, sectionTo: true },
      orderBy: { createdAt: 'asc' },
    });
    // section -> product -> sum(delta)
    const bySection: Record<string, Record<string, number>> = {};
    for (const r of rows) {
      const ref = String(r.referenceId || '');
      if (reservationKey) {
        const key = `|RESV|${reservationKey}`;
        if (!ref.includes(key)) continue;
      } else if (user?.id) {
        const uid = String(user.id);
        if (!ref.includes(`|${uid}|`)) continue;
      } else {
        continue; // nothing to filter by
      }
      const sec = r.sectionFrom || r.sectionTo || null;
      if (!sec) continue;
      const d = Number(r.delta || 0);
      if (!bySection[sec]) bySection[sec] = {};
      bySection[sec][r.productId] = (bySection[sec][r.productId] || 0) + d;
    }
    const restores: { sectionId: string; productId: string; qty: number }[] = [];
    Object.entries(bySection).forEach(([sec, map]) => {
      Object.entries(map).forEach(([pid, sum]) => {
        const qty = -Math.min(0, Number(sum));
        if (qty > 0) restores.push({ sectionId: sec, productId: pid, qty });
      });
    });
    if (restores.length === 0) return { restored: [] };
    const restored: any[] = [];
    await this.prisma.$transaction(async (tx) => {
      for (const r of restores) {
        const sec = await tx.section.findUnique({ where: { id: r.sectionId }, select: { id: true, branchId: true } });
        if (!sec) continue;
        const inv = await tx.sectionInventory.upsert({ where: { productId_sectionId: { productId: r.productId, sectionId: r.sectionId } }, update: {}, create: { productId: r.productId, sectionId: r.sectionId, qtyOnHand: 0 } });
        await tx.sectionInventory.update({ where: { productId_sectionId: { productId: r.productId, sectionId: r.sectionId } }, data: { qtyOnHand: inv.qtyOnHand + r.qty } });
        await tx.stockMovement.create({ data: { productId: r.productId, branchId: sec.branchId, sectionFrom: null, sectionTo: r.sectionId, delta: r.qty, reason: 'ADJUST', referenceId: `ADJ|${inv.qtyOnHand}|${inv.qtyOnHand + r.qty}|${user?.id || ''}|${user?.name || ''}|RESV_RELEASE${reservationKey ? `|RESV|${reservationKey}` : ''}` } });
        restored.push(r);
      }
    });
    return { restored };
  }
}
