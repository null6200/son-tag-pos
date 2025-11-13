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
exports.HrmShiftsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let HrmShiftsService = class HrmShiftsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(params) {
        if (!params.branchId)
            throw new common_1.BadRequestException('branchId required');
        return this.prisma.shiftAssignment.findMany({
            where: {
                branchId: params.branchId,
                userId: params.userId || undefined,
                ...(params.from || params.to
                    ? {
                        OR: [
                            {
                                AND: [
                                    params.from ? { start: { gte: params.from } } : {},
                                    params.to ? { start: { lte: params.to } } : {},
                                ],
                            },
                            {
                                AND: [
                                    params.from ? { end: { gte: params.from } } : {},
                                    params.to ? { end: { lte: params.to } } : {},
                                ],
                            },
                        ],
                    }
                    : {}),
            },
            orderBy: { start: 'asc' },
            select: {
                id: true,
                userId: true,
                branchId: true,
                start: true,
                end: true,
                status: true,
                note: true,
                user: { select: { id: true, username: true, firstName: true, surname: true } },
            },
        });
    }
    async assign(data) {
        if (!data.userId || !data.branchId || !data.start)
            throw new common_1.BadRequestException('userId, branchId, start required');
        const user = await this.prisma.user.findUnique({ where: { id: data.userId } });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        return this.prisma.shiftAssignment.create({
            data: {
                userId: data.userId,
                branchId: data.branchId,
                start: data.start,
                end: data.end ?? null,
                note: data.note ?? null,
            },
        });
    }
    async update(id, data) {
        const existing = await this.prisma.shiftAssignment.findUnique({ where: { id } });
        if (!existing)
            throw new common_1.NotFoundException('Shift not found');
        return this.prisma.shiftAssignment.update({
            where: { id },
            data: {
                start: data.start ?? undefined,
                end: (data.end === undefined ? undefined : data.end),
                status: data.status ?? undefined,
                note: (data.note === undefined ? undefined : data.note),
            },
        });
    }
    async remove(id) {
        const existing = await this.prisma.shiftAssignment.findUnique({ where: { id } });
        if (!existing)
            throw new common_1.NotFoundException('Shift not found');
        await this.prisma.shiftAssignment.delete({ where: { id } });
        return { ok: true };
    }
};
exports.HrmShiftsService = HrmShiftsService;
exports.HrmShiftsService = HrmShiftsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], HrmShiftsService);
//# sourceMappingURL=shifts.service.js.map