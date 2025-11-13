import { ShiftsService } from './shifts.service';
export declare class ShiftsController {
    private readonly shifts;
    constructor(shifts: ShiftsService);
    open(body: {
        branchId: string;
        sectionId: string;
        openingCash: number;
    }, req: any): Promise<any>;
    current(branchId: string, sectionId: string, req: any): Promise<any>;
    currentForUser(req: any): Promise<any>;
    getOpenHelp(): {
        message: string;
    };
    currentForBranch(branchId: string): Promise<any>;
    close(id: string, body: {
        closingCash: number;
    }, req: any): Promise<any>;
    list(branchId: string, sectionId?: string, status?: 'OPEN' | 'CLOSED' | 'ALL', limit?: string, offset?: string): Promise<any>;
    getById(id: string): Promise<any>;
}
