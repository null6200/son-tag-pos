"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = __importStar(require("bcryptjs"));
const prisma_service_1 = require("../prisma/prisma.service");
const date_fns_1 = require("date-fns");
let AuthService = class AuthService {
    static { AuthService_1 = this; }
    prisma;
    jwt;
    constructor(prisma, jwt) {
        this.prisma = prisma;
        this.jwt = jwt;
    }
    static failures = new Map();
    maxFailures() { return Number(process.env.LOGIN_MAX_FAILURES || 5); }
    lockMinutes() { return Number(process.env.LOGIN_LOCK_MINUTES || 15); }
    key(username, ip) { return `${username}|${ip || ''}`; }
    isLocked(username, ip) {
        const k = this.key(username, ip);
        const rec = AuthService_1.failures.get(k);
        if (!rec)
            return false;
        if (rec.until && Date.now() < rec.until)
            return true;
        if (rec.until && Date.now() >= rec.until) {
            AuthService_1.failures.delete(k);
        }
        return false;
    }
    markFailure(username, ip) {
        const k = this.key(username, ip);
        const rec = AuthService_1.failures.get(k) || { count: 0 };
        rec.count += 1;
        if (rec.count >= this.maxFailures()) {
            rec.until = Date.now() + this.lockMinutes() * 60 * 1000;
        }
        AuthService_1.failures.set(k, rec);
    }
    clearFailures(username, ip) { AuthService_1.failures.delete(this.key(username, ip)); }
    async register(dto) {
        const exists = await this.prisma.user.findFirst({
            where: { OR: [{ username: dto.username }, { email: dto.email }] },
            select: { id: true },
        });
        if (exists)
            throw new common_1.BadRequestException('Username or email already exists');
        let branchId = undefined;
        const totalBranches = await this.prisma.branch.count();
        const desiredName = dto.branchName?.trim();
        const desiredLoc = dto.branchLocation || '';
        if (totalBranches === 0) {
            if (desiredName) {
                const b = await this.prisma.branch.create({ data: { name: desiredName, location: desiredLoc } });
                branchId = b.id;
            }
        }
        else if (totalBranches === 1) {
            const existing = await this.prisma.branch.findFirst({});
            if (existing) {
                branchId = existing.id;
                if (desiredName && existing.name !== desiredName) {
                    await this.prisma.branch.update({ where: { id: existing.id }, data: { name: desiredName, location: desiredLoc } });
                }
            }
        }
        else {
            if (desiredName) {
                const match = await this.prisma.branch.findFirst({ where: { name: desiredName } });
                if (match)
                    branchId = match.id;
            }
            if (!branchId) {
                const first = await this.prisma.branch.findFirst({ orderBy: { createdAt: 'asc' } });
                branchId = first?.id;
            }
        }
        if (branchId && desiredName) {
            try {
                await this.prisma.setting.create({ data: { branchId, businessName: desiredName, currency: dto.currency || 'USD' } });
            }
            catch { }
        }
        const passwordHash = await bcrypt.hash(dto.password, 10);
        const user = await this.prisma.user.create({
            data: {
                username: dto.username,
                email: dto.email,
                passwordHash,
                role: 'ADMIN',
                branchId,
            },
        });
        const { accessToken, refreshToken } = await this.issueTokens(user.id, user.username, user.role, undefined, undefined);
        return { token: accessToken, refreshToken, user };
    }
    async login(dto, ip) {
        const user = await this.prisma.user.findFirst({
            where: { OR: [{ username: dto.username }, { email: dto.username }] },
            select: { id: true, username: true, role: true, passwordHash: true, preferences: true }
        });
        if (!user)
            throw new common_1.UnauthorizedException('Invalid credentials');
        if (this.isLocked(dto.username, ip))
            throw new common_1.UnauthorizedException('Account temporarily locked');
        const prefs = user.preferences || {};
        if (prefs && prefs.allowLogin === false)
            throw new common_1.UnauthorizedException('Invalid credentials');
        const ok = await bcrypt.compare(dto.password, user.passwordHash);
        if (!ok) {
            this.markFailure(dto.username, ip);
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        this.clearFailures(dto.username, ip);
        const { accessToken, refreshToken } = await this.issueTokens(user.id, user.username, user.role, undefined, undefined);
        return { token: accessToken, refreshToken, user };
    }
    accessSecret() { return process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'devsecret'; }
    refreshSecret() { return process.env.JWT_REFRESH_SECRET || (process.env.JWT_SECRET ? `${process.env.JWT_SECRET}_refresh` : 'devsecret_refresh'); }
    accessTtlSeconds() { return Number(process.env.ACCESS_TTL_SECONDS || 1800); }
    refreshTtlDays() { return Number(process.env.REFRESH_TTL_DAYS || '7'); }
    idleTimeoutMinutes() { return Number(process.env.IDLE_TIMEOUT_MINUTES || '60'); }
    async issueTokens(userId, username, role, userAgent, ipAddress) {
        const accessToken = await this.jwt.signAsync({ sub: userId, username, role }, { secret: this.accessSecret(), expiresIn: this.accessTtlSeconds() });
        const refreshPayload = { sub: userId, jti: cryptoRandom(), type: 'refresh' };
        const refreshExpires = (0, date_fns_1.add)(new Date(), { days: this.refreshTtlDays() });
        const refreshToken = await this.jwt.signAsync(refreshPayload, { secret: this.refreshSecret(), expiresIn: this.refreshTtlDays() * 24 * 60 * 60 });
        const hash = await bcrypt.hash(refreshToken, 10);
        await this.prisma.refreshToken.create({ data: { userId, tokenHash: hash, userAgent: userAgent || null, ipAddress: ipAddress || null, expiresAt: refreshExpires } });
        return { accessToken, refreshToken };
    }
    async rotateRefreshToken(currentToken, userAgent, ipAddress) {
        let decoded;
        try {
            decoded = await this.jwt.verifyAsync(currentToken, { secret: this.refreshSecret() });
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
        const userId = String(decoded.sub || '');
        if (!userId)
            throw new common_1.UnauthorizedException('Invalid refresh token');
        const tokens = await this.prisma.refreshToken.findMany({ where: { userId, revoked: false } });
        const now = new Date();
        const idleCutoff = new Date(now.getTime() - this.idleTimeoutMinutes() * 60 * 1000);
        let match = null;
        for (const t of tokens) {
            const ok = await bcrypt.compare(currentToken, t.tokenHash);
            if (ok) {
                match = t;
                break;
            }
        }
        if (!match)
            throw new common_1.UnauthorizedException('Refresh token not recognized');
        if (match.expiresAt <= now)
            throw new common_1.UnauthorizedException('Refresh token expired');
        if (new Date(match.lastUsedAt) < idleCutoff)
            throw new common_1.UnauthorizedException('Session idle timeout');
        await this.prisma.refreshToken.update({ where: { id: match.id }, data: { revoked: true, lastUsedAt: now } });
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, username: true, role: true } });
        if (!user)
            throw new common_1.UnauthorizedException('User not found');
        const next = await this.issueTokens(user.id, user.username, user.role, userAgent, ipAddress);
        return next;
    }
    async revokeRefreshToken(currentToken) {
        try {
            const decoded = await this.jwt.verifyAsync(currentToken, { secret: this.refreshSecret() });
            const userId = String(decoded.sub || '');
            if (!userId)
                return;
            const tokens = await this.prisma.refreshToken.findMany({ where: { userId, revoked: false } });
            for (const t of tokens) {
                const ok = await bcrypt.compare(currentToken, t.tokenHash);
                if (ok) {
                    await this.prisma.refreshToken.update({ where: { id: t.id }, data: { revoked: true } });
                    break;
                }
            }
        }
        catch { }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, jwt_1.JwtService])
], AuthService);
function cryptoRandom() {
    return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}
//# sourceMappingURL=auth.service.js.map