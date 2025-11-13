import { PricingService } from './pricing.service';
export declare class PricingController {
    private readonly pricing;
    constructor(pricing: PricingService);
    effective(branchId: string, sectionId?: string): Promise<Record<string, number>>;
}
export declare class PriceListsController {
    private readonly pricing;
    constructor(pricing: PricingService);
    create(body: {
        name: string;
        branchId: string;
        sectionId?: string;
        active?: boolean;
    }, req: any): Promise<{
        branchId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        sectionId: string | null;
        active: boolean;
    }>;
    upsertEntries(body: {
        priceListId?: string;
        branchId: string;
        sectionId?: string;
        entries: Array<{
            productId: string;
            price: string;
        }>;
    }, req: any): Promise<{
        priceListId: string;
        entries: any[];
    }>;
    remove(id: string): Promise<{
        ok: boolean;
        id: string;
    }>;
}
