import { PrismaService } from '../prisma/prisma.service';
export declare class ShiftsService {
    private prisma;
    constructor(prisma: PrismaService);
    openShift(params: {
        branchId?: string;
        sectionId: string;
        openedById: string;
        openingCash: number;
    }): Promise<any>;
    getById(id: string): Promise<any>;
    findOpenShiftForUser(userId: string): Promise<any>;
    findOpenShiftForBranch(branchId?: string): Promise<any>;
    getCurrentShift(params: {
        branchId?: string;
        sectionId: string;
    }): Promise<any>;
    closeShift(params: {
        shiftId: string;
        closingCash: number;
        closedById?: string;
    }): Promise<any>;
    listShifts(params: {
        branchId?: string;
        sectionId?: string;
        status?: 'OPEN' | 'CLOSED' | 'ALL';
        limit?: number;
        offset?: number;
    }): Promise<any>;
}
