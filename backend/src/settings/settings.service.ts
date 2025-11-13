import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async get(branchId?: string) {
    if (!branchId) {
      // return the first or a default settings row; frontend may call this before selecting a branch
      const any = await this.prisma.setting.findFirst();
      if (any) return any;
      try {
        const firstBranch = await this.prisma.branch.findFirst({ select: { id: true, name: true } });
        if (firstBranch) return { branchId: firstBranch.id, businessName: firstBranch.name, currency: 'USD', taxRate: 0 } as any;
      } catch {}
      return { businessName: 'My Business', currency: 'USD', taxRate: 0 } as any;
    }
    const row = await this.prisma.setting.findFirst({ where: { branchId } });
    if (row) return row as any;
    // No settings saved yet for this branch; fall back to the branch name for branding
    try {
      const branch = await this.prisma.branch.findUnique({ where: { id: branchId }, select: { name: true } });
      return { branchId, businessName: branch?.name || 'My Business', currency: 'USD', taxRate: 0 } as any;
    } catch {
      return { branchId, businessName: 'My Business', currency: 'USD', taxRate: 0 } as any;
    }
  }

  async set(data: { branchId?: string; businessName?: string; currency?: string; taxRate?: number; logoUrl?: string; address?: string; phone?: string; email?: string; currencySymbol?: string; theme?: string; allowOverselling?: boolean; receiptFooterNote?: string; invoiceFooterNote?: string }) {
    const branchId = data.branchId || null;
    if (branchId) {
      const exists = await this.prisma.setting.findFirst({ where: { branchId } });
      if (exists) {
        return this.prisma.setting.update({ where: { id: exists.id }, data: { businessName: data.businessName, currency: data.currency, taxRate: data.taxRate as any, logoUrl: data.logoUrl, address: data.address, phone: data.phone, email: data.email, currencySymbol: data.currencySymbol, theme: data.theme, allowOverselling: data.allowOverselling, receiptFooterNote: data.receiptFooterNote, invoiceFooterNote: data.invoiceFooterNote } as any });
      }
      return this.prisma.setting.create({ data: { branchId, businessName: data.businessName, currency: data.currency, taxRate: data.taxRate as any, logoUrl: data.logoUrl, address: data.address, phone: data.phone, email: data.email, currencySymbol: data.currencySymbol, theme: data.theme, allowOverselling: data.allowOverselling, receiptFooterNote: data.receiptFooterNote, invoiceFooterNote: data.invoiceFooterNote } as any });
    }
    // global upsert fallback (no branch)
    const any = await this.prisma.setting.findFirst();
    if (any) return this.prisma.setting.update({ where: { id: any.id }, data: { businessName: data.businessName, currency: data.currency, taxRate: data.taxRate as any, logoUrl: data.logoUrl, address: data.address, phone: data.phone, email: data.email, currencySymbol: data.currencySymbol, theme: data.theme, allowOverselling: data.allowOverselling, receiptFooterNote: data.receiptFooterNote, invoiceFooterNote: data.invoiceFooterNote } as any });
    return this.prisma.setting.create({ data: { businessName: data.businessName, currency: data.currency, taxRate: data.taxRate as any, logoUrl: data.logoUrl, address: data.address, phone: data.phone, email: data.email, currencySymbol: data.currencySymbol, theme: data.theme, allowOverselling: data.allowOverselling, receiptFooterNote: data.receiptFooterNote, invoiceFooterNote: data.invoiceFooterNote } as any });
  }
}
