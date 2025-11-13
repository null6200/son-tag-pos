import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface CreateProductDto {
  name: string;
  category?: string;
  subCategory?: string;
  price: string; // decimal string
  taxRate?: string; // decimal string
  branchId: string;
  productTypeId?: string;
  productTypeName?: string;
  initialSectionId?: string;
  initialQty?: string;
}

interface UpdateProductDto {
  name?: string;
  category?: string;
  subCategory?: string;
  price?: string;
  taxRate?: string;
  productTypeId?: string | null;
  productTypeName?: string | null;
}

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async list(branchId?: string, includeArchived?: boolean) {
    return this.prisma.product.findMany({
      where: {
        ...(branchId ? { branchId } : {}),
        ...(includeArchived ? {} : { archived: false }),
      },
      orderBy: { name: 'asc' },
    });
  }

  async create(dto: CreateProductDto, role: string) {
    // Permission is enforced at controller via PermissionsGuard
    // Resolve branchId if missing: use earliest created branch as deterministic default
    let branchId: string | undefined = dto?.branchId;
    if (!branchId) {
      const first = await this.prisma.branch.findFirst({ select: { id: true }, orderBy: { createdAt: 'asc' } });
      branchId = first?.id;
    }
    if (!branchId) throw new BadRequestException('branchId is required');
    // Resolve productType by id or name within the branch
    let productTypeId: string | undefined = dto.productTypeId;
    if (!productTypeId && dto.productTypeName) {
      const byName = await this.prisma.productType.findFirst({ where: { branchId, name: dto.productTypeName } });
      if (!byName) throw new BadRequestException('Product type not found');
      productTypeId = byName.id;
    }
    if (productTypeId) {
      const pt = await this.prisma.productType.findUnique({ where: { id: productTypeId } });
      if (!pt) throw new BadRequestException('Product type not found');
      if (pt.branchId !== branchId) throw new BadRequestException('Product type belongs to a different branch');
    }

    // Transactionally increment Branch.nextSkuSeq and assign per-branch zero-padded SKU (>= 3 digits)
    let product;
    try {
      product = await this.prisma.$transaction(async (tx) => {
        const b = await tx.branch.update({ where: { id: branchId }, data: { nextSkuSeq: { increment: 1 } }, select: { nextSkuSeq: true } });
        const seq = Number(b.nextSkuSeq || 0);
        const sku = String(seq).padStart(3, '0');
        const created = await tx.product.create({
          data: {
            name: dto.name,
            sku,
            category: dto.category,
            subCategory: dto.subCategory,
            price: dto.price as any,
            taxRate: dto.taxRate as any,
            branchId: branchId,
            productTypeId: productTypeId ?? null,
          },
        });
        const qtyInitialRaw = dto.initialQty !== undefined && dto.initialQty !== null ? String(dto.initialQty) : undefined;
        const qtyInitial = qtyInitialRaw !== undefined ? Math.max(0, Math.floor(Number(qtyInitialRaw))) : 0;

        await tx.inventory.upsert({
          where: { productId_branchId: { productId: created.id, branchId: branchId } },
          create: { productId: created.id, branchId: branchId, qtyOnHand: 0 },
          update: {},
        });
        // If initial section and qty provided, apply to section inventory and record movement
        if (dto.initialSectionId && qtyInitial > 0) {
          // Ensure section belongs to the same branch
          const sec = await tx.section.findUnique({ where: { id: dto.initialSectionId } });
          if (!sec) throw new BadRequestException('Section not found');
          if (sec.branchId !== branchId) throw new BadRequestException('Section belongs to a different branch');
          const invSec = await tx.sectionInventory.upsert({
            where: { productId_sectionId: { productId: created.id, sectionId: dto.initialSectionId } },
            update: {},
            create: { productId: created.id, sectionId: dto.initialSectionId, qtyOnHand: 0 },
          });
          const nextQty = Number(invSec.qtyOnHand || 0) + qtyInitial;
          await tx.sectionInventory.update({
            where: { productId_sectionId: { productId: created.id, sectionId: dto.initialSectionId } },
            data: { qtyOnHand: nextQty },
          });
          await tx.stockMovement.create({
            data: {
              productId: created.id,
              branchId: branchId,
              sectionFrom: null,
              sectionTo: dto.initialSectionId,
              delta: qtyInitial,
              reason: 'ADJUST',
              referenceId: `ADJ|${invSec.qtyOnHand}|${nextQty}|||PRODUCT_CREATE_INITIAL`,
            },
          });
        }
        return created;
      });
    } catch (e: any) {
      // Map Prisma unique constraint error to a readable message
      if (e?.code === 'P2002') throw new BadRequestException('A product with this SKU already exists.');
      throw e;
    }
    return product;
  }

  async update(id: string, dto: UpdateProductDto, role: string) {
    // Permission is enforced at controller via PermissionsGuard
    const exist = await this.prisma.product.findUnique({ where: { id } });
    if (!exist) throw new NotFoundException('Product not found');
    // Resolve product type by id or name; validate belongs to same branch
    let productTypeId: string | null | undefined = undefined;
    if (dto.productTypeId !== undefined || dto.productTypeName !== undefined) {
      if (dto.productTypeId === null || dto.productTypeName === null || dto.productTypeId === '' || dto.productTypeName === '') {
        productTypeId = null;
      } else if (dto.productTypeId) {
        const pt = await this.prisma.productType.findUnique({ where: { id: dto.productTypeId } });
        if (!pt) throw new BadRequestException('Product type not found');
        if (pt.branchId !== exist.branchId) throw new BadRequestException('Product type belongs to a different branch');
        productTypeId = pt.id;
      } else if (dto.productTypeName) {
        const ptByName = await this.prisma.productType.findFirst({ where: { branchId: exist.branchId, name: dto.productTypeName } });
        if (!ptByName) throw new BadRequestException('Product type not found');
        productTypeId = ptByName.id;
      }
    }
    return this.prisma.product.update({
      where: { id },
      data: {
        name: dto.name,
        category: dto.category,
        subCategory: dto.subCategory,
        price: dto.price as any,
        taxRate: dto.taxRate as any,
        ...(productTypeId !== undefined ? { productTypeId } : {}),
      },
    });
  }

  async remove(id: string, role: string) {
    // Permission is enforced at controller via PermissionsGuard
    const exist = await this.prisma.product.findUnique({ where: { id } });
    if (!exist) throw new NotFoundException('Product not found');
    // If product has sales, archive instead of deleting
    const salesCount = await this.prisma.orderItem.count({ where: { productId: id } });
    if (salesCount > 0) {
      return this.prisma.product.update({ where: { id }, data: { archived: true } });
    }
    try {
      // Delete dependent rows that might block deletion
      await this.prisma.inventory.deleteMany({ where: { productId: id } });
      await this.prisma.sectionInventory.deleteMany({ where: { productId: id } }).catch(() => {});
      await this.prisma.orderItem.deleteMany({ where: { productId: id } }).catch(() => {});
      await this.prisma.priceEntry.deleteMany({ where: { productId: id } }).catch(() => {});
      return await this.prisma.product.delete({ where: { id } });
    } catch (e: any) {
      // If deletion fails due to referential integrity or any unexpected issue, fallback to archive
      return this.prisma.product.update({ where: { id }, data: { archived: true } });
    }
  }
}
