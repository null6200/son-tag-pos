import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type CreateItem = { productId: string; quantity: number; price: string | number };
type PaymentDto = { method: string; amount: string | number; reference?: string };
type ListQuery = {
  branchId?: string;
  supplierId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
};

const VALID_STATUSES = ['PENDING', 'APPROVED', 'RECEIVED', 'CANCELLED'];

// Allowed status transitions. RECEIVED and CANCELLED are terminal.
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['APPROVED', 'CANCELLED'],
  APPROVED: ['RECEIVED', 'CANCELLED'],
  RECEIVED: [],
  CANCELLED: [],
};

@Injectable()
export class PurchasesService {
  constructor(private readonly prisma: PrismaService) {}

  // Shapes a Purchase (with items/product/payments/supplier included) into the
  // response DTO the frontend already expects: numeric total/prices, item.quantity
  // / item.name instead of qty / product relation, and an orderDate alias.
  private toDto(purchase: any) {
    return {
      id: purchase.id,
      branchId: purchase.branchId,
      supplierId: purchase.supplierId,
      supplier: purchase.supplier ? { id: purchase.supplier.id, name: purchase.supplier.name } : null,
      status: purchase.status,
      total: Number(purchase.total),
      orderDate: purchase.createdAt,
      createdAt: purchase.createdAt,
      updatedAt: purchase.updatedAt,
      items: (purchase.items || []).map((it: any) => ({
        id: it.id,
        productId: it.productId,
        name: it.product?.name || 'Unknown product',
        quantity: it.qty,
        price: Number(it.price),
      })),
      payments: (purchase.payments || []).map((p: any) => ({
        id: p.id,
        method: p.method,
        amount: Number(p.amount),
        reference: p.reference,
        createdAt: p.createdAt,
      })),
    };
  }

  private includeShape = {
    items: { include: { product: { select: { id: true, name: true } } } },
    payments: true,
    supplier: { select: { id: true, name: true } },
  };

