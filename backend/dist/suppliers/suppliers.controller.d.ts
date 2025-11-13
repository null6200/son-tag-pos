import { SuppliersService } from './suppliers.service';
export declare class SuppliersController {
    private readonly svc;
    constructor(svc: SuppliersService);
    listAll(branchId?: string): Promise<{
        branchId: string | null;
        id: string;
        createdAt: Date;
        name: string;
    }[]>;
    listMine(branchId?: string): Promise<{
        branchId: string | null;
        id: string;
        createdAt: Date;
        name: string;
    }[]>;
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
        branchId: string | null;
        id: string;
        createdAt: Date;
        name: string;
    }>;
}
