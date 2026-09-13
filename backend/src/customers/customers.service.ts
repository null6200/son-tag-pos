import { BadRequestException, Injectable, NotFoundException, NotImplementedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events';

@Injectable()
export class CustomersService {
  constructor(
    private prisma: PrismaService,
    private readonly events: EventsService,
  ) {}

  async listAll(branchId?: string) {
    const where: any = {};
    if (branchId) where.branchId = branchId;
    const rows = await this.prisma.customer.findMany({ where, orderBy: { name: 'asc' } });
    return rows;
  }

  async create(dto: any) {
    const name = dto.name || dto.contactName || dto.contact_person || dto.username || 'Customer';
    const branchId = dto.branchId;
    if (!branchId) throw new BadRequestException('branchId is required');
    const data = {
      name,
      branchId,
      phone: dto.phone ?? dto.phoneNumber ?? null,
      email: dto.email ?? null,
      notes: dto.address ?? dto.notes ?? null,
    } as const;
    const customer = await this.prisma.customer.create({ data });

    // Emit real-time event for customer created (fire-and-forget)
    try {
      this.events.emit({
        type: 'customer:created',
        branchId,
        payload: { id: customer.id, name: customer.name },
      });
    } catch {}

    return customer;
  }

  async update(id: string, dto: any) {
    const exists = await this.prisma.customer.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Customer not found');
    if (dto && dto.branchId !== undefined) throw new BadRequestException('branchId cannot be changed');
    const data: any = {};
    let provided = 0;
    if (dto && dto.name !== undefined) {
      if (dto.name !== null && typeof dto.name !== 'string') throw new BadRequestException('name must be a string or null');
      data.name = dto.name;
      provided++;
    }
    if (dto && dto.phone !== undefined) {
      if (dto.phone !== null && typeof dto.phone !== 'string') throw new BadRequestException('phone must be a string or null');
      data.phone = dto.phone;
      provided++;
    }
    if (dto && dto.email !== undefined) {
      if (dto.email !== null && typeof dto.email !== 'string') throw new BadRequestException('email must be a string or null');
      data.email = dto.email;
      provided++;
    }
    if (dto && (dto.address !== undefined || dto.notes !== undefined)) {
      const notes = dto.address ?? dto.notes;
      if (notes !== null && notes !== undefined && typeof notes !== 'string') throw new BadRequestException('notes must be a string or null');
      data.notes = notes ?? null;
      provided++;
    }
    if (provided === 0) throw new BadRequestException('No fields to update');
    const updated = await this.prisma.customer.update({ where: { id }, data });

    // Emit real-time event for customer updated (fire-and-forget)
    try {
      this.events.emit({
        type: 'customer:updated',
        branchId: exists.branchId,
        payload: { id: updated.id, name: updated.name },
      });
    } catch {}

    return updated;
  }

  async remove(id: string) {
    const exists = await this.prisma.customer.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Customer not found');
    const deleted = await this.prisma.customer.delete({ where: { id } });

    // Emit real-time event for customer deleted (fire-and-forget)
    try {
      this.events.emit({
        type: 'customer:deleted',
        branchId: exists.branchId,
        payload: { id },
      });
    } catch {}

    return deleted;
  }

  notImplemented() { throw new NotImplementedException(); }
}
