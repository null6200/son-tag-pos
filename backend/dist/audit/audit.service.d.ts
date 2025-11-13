import { PrismaService } from '../prisma/prisma.service';
export declare class AuditService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    log({ action, userId, branchId, meta }: {
        action: string;
        userId?: string;
        branchId?: string;
        meta?: any;
    }): Promise<{
        ok: boolean;
        logged?: undefined;
    } | {
        ok: boolean;
        logged: string;
    }>;
}
