import { HrmLeavesService } from './leaves.service';
export declare class LeavesController {
    private readonly leaves;
    constructor(leaves: HrmLeavesService);
    list(branchId: string, status?: string, userId?: string): Promise<any>;
    create(body: {
        userId: string;
        branchId: string;
        type: string;
        startDate: string;
        endDate: string;
        reason?: string;
    }): Promise<any>;
    approve(id: string, body: {
        approverUserId: string;
    }): Promise<any>;
    reject(id: string, body: {
        approverUserId: string;
        reason?: string;
    }): Promise<any>;
    cancel(id: string, body: {
        byUserId: string;
    }): Promise<any>;
}
