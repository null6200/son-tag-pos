import { CustomersService } from './customers.service';
export declare class CustomersController {
    private readonly svc;
    constructor(svc: CustomersService);
    listAll(branchId?: string): Promise<{
        branchId: string;
        id: string;
        email: string | null;
        phone: string | null;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        notes: string | null;
    }[]>;
    listMine(branchId?: string): Promise<{
        branchId: string;
        id: string;
        email: string | null;
        phone: string | null;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        notes: string | null;
    }[]>;
    create(dto: any): Promise<{
        branchId: string;
        id: string;
        email: string | null;
        phone: string | null;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        notes: string | null;
    }>;
    update(id: string, dto: any): Promise<{
        branchId: string;
        id: string;
        email: string | null;
        phone: string | null;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        notes: string | null;
    }>;
    remove(id: string): Promise<{
        branchId: string;
        id: string;
        email: string | null;
        phone: string | null;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        notes: string | null;
    }>;
    noSell1m(): void;
    noSell3m(): void;
    noSell6m(): void;
    noSell1y(): void;
    noSellAny(): void;
}
