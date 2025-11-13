import { PrismaService } from '../prisma/prisma.service';
export declare class ServiceTypesService {
    private prisma;
    constructor(prisma: PrismaService);
    list(branchId?: string): Promise<{
        branchId: string;
        id: string;
        archived: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
    }[]>;
    create({ branchId, name, description }: {
        branchId?: string;
        name: string;
        description?: string;
    }, role?: string): Promise<{
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
    }, role?: string): Promise<{
        branchId: string;
        id: string;
        archived: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
    }>;
    remove(id: string, role?: string): Promise<{
        branchId: string;
        id: string;
        archived: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
    }>;
}
