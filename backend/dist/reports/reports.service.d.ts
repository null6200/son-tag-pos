import { PrismaService } from '../prisma/prisma.service';
interface OverviewParams {
    branchId?: string;
    from?: string;
    to?: string;
}
export declare class ReportsService {
    private prisma;
    constructor(prisma: PrismaService);
    overview(params: OverviewParams): Promise<{
        totals: {
            totalSales: number;
            netSales: number;
            invoiceDue: number;
            totalPurchase: number;
            purchaseDue: number;
            totalSellReturn: number;
            totalPurchaseReturn: number;
            expense: number;
        };
        daily: {
            date: string;
            value: number;
        }[];
        dailyByBranch: Record<string, any>[];
        dailyBySection: Record<string, any>[];
    }>;
    exportOrdersCsv(params: {
        branchId?: string;
        from?: string;
        to?: string;
    }): Promise<{
        filename: string;
        csv: string;
    }>;
    sales(params: {
        branchId?: string;
        from?: string;
        to?: string;
        limit?: number;
        offset?: number;
    }): Promise<{
        items: {
            id: string;
            cashier: string;
            total: number;
            createdAt: Date;
        }[];
        total: number;
        summary: {
            totalSales: number;
            byMethod: Record<string, number>;
        };
    }>;
    listInventory(params: {
        branchId?: string;
        from?: string;
        to?: string;
        limit: number;
        offset: number;
    }): Promise<{
        items: {
            id: string;
            productName: string;
            delta: number;
            reason: string;
            createdAt: Date;
        }[];
        total: number;
    }>;
    listStaff(params: {
        branchId?: string;
        from?: string;
        to?: string;
        limit: number;
        offset: number;
    }): Promise<{
        items: {
            id: string;
            name: string;
            role: import("@prisma/client").$Enums.Role;
            totalShifts: number;
            totalSales: number;
            lastActive: Date;
        }[];
        total: number;
    }>;
    listCashMovements(params: {
        branchId?: string;
        from?: string;
        to?: string;
        limit: number;
        offset: number;
    }): Promise<{
        items: {
            id: string;
            amount: number;
            type: string;
            method: string;
            orderId: string;
            createdAt: Date;
        }[];
        total: number;
    }>;
    shiftReport(params: {
        shiftId?: string;
        branchId?: string;
        sectionId?: string;
    }): Promise<any>;
}
export {};
