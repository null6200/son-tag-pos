import { PrismaService } from '../prisma/prisma.service';
interface CreateBranchDto {
    name: string;
    location: string;
}
interface UpdateBranchDto {
    name?: string;
    location?: string;
}
export declare class BranchesService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(): Promise<({
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
    findPublic(): Promise<{
        id: string;
        name: string;
    }[]>;
    create(dto: CreateBranchDto, role: string): Promise<{
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
    update(id: string, dto: UpdateBranchDto, role: string): Promise<{
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
    remove(id: string, role: string): Promise<{
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
