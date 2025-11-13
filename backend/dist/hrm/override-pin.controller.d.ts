import { OverridePinService } from './override-pin.service';
export declare class OverridePinController {
    private readonly svc;
    constructor(svc: OverridePinService);
    get(branchId: string): Promise<{
        hasPin: boolean;
        graceSeconds: any;
    }>;
    set(body: {
        branchId: string;
        pin?: string;
        graceSeconds?: number;
    }): Promise<{
        ok: boolean;
        hasPin: boolean;
        graceSeconds: any;
    }>;
    verify(body: {
        branchId?: string;
        pin: string;
    }, req: any): Promise<{
        ok: boolean;
        graceSeconds?: undefined;
    } | {
        ok: boolean;
        graceSeconds: any;
    }>;
}
