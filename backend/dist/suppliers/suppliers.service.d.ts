import { PrismaService } from '../prisma/prisma.service';
export declare class SuppliersService {
    private prisma;
    constructor(prisma: PrismaService);
    listAll(branchId?: string): Promise<{
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
