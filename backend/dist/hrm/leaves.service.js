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
exports.HrmLeavesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let HrmLeavesService = class HrmLeavesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(params) {
        if (!params.branchId)
            throw new common_1.BadRequestException('branchId required');
        return this.prisma.leaveRequest.findMany({
            where: {
                branchId: params.branchId,
                status: params.status || undefined,
                userId: params.userId || undefined,
            },
            orderBy: { startDate: 'desc' },
            select: {
                id: true,
                branchId: true,
                userId: true,
                type: true,
                startDate: true,
                endDate: true,
                status: true,
                reason: true,
                approvedById: true,
                user: { select: { id: true, username: true, firstName: true, surname: true } },
            },
        });
    }
    async create(data) {
        if (!data.userId || !data.branchId || !data.type || !data.startDate || !data.endDate)
            throw new common_1.BadRequestException('userId, branchId, type, startDate, endDate required');
        return this.prisma.leaveRequest.create({
            data: {
                userId: data.userId,
                branchId: data.branchId,
                type: data.type,
                startDate: data.startDate,
                endDate: data.endDate,
                reason: data.reason ?? null,
                status: 'PENDING',
            },
        });
    }
    async approve(id, approverUserId) {
        const lr = await this.prisma.leaveRequest.findUnique({ where: { id } });
        if (!lr)
            throw new common_1.NotFoundException('Leave not found');
        return this.prisma.leaveRequest.update({
            where: { id },
            data: { status: 'APPROVED', approvedById: approverUserId },
        });
    }
    async reject(id, approverUserId, reason) {
        const lr = await this.prisma.leaveRequest.findUnique({ where: { id } });
        if (!lr)
            throw new common_1.NotFoundException('Leave not found');
        return this.prisma.leaveRequest.update({
            where: { id },
            data: { status: 'REJECTED', approvedById: approverUserId, reason: reason ?? lr.reason },
        });
    }
    async cancel(id, byUserId) {
        const lr = await this.prisma.leaveRequest.findUnique({ where: { id } });
        if (!lr)
            throw new common_1.NotFoundException('Leave not found');
        if (lr.userId !== byUserId)
            throw new common_1.ForbiddenException('Only the requester can cancel');
        return this.prisma.leaveRequest.update({ where: { id }, data: { status: 'CANCELLED' } });
    }
};
exports.HrmLeavesService = HrmLeavesService;
exports.HrmLeavesService = HrmLeavesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], HrmLeavesService);
//# sourceMappingURL=leaves.service.js.map