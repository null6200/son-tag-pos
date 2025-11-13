"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const class_validator_1 = require("class-validator");
const auth_service_1 = require("./auth.service");
class RegisterDto {
    username;
    email;
    password;
    branchName;
    branchLocation;
    fullName;
}
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "username", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8),
    (0, class_validator_1.Matches)(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, { message: 'Password too weak' }),
    __metadata("design:type", String)
], RegisterDto.prototype, "password", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "branchName", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "branchLocation", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "fullName", void 0);
class LoginDto {
    username;
    email;
    password;
}
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], LoginDto.prototype, "username", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], LoginDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], LoginDto.prototype, "password", void 0);
let AuthController = class AuthController {
    auth;
    constructor(auth) {
        this.auth = auth;
    }
    async register(dto, res, req) {
        const username = dto.username || (dto.email ? dto.email.split('@')[0] : undefined) || (dto.fullName ? String(dto.fullName).replace(/\s+/g, '').toLowerCase() : undefined);
        const email = dto.email;
        const password = dto.password;
        const branchName = dto.branchName;
        const branchLocation = dto.branchLocation;
        const { token, refreshToken, user } = await this.auth.register({ username: String(username), email, password, branchName, branchLocation });
        setAuthCookies(res, token, refreshToken);
        return { token, user };
    }
    async login(dto, res, req) {
        const usernameOrEmail = dto.username || dto.email;
        const password = dto.password;
        const ua = req.headers['user-agent'];
        const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || undefined;
        const { token, refreshToken, user } = await this.auth.login({ username: String(usernameOrEmail), password }, ip);
        setAuthCookies(res, token, refreshToken);
        return { token, user };
    }
    async logout(res, req) {
        const rt = getCookie(req, 'refresh_token');
        if (rt) {
            try {
                await this.auth.revokeRefreshToken(rt);
            }
            catch { }
        }
        clearAuthCookies(res);
        return { ok: true };
    }
    async refresh(res, req) {
        const current = getCookie(req, 'refresh_token');
        if (!current)
            return { ok: false, error: 'No refresh token' };
        const ua = req.headers['user-agent'];
        const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || undefined;
        const next = await this.auth.rotateRefreshToken(current, ua, ip);
        setAuthCookies(res, next.accessToken, next.refreshToken);
        return { ok: true };
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('register'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [RegisterDto, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "register", null);
__decorate([
    (0, common_1.Post)('login'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [LoginDto, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('logout'),
    __param(0, (0, common_1.Res)({ passthrough: true })),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
__decorate([
    (0, common_1.Post)('refresh'),
    __param(0, (0, common_1.Res)({ passthrough: true })),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refresh", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], AuthController);
function setAuthCookies(res, accessToken, refreshToken) {
    const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
    const common = { httpOnly: true, secure: isProd, sameSite: (isProd ? 'none' : 'lax'), path: '/' };
    res.cookie('access_token', accessToken, { ...common, maxAge: 30 * 60 * 1000 });
    res.cookie('refresh_token', refreshToken, { ...common, maxAge: 7 * 24 * 60 * 60 * 1000 });
}
function clearAuthCookies(res) {
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/' });
}
function getCookie(req, key) {
    const cookie = req.headers['cookie'];
    if (!cookie)
        return undefined;
    const re = new RegExp(`${key}=([^;]+)`);
    const m = cookie.match(re);
    return m ? decodeURIComponent(m[1]) : undefined;
}
//# sourceMappingURL=auth.controller.js.map