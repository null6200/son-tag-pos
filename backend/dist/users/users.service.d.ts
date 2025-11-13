import { PrismaService } from '../prisma/prisma.service';
export declare class UsersService {
    private prisma;
    constructor(prisma: PrismaService);
    list(branchId?: string, includeArchived?: boolean): Promise<{
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
    getPreferences(userId: string): Promise<any>;
    updatePreferences(userId: string, data: Record<string, any>): Promise<any>;
    getRuntime(userId: string): Promise<any>;
    updateRuntime(userId: string, data: Record<string, any>): Promise<any>;
    findById(id: string): Promise<{
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
    verifyServicePin(userId: string, pin: string): Promise<any>;
    create(dto: any, actorRole?: string): Promise<{
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
    update(id: string, dto: any, actorRole?: string): Promise<{
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
    remove(id: string, actorRole?: string): Promise<{
        id: string;
        archived: boolean;
    }>;
}
