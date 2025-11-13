import { PrismaService } from '../prisma/prisma.service';
export declare class OverridePinService {
    private prisma;
    constructor(prisma: PrismaService);
    get(branchId: string): Promise<{
        hasPin: boolean;
        graceSeconds: any;
    }>;
    set(branchId: string, pin: string, graceSeconds?: number): Promise<{
        ok: boolean;
        hasPin: boolean;
        graceSeconds: any;
    }>;
    verify(branchId: string | undefined, pin: string): Promise<{
        ok: boolean;
        graceSeconds?: undefined;
    } | {
        ok: boolean;
        graceSeconds: any;
    }>;
}
