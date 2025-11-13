import { EmployeesService } from './employees.service';
export declare class EmployeesController {
    private readonly employees;
    constructor(employees: EmployeesService);
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
    create(body: {
        userId: string;
        branchId: string;
        jobTitle?: string;
        hourlyRate?: number;
        hireDate?: string;
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
    update(id: string, body: {
        status?: string;
        jobTitle?: string;
        hourlyRate?: number;
        terminationDate?: string | null;
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
    setPin(id: string, body: {
        pin?: string;
    }, req: any): Promise<{
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
