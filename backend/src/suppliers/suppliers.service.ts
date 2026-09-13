import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  // Two different screens in the app edit a Supplier with different field
  // meanings for the same shape:
  //  - Purchase.jsx's own supplier form sends { name: <business name>,
  //    contact: <contact person>, email, phone, address }
  //  - Contacts.jsx's shared contact form sends { name: <contact person>,
  //    businessName: <business name>, phone, email, address }
  // Rather than change either form, this reconciles both into one consistent
  // record: `name` and `businessName` always end up holding the actual
  // business name (so every existing `supplier.name` display, e.g. in
  // Purchase.jsx's supplier list, keeps working regardless of which screen
  // created the record), and `contactPerson` always holds the person's name.
  private resolveNaming(dto: any, existing?: { name: string; businessName: string | null; contactPerson: string | null }) {
    const businessNameGiven = dto.businessName !== undefined && dto.businessName !== null && dto.businessName !== '';

    let businessName: string | undefined;
    let contactPerson: string | undefined;

    if (businessNameGiven) {
      // Contacts.jsx shape: businessName is the real name, name is the contact person.
      businessName = dto.businessName;
      if (dto.name !== undefined) contactPerson = dto.name || null;
    } else if (dto.name !== undefined) {
      // Purchase.jsx shape (or a plain rename): name is the real business name.
      businessName = dto.name;
    }

    if (dto.contact !== undefined) contactPerson = dto.contact || null;
    if (dto.contactPerson !== undefined) contactPerson = dto.contactPerson || null;

    const resolvedBusinessName = businessName !== undefined ? businessName : existing?.businessName ?? existing?.name;
    return {
      name: resolvedBusinessName || existing?.name || 'Supplier',
      businessName: resolvedBusinessName ?? null,
      contactPerson: contactPerson !== undefined ? contactPerson : existing?.contactPerson ?? null,
    };
  }

  async listAll(branchId?: string) {
    const where: any = {};
    if (branchId) where.branchId = branchId;
    return this.prisma.supplier.findMany({ where, orderBy: { name: 'asc' } });
  }

  async create(dto: any) {
    const naming = this.resolveNaming(dto);
    const data: any = {
      name: naming.name,
      businessName: naming.businessName,
      contactPerson: naming.contactPerson,
      email: dto.email ?? null,
      phone: dto.phone ?? null,
      address: dto.address ?? null,
    };
    if (dto.branchId !== undefined) data.branchId = dto.branchId;
    return this.prisma.supplier.create({ data });
  }

  async update(id: string, dto: any) {
    const exists: any = await this.prisma.supplier.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Supplier not found');
    if (!dto || Object.keys(dto).length === 0) throw new BadRequestException('No fields to update');

    const naming = this.resolveNaming(dto, exists);
    const data: any = { name: naming.name, businessName: naming.businessName, contactPerson: naming.contactPerson };
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.address !== undefined) data.address = dto.address;
    if (dto.branchId !== undefined) data.branchId = dto.branchId;

    return this.prisma.supplier.update({ where: { id }, data });
  }

  async remove(id: string) {
    const exists = await this.prisma.supplier.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Supplier not found');
    return this.prisma.supplier.delete({ where: { id } });
  }
}
