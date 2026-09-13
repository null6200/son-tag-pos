import { Injectable, NotImplementedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type CreateItem = { productId: string; qty: number; price: string };
type PaymentDto = { method: string; amount: string; reference?: string };

@Injectable()
export class PurchasesService {
  constructor(private readonly prisma: PrismaService) {}

  notImplemented() { throw new NotImplementedException(); }

  async listAll() {
    return (this.prisma as any).purchase.findMany({
      include: { items: true, payments: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listMine() {
    return this.listAll();
  }

  async create(dto: { branchId: string; supplierId?: string | null; items?: CreateItem[]; payments?: PaymentDto[] }) {
    const items = (dto.items || []).map(i => ({ ...i, qty: Number(i.qty), price: i.price }));
    const total = items.reduce((acc, it) => acc + Number(it.price) * Number(it.qty), 0);

    const purchase = await (this.prisma as any).purchase.create({
      data: {
        branchId: dto.branchId,
        supplierId: dto.supplierId || null,
        total: String(total),
      },
    });

    if (items.length) {
      await (this.prisma as any).purchaseItem.createMany({
        data: items.map(it => ({
          purchaseId: purchase.id,
          productId: it.productId,
          qty: Number(it.qty),
          price: it.price,
        })),
      });
    }

    if ((dto.payments || []).length) {
      await (this.prisma as any).purchasePayment.createMany({
        data: (dto.payments || []).map(p => ({
          purchaseId: purchase.id,
          method: p.method,
          amount: p.amount,
          reference: p.reference,
        })),
      });
    }

    return (this.prisma as any).purchase.findUnique({
      where: { id: purchase.id },
      include: { items: true, payments: true },
    });
  }

  async update(id: string, dto: any) {
    return (this.prisma as any).purchase.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await (this.prisma as any).purchaseItem.deleteMany({ where: { purchaseId: id } });
    await (this.prisma as any).purchasePayment.deleteMany({ where: { purchaseId: id } });
    return (this.prisma as any).purchase.delete({ where: { id } });
  }

  async addPayment(id: string, dto: PaymentDto) {
    return (this.prisma as any).purchasePayment.create({
      data: {
        purchaseId: id,
        method: dto.method,
        amount: dto.amount,
        reference: dto.reference,
      },
    });
  }

  async editPayment(id: string, paymentId: string, dto: PaymentDto) {
    return (this.prisma as any).purchasePayment.update({
      where: { id: paymentId },
      data: {
        method: dto.method,
        amount: dto.amount,
        reference: dto.reference,
      },
    });
  }

  async deletePayment(id: string, paymentId: string) {
    return (this.prisma as any).purchasePayment.delete({ where: { id: paymentId } });
  }
}
