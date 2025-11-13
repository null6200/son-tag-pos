import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
interface RegisterDto {
    username: string;
    email: string;
    password: string;
    branchName?: string;
    branchLocation?: string;
}
interface LoginDto {
    username: string;
    password: string;
}
export declare class AuthService {
    private prisma;
    private jwt;
    constructor(prisma: PrismaService, jwt: JwtService);
    private static failures;
    private maxFailures;
    private lockMinutes;
    private key;
    private isLocked;
    private markFailure;
    private clearFailures;
    register(dto: RegisterDto): Promise<any>;
    login(dto: LoginDto, ip?: string): Promise<any>;
    private accessSecret;
    private refreshSecret;
    private accessTtlSeconds;
    private refreshTtlDays;
    private idleTimeoutMinutes;
    private issueTokens;
    rotateRefreshToken(currentToken: string, userAgent?: string, ipAddress?: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    revokeRefreshToken(currentToken: string): Promise<void>;
}
export {};
