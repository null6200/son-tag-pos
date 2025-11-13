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
Object.defineProperty(exports, "__esModule", { value: true });
exports.OverridePinService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const bcrypt = __importStar(require("bcryptjs"));
let OverridePinService = class OverridePinService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async get(branchId) {
        if (!branchId)
            throw new common_1.BadRequestException('branchId required');
        const branch = await this.prisma.branch.findUnique({ where: { id: branchId } });
        if (!branch)
            throw new common_1.NotFoundException('Branch not found');
        return {
            hasPin: !!branch.overridePinHash,
            graceSeconds: branch.overridePinGraceSeconds ?? 5,
        };
    }
    async set(branchId, pin, graceSeconds) {
        if (!branchId)
            throw new common_1.BadRequestException('branchId required');
        const hash = pin ? await bcrypt.hash(pin, 10) : null;
        const updated = await this.prisma.branch.update({
            where: { id: branchId },
            data: {
                overridePinHash: hash,
                ...(typeof graceSeconds === 'number' ? { overridePinGraceSeconds: graceSeconds } : {}),
            },
        });
        return { ok: true, hasPin: !!updated.overridePinHash, graceSeconds: updated.overridePinGraceSeconds };
    }
    async verify(branchId, pin) {
        if (!branchId) {
            const first = await this.prisma.branch.findFirst({ select: { id: true }, orderBy: { createdAt: 'asc' } });
            branchId = first?.id;
        }
        if (!branchId)
            throw new common_1.BadRequestException('branchId required');
        const branch = await this.prisma.branch.findUnique({ where: { id: branchId } });
        if (!branch?.overridePinHash)
            return { ok: false };
        const ok = await bcrypt.compare(pin || '', branch.overridePinHash);
        return { ok, graceSeconds: branch.overridePinGraceSeconds ?? 5 };
    }
};
exports.OverridePinService = OverridePinService;
exports.OverridePinService = OverridePinService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], OverridePinService);
//# sourceMappingURL=override-pin.service.js.map