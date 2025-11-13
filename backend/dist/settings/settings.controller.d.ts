import type { Response } from 'express';
import { SettingsService } from './settings.service';
export declare class SettingsController {
    private readonly svc;
    constructor(svc: SettingsService);
    get(branchId?: string): Promise<any>;
    getPublic(branchId?: string): Promise<any>;
    set(dto: any): Promise<{
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
    uploadLogo(file: any): any;
    serveLogo(name: string, res: Response): Promise<void | Response<any, Record<string, any>>>;
}
