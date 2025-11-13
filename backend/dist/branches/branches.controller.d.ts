import { BranchesService } from './branches.service';
declare class CreateBranchDto {
    name: string;
    location: string;
}
export declare class PublicBranchesController {
    private readonly branchesService;
    constructor(branchesService: BranchesService);
    listPublic(): Promise<{
        id: any;
        name: any;
    }[]>;
}
declare class UpdateBranchDto {
    name?: string;
    location?: string;
}
export declare class BranchesController {
    private readonly branchesService;
    constructor(branchesService: BranchesService);
    list(): Promise<({
        _count: {
            users: number;
            sections: number;
        };
        sections: {
            id: string;
            name: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        location: string;
        nextOrderSeq: number;
        nextSkuSeq: number;
        overridePinHash: string | null;
        overridePinGraceSeconds: number;
    })[]>;
    create(dto: CreateBranchDto, req: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        location: string;
        nextOrderSeq: number;
        nextSkuSeq: number;
        overridePinHash: string | null;
        overridePinGraceSeconds: number;
    }>;
    update(id: string, dto: UpdateBranchDto, req: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        location: string;
        nextOrderSeq: number;
        nextSkuSeq: number;
        overridePinHash: string | null;
        overridePinGraceSeconds: number;
    }>;
    remove(id: string, req: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        location: string;
        nextOrderSeq: number;
        nextSkuSeq: number;
        overridePinHash: string | null;
        overridePinGraceSeconds: number;
    }>;
}
export {};