  async listAll(query: ListQuery) {
    const where: any = {};
    if (query.branchId) where.branchId = query.branchId;
    if (query.supplierId) where.supplierId = query.supplierId;
    if (query.status) {
      const status = String(query.status).toUpperCase();
      if (!VALID_STATUSES.includes(status)) throw new BadRequestException(`Invalid status: ${query.status}`);
      where.status = status;
    }
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 50));

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.purchase.findMany({
        where,
        include: this.includeShape,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.purchase.count({ where }),
    ]);

    return { items: rows.map((r) => this.toDto(r)), total, page, pageSize };
  }

  async listMine(query: ListQuery, userId: string) {
    const where: any = { userId };
    if (query.branchId) where.branchId = query.branchId;
    if (query.supplierId) where.supplierId = query.supplierId;
    if (query.status) {
      const status = String(query.status).toUpperCase();
      if (!VALID_STATUSES.includes(status)) throw new BadRequestException(`Invalid status: ${query.status}`);
      where.status = status;
    }
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 50));

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.purchase.findMany({
        where,
        include: this.includeShape,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.purchase.count({ where }),
    ]);

    return { items: rows.map((r) => this.toDto(r)), total, page, pageSize };
  }

  async get(id: string) {
    const purchase = await this.prisma.purchase.findUnique({ where: { id }, include: this.includeShape });
    if (!purchase) throw new NotFoundException('Purchase order not found');
    return this.toDto(purchase);
  }

  async create(dto: { branchId: string; supplierId?: string | null; items?: CreateItem[] }, userId?: string) {
    if (!dto.branchId) throw new BadRequestException('branchId is required');
    const items = Array.isArray(dto.items) ? dto.items : [];
    if (items.length === 0) throw new BadRequestException('At least one item is required');

    const clean = items.map((it) => {
      const productId = String(it.productId || '');
      const quantity = Number(it.quantity);
      const price = Number(it.price);
      if (!productId) throw new BadRequestException('Each item requires a productId');
      if (!Number.isFinite(quantity) || quantity <= 0) throw new BadRequestException('Each item requires a positive quantity');
      if (!Number.isFinite(price) || price < 0) throw new BadRequestException('Each item requires a valid price');
      return { productId, quantity, price };
    });

    // Total is computed server-side from line items rather than trusted from the client.
    const total = clean.reduce((acc, it) => acc + it.price * it.quantity, 0);

    const purchase = await this.prisma.$transaction(async (tx) => {
      // Cast to any: status/userId were added to the Purchase model in this change
      // and won't appear in the generated Prisma Client types until `prisma
      // generate` is re-run against the migrated schema (see migration
      // 20260913180000_add_purchase_status_and_user).
      const created = await (tx.purchase.create as any)({
        data: {
          branchId: dto.branchId,
          supplierId: dto.supplierId || null,
          userId: userId || null,
          status: 'PENDING',
          total: String(total),
        },
      });
      await tx.purchaseItem.createMany({
        data: clean.map((it) => ({
          purchaseId: created.id,
          productId: it.productId,
          qty: it.quantity,
          price: String(it.price),
        })),
      });
      return tx.purchase.findUnique({ where: { id: created.id }, include: this.includeShape });
    });

    return this.toDto(purchase);
  }

  async update(id: string, dto: { status?: string; supplierId?: string | null }, userId?: string) {
    // Cast to any: `status` isn't in the generated Prisma Client types yet — see
    // note in create() above.
    const existing: any = await this.prisma.purchase.findUnique({ where: { id }, include: { items: true } });
    if (!existing) throw new NotFoundException('Purchase order not found');

    // Non-status edits (e.g. reassigning supplier) only apply while still PENDING.
    if (dto.supplierId !== undefined && existing.status !== 'PENDING') {
      throw new BadRequestException('Can only edit a purchase order while it is PENDING');
    }

    if (!dto.status) {
      const updated = await this.prisma.purchase.update({
        where: { id },
        data: { supplierId: dto.supplierId ?? undefined },
        include: this.includeShape,
      });
      return this.toDto(updated);
    }

    const nextStatus = String(dto.status).toUpperCase();
    if (!VALID_STATUSES.includes(nextStatus)) throw new BadRequestException(`Invalid status: ${dto.status}`);
    const allowed = ALLOWED_TRANSITIONS[existing.status] || [];
    if (!allowed.includes(nextStatus)) {
      throw new BadRequestException(`Cannot move purchase order from ${existing.status} to ${nextStatus}`);
    }

    const purchase = await this.prisma.$transaction(async (tx) => {
      const updated = await (tx.purchase.update as any)({ where: { id }, data: { status: nextStatus } });

      // Receiving a purchase order is what actually credits stock. Guarded by the
      // transition check above so this can only ever fire once per purchase
      // (APPROVED -> RECEIVED), never twice.
      if (nextStatus === 'RECEIVED') {
        for (const item of existing.items) {
          const inv = await tx.inventory.upsert({
            where: { productId_branchId: { productId: item.productId, branchId: existing.branchId } },
            update: {},
            create: { productId: item.productId, branchId: existing.branchId, qtyOnHand: 0 },
          });
          await tx.inventory.update({
            where: { productId_branchId: { productId: item.productId, branchId: existing.branchId } },
            data: { qtyOnHand: inv.qtyOnHand + item.qty },
          });
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              branchId: existing.branchId,
              sectionFrom: null,
              sectionTo: null,
              delta: item.qty,
              reason: 'PURCHASE',
              referenceId: `PURCHASE|${existing.id}|${userId || ''}`,
            },
          });
        }
      }

      return tx.purchase.findUnique({ where: { id: updated.id }, include: this.includeShape });
    });

    return this.toDto(purchase);
  }

  // Explicit alias for update(id, { status: 'RECEIVED' }) — same underlying logic,
  // kept as its own endpoint for callers that want a dedicated "receive" action
  // instead of a generic status PUT.
  async receive(id: string, userId?: string) {
    return this.update(id, { status: 'RECEIVED' }, userId);
  }

  async remove(id: string) {
    const existing: any = await this.prisma.purchase.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Purchase order not found');
    if (existing.status === 'RECEIVED') {
      throw new BadRequestException('Cannot delete a received purchase order — its items are already in stock. Cancel it instead if it was a mistake.');
    }
    await this.prisma.$transaction([
      this.prisma.purchasePayment.deleteMany({ where: { purchaseId: id } }),
      this.prisma.purchaseItem.deleteMany({ where: { purchaseId: id } }),
      this.prisma.purchase.delete({ where: { id } }),
    ]);
    return { status: 'ok' };
  }

  async addPayment(id: string, dto: PaymentDto) {
    const purchase = await this.prisma.purchase.findUnique({ where: { id } });
    if (!purchase) throw new NotFoundException('Purchase order not found');
    const amount = Number(dto.amount);
    if (!Number.isFinite(amount) || amount <= 0) throw new BadRequestException('A positive amount is required');
    await this.prisma.purchasePayment.create({
      data: { purchaseId: id, method: dto.method, amount: String(amount), reference: dto.reference },
    });
    return this.get(id);
  }

  async editPayment(id: string, paymentId: string, dto: Partial<PaymentDto>) {
    const payment = await this.prisma.purchasePayment.findUnique({ where: { id: paymentId } });
    if (!payment || payment.purchaseId !== id) throw new NotFoundException('Payment not found on this purchase order');
    const amount = dto.amount !== undefined ? Number(dto.amount) : undefined;
    if (amount !== undefined && (!Number.isFinite(amount) || amount <= 0)) throw new BadRequestException('A positive amount is required');
    await this.prisma.purchasePayment.update({
      where: { id: paymentId },
      data: {
        method: dto.method ?? undefined,
        amount: amount !== undefined ? String(amount) : undefined,
        reference: dto.reference ?? undefined,
      },
    });
    return this.get(id);
  }

  async deletePayment(id: string, paymentId: string) {
    const payment = await this.prisma.purchasePayment.findUnique({ where: { id: paymentId } });
    if (!payment || payment.purchaseId !== id) throw new NotFoundException('Payment not found on this purchase order');
    await this.prisma.purchasePayment.delete({ where: { id: paymentId } });
    return this.get(id);
  }
}
