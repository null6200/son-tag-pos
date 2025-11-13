import { ServiceTypesService } from './service-types.service';
export declare class ServiceTypesController {
    private readonly svc;
    constructor(svc: ServiceTypesService);
    list(branchId: string, req: any): Promise<{
        branchId: string;
        id: string;
        archived: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
    }[]>;
    create(dto: {
        branchId?: string;
        name: string;
        description?: string;
    }, req: any): Promise<{
        branchId: string;
        id: string;
        archived: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
    }>;
    update(id: string, dto: {
        name?: string;
        description?: string;
        archived?: boolean;
    }, req: any): Promise<{
        branchId: string;
        id: string;
        archived: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
    }>;
    remove(id: string, req: any): Promise<{
        branchId: string;
        id: string;
        archived: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
    }>;
}
