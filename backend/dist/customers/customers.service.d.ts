import { PrismaService } from '../prisma/prisma.service';
export declare class CustomersService {
    private prisma;
    constructor(prisma: PrismaService);
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
    notImplemented(): void;
}
