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
      return { branchId, businessName: branch?.name || 'My Business', currency: 'USD', taxRate: 0, tax1Name: null, tax1Number: null, tax2Name: null, tax2Number: null, enableInlineTax: false } as any;
    } catch {
      return { branchId, businessName: 'My Business', currency: 'USD', taxRate: 0, tax1Name: null, tax1Number: null, tax2Name: null, tax2Number: null, enableInlineTax: false } as any;
    }
  }

  async set(data: { branchId?: string; businessName?: string; currency?: string; taxRate?: number; tax1Name?: string; tax1Number?: number; tax2Name?: string; tax2Number?: number; enableInlineTax?: boolean; logoUrl?: string; address?: string; phone?: string; email?: string; currencySymbol?: string; theme?: string; allowOverselling?: boolean; receiptFooterNote?: string; invoiceFooterNote?: string }) {
    const branchId = data.branchId || null;
    if (branchId) {
      const exists = await this.prisma.setting.findFirst({ where: { branchId } });
      const payload: any = {
        businessName: data.businessName,
        currency: data.currency,
        taxRate: data.taxRate as any,
        tax1Name: data.tax1Name,
        tax1Number: data.tax1Number as any,
        tax2Name: data.tax2Name,
        tax2Number: data.tax2Number as any,
        enableInlineTax: data.enableInlineTax,
        logoUrl: data.logoUrl,
        address: data.address,
        phone: data.phone,
        email: data.email,
        currencySymbol: data.currencySymbol,
        theme: data.theme,
        allowOverselling: data.allowOverselling,
        receiptFooterNote: data.receiptFooterNote,
        invoiceFooterNote: data.invoiceFooterNote,
      };
      if (exists) {
        return this.prisma.setting.update({ where: { id: exists.id }, data: payload });
      }
      return this.prisma.setting.create({ data: { branchId, ...payload } });
    }
    // global upsert fallback (no branch)
    const any = await this.prisma.setting.findFirst();
    const payload: any = {
      businessName: data.businessName,
      currency: data.currency,
      taxRate: data.taxRate as any,
      tax1Name: data.tax1Name,
      tax1Number: data.tax1Number as any,
      tax2Name: data.tax2Name,
      tax2Number: data.tax2Number as any,
      enableInlineTax: data.enableInlineTax,
      logoUrl: data.logoUrl,
      address: data.address,
      phone: data.phone,
      email: data.email,
      currencySymbol: data.currencySymbol,
      theme: data.theme,
      allowOverselling: data.allowOverselling,
      receiptFooterNote: data.receiptFooterNote,
      invoiceFooterNote: data.invoiceFooterNote,
    };
    if (any) return this.prisma.setting.update({ where: { id: any.id }, data: payload });
    return this.prisma.setting.create({ data: payload });
  }
}
