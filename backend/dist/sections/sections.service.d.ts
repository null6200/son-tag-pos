import { PrismaService } from '../prisma/prisma.service';
export declare class SectionsService {
    private prisma;
    constructor(prisma: PrismaService);
    listByBranch(branchId: string): Promise<{
        function: string | null;
        branchId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        sectionFunctionId: string | null;
    }[]>;
    create(dto: {
        branchId: string;
        name: string;
        description?: string;
        function?: string;
        sectionFunctionId?: string;
    }, role: string): Promise<{
        function: string | null;
        branchId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        sectionFunctionId: string | null;
    }>;
    update(id: string, dto: {
        name?: string;
        description?: string;
        function?: string;
        sectionFunctionId?: string;
    }, role: string): Promise<{
        function: string | null;
        branchId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        sectionFunctionId: string | null;
    }>;
    remove(id: string, role: string): Promise<{
        function: string | null;
        branchId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        sectionFunctionId: string | null;
    }>;
    allowedForProductType(branchId: string, productTypeId?: string): Promise<{
        function: string | null;
        branchId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        sectionFunctionId: string | null;
    }[]>;
}
