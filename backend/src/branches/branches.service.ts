import {
  ForbiddenException,
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface CreateBranchDto {
  name: string;
  location: string;
}

interface UpdateBranchDto {
  name?: string;
  location?: string;
}

@Injectable()
export class BranchesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.branch.findMany({
      orderBy: { name: 'asc' },
      include: {
        sections: { select: { id: true, name: true } },
        _count: { select: { sections: true, users: true } },
      },
    });
  }

  async findPublic() {
    return this.prisma.branch.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });
  }

  async create(dto: CreateBranchDto, role: string) {
    if (role !== 'ADMIN' && role !== 'MANAGER')
      throw new ForbiddenException('Insufficient role');
    return this.prisma.branch.create({ data: dto });
  }

  async update(id: string, dto: UpdateBranchDto, role: string) {
    if (role !== 'ADMIN' && role !== 'MANAGER')
      throw new ForbiddenException('Insufficient role');
    const existing = await this.prisma.branch.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Branch not found');
    return this.prisma.branch.update({ where: { id }, data: dto });
  }

  async remove(id: string, role: string) {
    if (role !== 'ADMIN' && role !== 'MANAGER')
      throw new ForbiddenException('Insufficient role');
    const existing = await this.prisma.branch.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            sections: true,
            users: true,
            products: true,
            orders: true,
            inventory: true,
            drafts: true,
            priceLists: true,
            expenses: true,
            suppliers: true,
            purchases: true,
            customers: true,
            brands: true,
            categories: true,
            subcategories: true,
            sectionFunctions: true,
            productTypes: true,
            serviceTypes: true,
            appRoles: true,
          },
        },
      },
    });
    if (!existing) throw new NotFoundException('Branch not found');

    const c = existing._count as any;
    const blockers: string[] = [];
    const check = (key: string, label: string) => { if (c?.[key] && c[key] > 0) blockers.push(`${label} (${c[key]})`); };
    check('sections', 'sections');
    check('users', 'users');
    check('products', 'products');
    check('orders', 'orders');
    check('inventory', 'inventory');
    check('drafts', 'drafts');
    check('priceLists', 'price lists');
    check('expenses', 'expenses');
    check('suppliers', 'suppliers');
    check('purchases', 'purchases');
    check('customers', 'customers');
    check('brands', 'brands');
    check('categories', 'categories');
    check('subcategories', 'subcategories');
    check('sectionFunctions', 'section functions');
    check('productTypes', 'product types');
    check('serviceTypes', 'service types');

    if (blockers.length > 0) {
      throw new BadRequestException(`Cannot delete branch because it has related data: ${blockers.join(', ')}. Please move or delete these items first.`);
    }

    // Safe cleanup for optional relations typically created by bootstrap: settings (nullable) and appRoles
    return await this.prisma.$transaction(async (tx) => {
      // Detach settings rows
      await tx.setting.updateMany({ where: { branchId: id }, data: { branchId: null } });
      // Remove application roles for the branch
      await tx.appRole.deleteMany({ where: { branchId: id } });
      // Finally delete the branch
      return tx.branch.delete({ where: { id } });
    });
  }
}
