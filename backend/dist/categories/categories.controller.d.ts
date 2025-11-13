import { CategoriesService } from './categories.service';
export declare class CategoriesController {
    private readonly svc;
    constructor(svc: CategoriesService);
    list(branchId: string, req: any): Promise<{
        id: string;
        name: string;
        code: string | null;
    }[]>;
    listAll(): Promise<{
        branchId: string;
        id: string;
        name: string;
        code: string | null;
    }[]>;
    create(dto: any, req: any): Promise<{
        branchId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        code: string | null;
    }>;
    update(id: string, dto: any): Promise<{
        id: string;
        name: string;
        code: string | null;
    }>;
    remove(id: string): Promise<{
        id: string;
    }>;
}
export declare class PublicCategoriesController {
    private readonly svc;
    constructor(svc: CategoriesService);
    list(branchId?: string): Promise<{
        id: any;
        name: any;
        code: any;
        branchId: any;
    }[]>;
}
