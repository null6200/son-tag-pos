import { ReportsService } from './reports.service';
export declare class ReportsController {
    private readonly reports;
    constructor(reports: ReportsService);
    list(type?: string, branchId?: string, from?: string, to?: string, limit?: string, offset?: string): Promise<{
        items: {
            id: string;
            productName: string;
            delta: number;
            reason: string;
            createdAt: Date;
        }[];
        total: number;
    } | {
        items: {
            id: string;
            name: string;
            role: import("@prisma/client").$Enums.Role;
            totalShifts: number;
            totalSales: number;
            lastActive: Date;
        }[];
        total: number;
    } | {
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
    inventory(branchId?: string, from?: string, to?: string, limit?: string, offset?: string): Promise<{
        items: {
            id: string;
            productName: string;
            delta: number;
            reason: string;
            createdAt: Date;
        }[];
        total: number;
    }>;
    overview(branchId?: string, from?: string, to?: string): Promise<{
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
    exportOrders(branchId?: string, from?: string, to?: string): Promise<any>;
    sales(branchId?: string, from?: string, to?: string): Promise<{
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
    shift(shiftId?: string, branchId?: string, sectionId?: string): Promise<any>;
    purchaseSell(q: any): Promise<{
        ok: boolean;
        type: string;
        q: any;
    }>;
    tax(q: any): Promise<{
        ok: boolean;
        type: string;
        q: any;
    }>;
    supplierCustomer(q: any): Promise<{
        ok: boolean;
        type: string;
        q: any;
    }>;
    expense(q: any): Promise<{
        ok: boolean;
        type: string;
        q: any;
    }>;
    profitLoss(q: any): Promise<{
        ok: boolean;
        type: string;
        q: any;
    }>;
    stock(q: any): Promise<{
        ok: boolean;
        type: string;
        q: any;
    }>;
    trending(q: any): Promise<{
        ok: boolean;
        type: string;
        q: any;
    }>;
    register(q: any): Promise<{
        ok: boolean;
        type: string;
        q: any;
    }>;
    salesRep(q: any): Promise<{
        ok: boolean;
        type: string;
        q: any;
    }>;
    productStockValue(q: any): Promise<{
        ok: boolean;
        type: string;
        q: any;
    }>;
    sectionSales(q: any): Promise<{
        ok: boolean;
        type: string;
        q: any;
    }>;
    categorySales(q: any): Promise<{
        ok: boolean;
        type: string;
        q: any;
    }>;
    productPerformance(q: any): Promise<{
        ok: boolean;
        type: string;
        q: any;
    }>;
    returns(q: any): Promise<{
        ok: boolean;
        type: string;
        q: any;
    }>;
    discounts(q: any): Promise<{
        ok: boolean;
        type: string;
        q: any;
    }>;
    voids(q: any): Promise<{
        ok: boolean;
        type: string;
        q: any;
    }>;
    paymentMethods(q: any): Promise<{
        ok: boolean;
        type: string;
        q: any;
    }>;
    cashInOut(q: any): Promise<{
        ok: boolean;
        type: string;
        q: any;
    }>;
    customerAging(q: any): Promise<{
        ok: boolean;
        type: string;
        q: any;
    }>;
    supplierAging(q: any): Promise<{
        ok: boolean;
        type: string;
        q: any;
    }>;
    purchaseDetail(q: any): Promise<{
        ok: boolean;
        type: string;
        q: any;
    }>;
    stockMovement(q: any): Promise<{
        ok: boolean;
        type: string;
        q: any;
    }>;
}
