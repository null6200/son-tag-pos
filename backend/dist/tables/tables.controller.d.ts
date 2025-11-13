import { TablesService } from './tables.service';
export declare class TablesController {
    private readonly tables;
    constructor(tables: TablesService);
    list(sectionId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        status: string;
        sectionId: string;
        capacity: number;
    }[]>;
    create(body: {
        sectionId: string;
        name: string;
        capacity?: number;
        status?: string;
    }, req: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        status: string;
        sectionId: string;
        capacity: number;
    }>;
    update(id: string, body: {
        name?: string;
        sectionId?: string;
        capacity?: number;
        status?: string;
    }, req: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        status: string;
        sectionId: string;
        capacity: number;
    }>;
    remove(id: string, req: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        status: string;
        sectionId: string;
        capacity: number;
    }>;
    lock(id: string, req: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        status: string;
        sectionId: string;
        capacity: number;
    }>;
    unlock(id: string, req: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        status: string;
        sectionId: string;
        capacity: number;
    }>;
}
