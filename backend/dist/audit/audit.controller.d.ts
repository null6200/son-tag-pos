import { AuditService } from './audit.service';
export declare class AuditController {
    private readonly audit;
    constructor(audit: AuditService);
    log(body: {
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
