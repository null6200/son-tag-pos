import { PrismaService } from '../prisma/prisma.service';
interface CreatePriceListDto {
    name: string;
    branchId: string;
    sectionId?: string;
    active?: boolean;
}
interface UpsertPriceEntryDto {
    priceListId: string;
    productId: string;
    price: string;
}
export declare class PricingService {
    private prisma;
    constructor(prisma: PrismaService);
    getEffectivePrices(branchId: string, sectionId?: string): Promise<Record<string, number>>;
    createPriceList(dto: CreatePriceListDto, role?: string): Promise<{
        branchId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        sectionId: string | null;
        active: boolean;
    }>;
    ensureActivePriceList(branchId?: string, sectionId?: string, role?: string): Promise<{
        branchId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        sectionId: string | null;
        active: boolean;
    }>;
    upsertPriceEntry(dto: UpsertPriceEntryDto, role?: string): Promise<{
        id: string;
        createdAt: Date;
        price: import("@prisma/client/runtime/library").Decimal;
        productId: string;
        priceListId: string;
    }>;
}
export {};
