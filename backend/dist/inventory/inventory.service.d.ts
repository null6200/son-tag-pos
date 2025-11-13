import { PrismaService } from '../prisma/prisma.service';
interface AdjustStockDto {
    delta: number;
}
export declare class InventoryService {
    private prisma;
    constructor(prisma: PrismaService);
    listByBranch(branchId: string): Promise<({
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
    releaseReservationsAll(branchId: string | undefined, user?: {
        id?: string;
        name?: string;
    }): Promise<{
        restored: any[];
    }>;
    listTransfers(branchId: string, limit?: number): Promise<{
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
    listBySection(sectionId: string): Promise<({
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
    listMovements(branchId: string, limit?: number): Promise<{
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
    listAdjustments(branchId: string, limit?: number): Promise<any[]>;
    aggregateByBranch(branchId: string): Promise<{
        productId: string;
        total: number;
        perSection: Record<string, number>;
    }[]>;
    adjust(productId: string, branchId: string, dto: AdjustStockDto, role: string, userId?: string): Promise<{
        branchId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        productId: string;
        qtyOnHand: number;
        minLevel: number;
    }>;
    adjustInSection(productId: string, sectionId: string, dto: AdjustStockDto, role: string, userId?: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        sectionId: string;
        productId: string;
        qtyOnHand: number;
    }>;
    transfer(fromSectionId: string, toSectionId: string, items: {
        productId: string;
        qty: number;
    }[], role: string, user?: {
        id?: string;
        name?: string;
    }): Promise<{
        status: string;
    }>;
    releaseReservations(sectionId: string, reservationKey?: string, user?: {
        id?: string;
        name?: string;
    }): Promise<{
        restored: any[];
    }>;
}
export {};
