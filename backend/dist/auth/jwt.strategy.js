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
Object.defineProperty(exports, "__esModule", { value: true });
exports.JwtStrategy = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const passport_jwt_1 = require("passport-jwt");
const prisma_service_1 = require("../prisma/prisma.service");
function cookieOrAuthExtractor(req) {
    const auth = req.headers['authorization'];
    if (auth && auth.startsWith('Bearer '))
        return auth.slice(7);
    const cookie = req.headers['cookie'];
    if (cookie) {
        const match = cookie.match(/access_token=([^;]+)/);
        if (match)
            return decodeURIComponent(match[1]);
    }
    return null;
}
let JwtStrategy = class JwtStrategy extends (0, passport_1.PassportStrategy)(passport_jwt_1.Strategy) {
    prisma;
    constructor(prisma) {
        super({
            jwtFromRequest: passport_jwt_1.ExtractJwt.fromExtractors([cookieOrAuthExtractor]),
            ignoreExpiration: false,
            secretOrKey: process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'devsecret',
        });
        this.prisma = prisma;
    }
    async validate(payload) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { id: String(payload.sub) },
                select: { id: true, username: true, role: true, branchId: true },
            });
            let branchId = user?.branchId || null;
            if (!branchId) {
                const firstBranch = await this.prisma.branch.findFirst({ select: { id: true }, orderBy: { createdAt: 'asc' } });
                branchId = firstBranch?.id || null;
            }
            return { userId: payload.sub, username: payload.username, role: payload.role, branchId };
        }
        catch {
            return { userId: payload.sub, username: payload.username, role: payload.role };
        }
    }
};
exports.JwtStrategy = JwtStrategy;
exports.JwtStrategy = JwtStrategy = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], JwtStrategy);
//# sourceMappingURL=jwt.strategy.js.map