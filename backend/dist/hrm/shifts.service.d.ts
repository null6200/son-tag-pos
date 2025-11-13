import { PrismaService } from '../prisma/prisma.service';
export declare class HrmShiftsService {
    private prisma;
    constructor(prisma: PrismaService);
    list(params: {
        branchId: string;
        from?: Date;
        to?: Date;
        userId?: string;
    }): Promise<any>;
    assign(data: {
        userId: string;
        branchId: string;
        start: Date;
        end?: Date | null;
        note?: string | null;
    }): Promise<any>;
    update(id: string, data: {
        start?: Date;
        end?: Date | null;
        status?: string;
        note?: string | null;
    }): Promise<any>;
    remove(id: string): Promise<{
        ok: boolean;
    }>;
}
