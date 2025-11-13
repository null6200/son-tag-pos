import { PrismaService } from '../prisma/prisma.service';
export declare class RolesService {
    private prisma;
    constructor(prisma: PrismaService);
    list(branchId: string, includeArchived?: boolean): Promise<{
        branchId: string;
        id: string;
        archived: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        permissions: string[];
    }[]>;
    create(dto: {
        branchId: string;
        name: string;
        permissions?: string[];
    }, actorRole?: string): Promise<{
        branchId: string;
        id: string;
        archived: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        permissions: string[];
    }>;
    update(id: string, dto: {
        name?: string;
        permissions?: string[];
        archived?: boolean;
    }, actorRole?: string): Promise<{
        branchId: string;
        id: string;
        archived: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        permissions: string[];
    }>;
    remove(id: string, actorRole?: string): Promise<{
        branchId: string;
        id: string;
        archived: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        permissions: string[];
    }>;
}
