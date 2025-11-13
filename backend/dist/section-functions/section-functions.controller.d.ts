import { SectionFunctionsService } from './section-functions.service';
export declare class SectionFunctionsController {
    private readonly svc;
    constructor(svc: SectionFunctionsService);
    list(branchId: string, page?: string, pageSize?: string, req?: any): Promise<{
        items: {
            branchId: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            description: string | null;
        }[];
        page: number;
        pageSize: number;
        total: number;
        pages: number;
    }>;
    create(dto: {
        branchId?: string;
        name: string;
        description?: string;
    }, req: any): Promise<{
        branchId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
    }>;
    update(id: string, dto: {
        name?: string;
        description?: string;
    }, req: any): Promise<{
        branchId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
    }>;
    remove(id: string, req: any): Promise<{
        branchId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
    }>;
}
