import { PrismaService } from '../prisma/prisma.service';
export declare class SectionFunctionsService {
    private prisma;
    constructor(prisma: PrismaService);
    list(branchId?: string, page?: number, pageSize?: number): Promise<{
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
    }, role?: string): Promise<{
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
    }, role?: string): Promise<{
        branchId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
    }>;
    remove(id: string, role?: string): Promise<{
        branchId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
    }>;
}
