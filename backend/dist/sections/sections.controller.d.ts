import { SectionsService } from './sections.service';
import { PrismaService } from '../prisma/prisma.service';
export declare class SectionsController {
    private readonly sections;
    private readonly prisma;
    constructor(sections: SectionsService, prisma: PrismaService);
    list(branchId: string, req: any): Promise<{
        function: string | null;
        branchId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        sectionFunctionId: string | null;
    }[]>;
    listAllowed(branchId: string, productTypeId?: string, productTypeName?: string, req?: any): Promise<{
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
    }, req: any): Promise<{
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
    }, req: any): Promise<{
        function: string | null;
        branchId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        sectionFunctionId: string | null;
    }>;
    remove(id: string, req: any): Promise<{
        function: string | null;
        branchId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        sectionFunctionId: string | null;
    }>;
}
