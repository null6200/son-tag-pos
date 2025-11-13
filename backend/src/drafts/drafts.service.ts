import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
  total: string | number;
  status: string; // ACTIVE | SUSPENDED
  reservationKey?: string;
}

@Injectable()
export class DraftsService {
  constructor(private prisma: PrismaService) {}

  // Overloads for backward compatibility
  async list(branchId: string, sectionId?: string, page?: number, pageSize?: number): Promise<any>;
  async list(branchId: string, sectionId: string | undefined, page: number, pageSize: number, userId?: string, perms?: string[]): Promise<any>;
  async list(branchId: string, sectionId?: string, page: number = 1, pageSize: number = 20, userId?: string, perms: string[] = []) {
    const hasAll = (perms || []).includes('all')
      || (perms || []).includes('view_drafts_all')
      || (perms || []).some(p => typeof p === 'string' && /all/i.test(p) && /(draft|sale|order)s?/i.test(p));
    // Build where condition; branchId is optional if user has ALL or we scope by userId
    const where: any = {
      ...(branchId ? { branchId } : {}),
      ...(sectionId ? { sectionId } : {}),
    };
    if (!hasAll && userId) {
      where.waiterId = userId;
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
    return { items, total, page, pageSize };
  }

  async get(id: string) {
    const draft = await this.prisma.draft.findUnique({ where: { id } });
    if (!draft) throw new NotFoundException('Draft not found');
    return draft;
  }

  async create(dto: DraftPayload) {
    if (!dto.branchId || !dto.name) throw new BadRequestException('Missing fields');
    return this.prisma.draft.create({
      data: {
        branchId: dto.branchId,
        sectionId: dto.sectionId ?? null,
        tableId: dto.tableId ?? null,
        orderId: dto.orderId ?? null,
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
  }

  async update(id: string, dto: Partial<DraftPayload>) {
    const existing = await this.prisma.draft.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Draft not found');
    return this.prisma.draft.update({
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
  }

  async remove(id: string) {
    const existing = await this.prisma.draft.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Draft not found');
    return this.prisma.draft.delete({ where: { id } });
  }
}
