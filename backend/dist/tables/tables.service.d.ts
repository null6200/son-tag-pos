import { PrismaService } from '../prisma/prisma.service';
export declare class TablesService {
    private prisma;
    constructor(prisma: PrismaService);
    listBySection(sectionId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        status: string;
        sectionId: string;
        capacity: number;
    }[]>;
    create(sectionId: string, name: string, capacity?: number, status?: string, role?: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        status: string;
        sectionId: string;
        capacity: number;
    }>;
    update(id: string, name?: string, sectionId?: string, capacity?: number, status?: string, role?: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        status: string;
        sectionId: string;
        capacity: number;
    }>;
    remove(id: string, role?: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        status: string;
        sectionId: string;
        capacity: number;
    }>;
    lock(id: string, role?: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        status: string;
        sectionId: string;
        capacity: number;
    }>;
    unlock(id: string, role?: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        status: string;
        sectionId: string;
        capacity: number;
    }>;
}
