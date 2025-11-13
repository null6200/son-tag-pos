import { PrismaService } from '../prisma/prisma.service';
export declare class SettingsService {
    private prisma;
    constructor(prisma: PrismaService);
    get(branchId?: string): Promise<any>;
    set(data: {
        branchId?: string;
        businessName?: string;
        currency?: string;
        taxRate?: number;
        logoUrl?: string;
        address?: string;
        phone?: string;
        email?: string;
        currencySymbol?: string;
        theme?: string;
        allowOverselling?: boolean;
        receiptFooterNote?: string;
        invoiceFooterNote?: string;
    }): Promise<{
        branchId: string | null;
        id: string;
        email: string | null;
        phone: string | null;
        createdAt: Date;
        updatedAt: Date;
        businessName: string | null;
        currency: string | null;
        logoUrl: string | null;
        address: string | null;
        currencySymbol: string | null;
        theme: string | null;
        taxRate: import("@prisma/client/runtime/library").Decimal | null;
        allowOverselling: boolean;
        receiptFooterNote: string | null;
        invoiceFooterNote: string | null;
    }>;
}
