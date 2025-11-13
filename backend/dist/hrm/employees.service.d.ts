import { PrismaService } from '../prisma/prisma.service';
export declare class EmployeesService {
    private prisma;
    constructor(prisma: PrismaService);
    list(branchId: string, q?: string): Promise<{
        user: {
            appRole: {
                branchId: string;
                id: string;
                archived: boolean;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                permissions: string[];
            } | {
                branchId: string;
                id: string;
                archived: boolean;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                permissions: string[];
            } | null;
            id: string;
            username: string;
            email: string;
            firstName: string | null;
            surname: string | null;
            phone: string | null;
            appRoleId: string | null;
        };
        branchId: string;
        id: string;
        status: import("@prisma/client").$Enums.EmploymentStatus;
        jobTitle: string | null;
        hireDate: Date;
        terminationDate: Date | null;
        hourlyRate: import("@prisma/client/runtime/library").Decimal | null;
    }[]>;
    create(dto: {
        userId: string;
        branchId: string;
        jobTitle?: string;
        hourlyRate?: number;
        hireDate?: Date;
    }): Promise<{
        userId: string;
        branchId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.EmploymentStatus;
        jobTitle: string | null;
        hireDate: Date;
        terminationDate: Date | null;
        hourlyRate: import("@prisma/client/runtime/library").Decimal | null;
        pinHash: string | null;
    }>;
    update(id: string, dto: {
        status?: string;
        jobTitle?: string;
        hourlyRate?: number;
        terminationDate?: Date | null;
    }): Promise<{
        userId: string;
        branchId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.EmploymentStatus;
        jobTitle: string | null;
        hireDate: Date;
        terminationDate: Date | null;
        hourlyRate: import("@prisma/client/runtime/library").Decimal | null;
        pinHash: string | null;
    }>;
    setPin(id: string, pin?: string, actorRole?: string): Promise<{
        userId: string;
        branchId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.EmploymentStatus;
        jobTitle: string | null;
        hireDate: Date;
        terminationDate: Date | null;
        hourlyRate: import("@prisma/client/runtime/library").Decimal | null;
        pinHash: string | null;
    }>;
}
