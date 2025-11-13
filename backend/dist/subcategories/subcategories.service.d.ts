import { PrismaService } from '../prisma/prisma.service';
export declare class SubcategoriesService {
    private prisma;
    constructor(prisma: PrismaService);
    list(branchId?: string): Promise<{
        items: {
            branchId: string | null;
            id: string;
            createdAt: Date;
            name: string;
            code: string | null;
        }[];
        total: number;
    }>;
    create(dto: any): Promise<{
        branchId: string | null;
        id: string;
        createdAt: Date;
        name: string;
        code: string | null;
    }>;
    update(id: string, dto: any): Promise<{
        branchId: string | null;
        id: string;
        createdAt: Date;
        name: string;
        code: string | null;
    }>;
    remove(id: string): Promise<{
        ok: boolean;
    }>;
}
