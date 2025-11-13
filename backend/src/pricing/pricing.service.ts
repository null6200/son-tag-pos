import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface CreatePriceListDto {
  name: string;
  branchId: string;
  sectionId?: string;
  active?: boolean;
}

interface UpsertPriceEntryDto {
  priceListId: string;
  productId: string;
  price: string; // decimal string
}

@Injectable()
export class PricingService {
  constructor(private prisma: PrismaService) {}

  async getEffectivePrices(branchId: string, sectionId?: string) {
    // Try section-scoped active list first, then branch-level active list
    const priceList =
      (await this.prisma.priceList.findFirst({
        where: {
          branchId,
          active: true,
          ...(sectionId ? { sectionId } : { sectionId: null }),
        },
        include: { entries: true },
        orderBy: { createdAt: 'desc' },
      })) ||
      (await this.prisma.priceList.findFirst({
        where: { branchId, active: true, sectionId: null },
        include: { entries: true },
        orderBy: { createdAt: 'desc' },
      }));

    const entriesMap: Record<string, number> = {};

    const toNum = (v: any): number => {
      if (v === null || v === undefined) return 0;
      // Prisma Decimal supports toString/valueOf; Number() handles numeric strings
      const n = Number((v as any).valueOf ? (v as any).valueOf() : v);
      if (Number.isFinite(n)) return n;
      const p = parseFloat(String(v));
      return Number.isFinite(p) ? p : 0;
    };

    if (priceList) {
      for (const e of priceList.entries) {
        entriesMap[e.productId] = toNum(e.price);
      }
    }

    // Fallback: for products missing in price list, use product.price
    const products = await this.prisma.product.findMany({
      where: { branchId },
    });
    for (const p of products) {
      if (entriesMap[p.id] === undefined) {
        entriesMap[p.id] = toNum(p.price);
      }
    }

    return entriesMap;
  }

  async createPriceList(dto: CreatePriceListDto, role?: string) {
    if (role !== 'ADMIN' && role !== 'MANAGER')
      throw new ForbiddenException('Insufficient role');
    return this.prisma.priceList.create({
      data: {
        name: dto.name,
        branchId: dto.branchId,
        sectionId: dto.sectionId ?? null,
        active: dto.active ?? true,
      },
    });
  }

  // Ensure there is exactly one active price list for a branch/section pair.
  // Returns the active list (existing or newly created).
  async ensureActivePriceList(branchId?: string, sectionId?: string, role?: string) {
    if (role && role !== 'ADMIN' && role !== 'MANAGER') {
      // keep parity with create/upsert guards if role is passed
      throw new ForbiddenException('Insufficient role');
    }

    // Derive a deterministic branch if missing (earliest created)
    if (!branchId) {
      const first = await this.prisma.branch.findFirst({ select: { id: true }, orderBy: { createdAt: 'asc' } });
      branchId = first?.id as string | undefined;
    }
    if (!branchId) throw new NotFoundException('Branch not found');

    // Try to find an existing active list
    const existing = await this.prisma.priceList.findFirst({
      where: { branchId, active: true, sectionId: sectionId ?? null },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) return existing;

    // Deactivate any stray active lists for same scope to enforce single active
    await this.prisma.priceList.updateMany({
      where: { branchId, sectionId: sectionId ?? null, active: true },
      data: { active: false },
    });

    // Create a fresh active list for this scope
    return this.prisma.priceList.create({
      data: {
        name: sectionId ? `Section-${sectionId}` : `Branch-${branchId}`,
        branchId: branchId,
        sectionId: sectionId ?? null,
        active: true,
      },
    });
  }

  async upsertPriceEntry(dto: UpsertPriceEntryDto, role?: string) {
    if (role !== 'ADMIN' && role !== 'MANAGER')
      throw new ForbiddenException('Insufficient role');
    // Ensure price list exists
    const pl = await this.prisma.priceList.findUnique({
      where: { id: dto.priceListId },
    });
    if (!pl) throw new NotFoundException('Price list not found');

    const existing = await this.prisma.priceEntry.findUnique({
      where: {
        priceListId_productId: {
          priceListId: dto.priceListId,
          productId: dto.productId,
        },
      },
    });

    if (existing) {
      return this.prisma.priceEntry.update({
        where: { id: existing.id },
        data: { price: dto.price as any },
      });
    }

    return this.prisma.priceEntry.create({
      data: {
        priceListId: dto.priceListId,
        productId: dto.productId,
        price: dto.price as any,
      },
    });
  }
}
