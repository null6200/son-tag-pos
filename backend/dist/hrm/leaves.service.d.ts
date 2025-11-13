import { PrismaService } from '../prisma/prisma.service';
export declare class HrmLeavesService {
    private prisma;
    constructor(prisma: PrismaService);
    list(params: {
        branchId: string;
        status?: string;
        userId?: string;
    }): Promise<any>;
    create(data: {
        userId: string;
        branchId: string;
        type: string;
        startDate: Date;
        endDate: Date;
        reason?: string;
    }): Promise<any>;
    approve(id: string, approverUserId: string): Promise<any>;
    reject(id: string, approverUserId: string, reason?: string): Promise<any>;
    cancel(id: string, byUserId: string): Promise<any>;
}
