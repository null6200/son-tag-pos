import { RolesService } from './roles.service';
export declare class RolesController {
    private readonly roles;
    constructor(roles: RolesService);
    list(branchId: string, includeArchived?: string): Promise<{
        branchId: string;
        id: string;
        archived: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        permissions: string[];
    }[]>;
    create(dto: any, req: any): Promise<{
        branchId: string;
        id: string;
        archived: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        permissions: string[];
    }>;
    update(id: string, dto: any, req: any): Promise<{
        branchId: string;
        id: string;
        archived: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        permissions: string[];
    }>;
    remove(id: string, req: any): Promise<{
        branchId: string;
        id: string;
        archived: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        permissions: string[];
    }>;
}
