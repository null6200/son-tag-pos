import { SubcategoriesService } from './subcategories.service';
export declare class SubcategoriesController {
    private readonly svc;
    constructor(svc: SubcategoriesService);
    list(branchId?: string): Promise<{
        items: {
            branchId: string | null;
            id: string;
            createdAt: Date;
            name: string;
            code: string | null;
        }[];
        total: number;
    }>;
    create(dto: any): Promise<{
        branchId: string | null;
        id: string;
        createdAt: Date;
        name: string;
        code: string | null;
    }>;
    update(id: string, dto: any): Promise<{
        branchId: string | null;
        id: string;
        createdAt: Date;
        name: string;
        code: string | null;
    }>;
    remove(id: string): Promise<{
        ok: boolean;
    }>;
}
