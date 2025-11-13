import { InventoryService } from './inventory.service';
import { PrismaService } from '../prisma/prisma.service';
declare class AdjustStockDto {
    delta: number;
    reason?: string;
}
export declare class InventoryController {
    private readonly inventory;
    private readonly prisma;
    constructor(inventory: InventoryService, prisma: PrismaService);
    list(branchId: string): Promise<({
        product: {
            category: string | null;
            branchId: string;
            id: string;
            archived: boolean;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            taxRate: import("@prisma/client/runtime/library").Decimal | null;
            sku: string;
            imageUrl: string | null;
            subCategory: string | null;
            price: import("@prisma/client/runtime/library").Decimal;
            productTypeId: string | null;
        };
    } & {
        branchId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        productId: string;
        qtyOnHand: number;
        minLevel: number;
    })[]>;
    releaseReservationsAll(branchId: string | undefined, req: any): Promise<{
        restored: any[];
    }>;
    listBySection(sectionId: string, sectionName?: string, branchId?: string): Promise<({
        section: {
            function: string | null;
            branchId: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            description: string | null;
            sectionFunctionId: string | null;
        };
        product: {
            category: string | null;
            branchId: string;
            id: string;
            archived: boolean;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            taxRate: import("@prisma/client/runtime/library").Decimal | null;
            sku: string;
            imageUrl: string | null;
            subCategory: string | null;
            price: import("@prisma/client/runtime/library").Decimal;
            productTypeId: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        sectionId: string;
        productId: string;
        qtyOnHand: number;
    })[]>;
    aggregateByBranch(branchId: string): Promise<{
        productId: string;
        total: number;
        perSection: Record<string, number>;
    }[]>;
    getSettings(branchId?: string): Promise<{
        branchId: string | null | undefined;
        allowOverselling: boolean;
    }>;
    setAllowOverselling(body: {
        branchId?: string;
        allowOverselling?: boolean;
    }): Promise<{
        ok: boolean;
        branchId: string;
        allowOverselling: boolean;
    } | {
        ok: boolean;
        allowOverselling: boolean;
        branchId?: undefined;
    }>;
    movements(branchId: string, limit?: string): Promise<{
        branchId: string;
        id: string;
        createdAt: Date;
        productId: string;
        sectionFrom: string | null;
        sectionTo: string | null;
        delta: number;
        reason: string;
        referenceId: string | null;
    }[]>;
    transfers(branchId: string, limit?: string): Promise<{
        items: {
            productName: string;
            productId: string;
            qty: number;
        }[];
        id: string;
        fromSection?: string | null;
        toSection?: string | null;
        fromSectionName?: string;
        toSectionName?: string;
        createdAt: Date;
        userName?: string;
    }[]>;
    adjustments(branchId: string, limit?: string): Promise<any[]>;
    adjust(productId: string, branchId: string, dto: AdjustStockDto, req: any): Promise<{
        branchId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        productId: string;
        qtyOnHand: number;
        minLevel: number;
    }>;
    adjustInSection(productId: string, sectionId: string, sectionName: string | undefined, branchId: string | undefined, dto: AdjustStockDto, req: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        sectionId: string;
        productId: string;
        qtyOnHand: number;
    }>;
    releaseReservations(sectionId: string, body: {
        reservationKey?: string;
        sectionName?: string;
        branchId?: string;
    }, req: any): Promise<{
        restored: any[];
    }>;
    releaseReservationsGet(sectionId: string, reservationKey: string | undefined, sectionName: string | undefined, branchId: string | undefined, req: any): Promise<{
        restored: any[];
    }>;
    transfer(body: {
        fromSectionId?: string;
        toSectionId?: string;
        fromSectionName?: string;
        toSectionName?: string;
        branchId?: string;
        items: {
            productId: string;
            qty: number;
        }[];
    }, req: any): Promise<{
        status: string;
    }>;
}
export {};
