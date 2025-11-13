import { HrmShiftsService } from './shifts.service';
export declare class ShiftsController {
    private readonly shifts;
    constructor(shifts: HrmShiftsService);
    list(branchId: string, from?: string, to?: string, userId?: string): Promise<any>;
    assign(body: {
        userId: string;
        branchId: string;
        start: string;
        end?: string;
        note?: string;
    }): Promise<any>;
    update(id: string, body: {
        start?: string;
        end?: string | null;
        status?: string;
        note?: string | null;
    }): Promise<any>;
    remove(id: string): Promise<{
        ok: boolean;
    }>;
}
