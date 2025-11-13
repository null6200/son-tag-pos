import { BrandsService } from './brands.service';
export declare class BrandsController {
    private readonly svc;
    constructor(svc: BrandsService);
    list(branchId?: string): Promise<{
        items: {
            branchId: string | null;
            id: string;
            createdAt: Date;
            name: string;
        }[];
        total: number;
    }>;
    create(dto: any): Promise<{
        branchId: string | null;
        id: string;
        createdAt: Date;
        name: string;
    }>;
    update(id: string, dto: any): Promise<{
        branchId: string | null;
        id: string;
        createdAt: Date;
        name: string;
    }>;
    remove(id: string): Promise<{
        ok: boolean;
    }>;
}
