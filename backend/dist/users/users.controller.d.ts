import { UsersService } from './users.service';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    me(req: any): Promise<{
        id: string;
        username: string;
        email: string;
        role: import("@prisma/client").$Enums.Role;
        branchId: string | null;
        firstName: string | null;
        surname: string | null;
        phone: string | null;
        isServiceStaff: boolean;
        archived: boolean;
        appRole: {
            id: string;
            name: string;
        } | null;
        permissions: string[];
    }>;
    getPreferences(req: any): Promise<any>;
    updatePreferences(req: any, body: any): Promise<any>;
    getRuntime(req: any): Promise<any>;
    updateRuntime(req: any, body: any): Promise<any>;
    list(branchId?: string, includeArchived?: string): Promise<{
        id: string;
        username: string;
        email: string;
        role: import("@prisma/client").$Enums.Role;
        branchId: string | null;
        firstName: string | null;
        surname: string | null;
        phone: string | null;
        isServiceStaff: boolean;
        archived: boolean;
        appRole: {
            id: string;
            name: string;
        } | null;
    }[]>;
    create(dto: any, req: any): Promise<{
        id: string;
        username: string;
        email: string;
        role: import("@prisma/client").$Enums.Role;
        branchId: string | null;
        firstName: string | null;
        surname: string | null;
        phone: string | null;
        isServiceStaff: boolean;
        archived: boolean;
        appRole: {
            id: string;
            name: string;
        } | null;
        permissions: string[];
    }>;
    verifyPin(body: {
        userId: string;
        pin: string;
    }): Promise<any>;
    update(id: string, dto: any, req: any): Promise<{
        id: string;
        username: string;
        email: string;
        role: import("@prisma/client").$Enums.Role;
        branchId: string | null;
        firstName: string | null;
        surname: string | null;
        phone: string | null;
        isServiceStaff: boolean;
        archived: boolean;
        appRole: {
            id: string;
            name: string;
        } | null;
        permissions: string[];
    }>;
    remove(id: string, req: any): Promise<{
        id: string;
        archived: boolean;
    }>;
}
