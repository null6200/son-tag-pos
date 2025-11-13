import { PrismaService } from '../prisma/prisma.service';
export declare class CategoriesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(params: {
        branchId?: string;
    }): Promise<{
        id: string;
        name: string;
        code: string | null;
    }[]>;
    create(dto: {
        name: string;
        code?: string | null;
        branchId?: string;
    }): Promise<{
        branchId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        code: string | null;
    }>;
    update(id: string, dto: {
        name?: string | null;
        code?: string | null;
    }): Promise<{
        id: string;
        name: string;
        code: string | null;
    }>;
    remove(id: string): Promise<{
        id: string;
    }>;
    listAny(params?: {
        branchId?: string;
    }): Promise<{
        branchId: string;
        id: string;
        name: string;
        code: string | null;
    }[]>;
}
