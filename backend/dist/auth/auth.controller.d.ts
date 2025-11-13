import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
declare class RegisterDto {
    username?: string;
    email?: string;
    password?: string;
    branchName?: string;
    branchLocation?: string;
    fullName?: string;
}
declare class LoginDto {
    username?: string;
    email?: string;
    password?: string;
}
export declare class AuthController {
    private readonly auth;
    constructor(auth: AuthService);
    register(dto: RegisterDto, res: Response, req: Request): Promise<{
        token: any;
        user: any;
    }>;
    login(dto: LoginDto, res: Response, req: Request): Promise<{
        token: any;
        user: any;
    }>;
    logout(res: Response, req: Request): Promise<{
        ok: boolean;
    }>;
    refresh(res: Response, req: Request): Promise<any>;
}
export {};
