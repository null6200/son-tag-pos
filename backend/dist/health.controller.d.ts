import { PrismaService } from './prisma/prisma.service';
export declare class HealthController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getHealth(): any;
    getLiveness(): any;
    getReadiness(): Promise<any>;
}
