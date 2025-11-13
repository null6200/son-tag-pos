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
exports.ShiftsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ShiftsService = class ShiftsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async openShift(params) {
        let { branchId, sectionId, openedById, openingCash } = params;
        if (!sectionId)
            throw new common_1.BadRequestException('sectionId is required');
        if (!branchId) {
            const sec = await this.prisma.section.findUnique({ where: { id: sectionId }, select: { branchId: true } });
            branchId = sec?.branchId || undefined;
        }
        if (!branchId) {
            const first = await this.prisma.branch.findFirst({ select: { id: true }, orderBy: { createdAt: 'asc' } });
            branchId = first?.id;
        }
        if (!branchId)
            throw new common_1.BadRequestException('branchId is required');
        const existing = await this.prisma.shift.findFirst({
            where: { branchId, sectionId, status: 'OPEN' },
        });
        if (existing)
            throw new common_1.BadRequestException('A shift is already open for this section');
        const shift = await this.prisma.shift.create({
            data: {
                branchId: branchId,
                sectionId,
                openedById,
                openingCash: openingCash,
                expectedCash: openingCash,
                status: 'OPEN',
            },
        });
        const user = await this.prisma.user.findUnique({ where: { id: openedById }, select: { username: true } });
        return { ...shift, openedByUsername: user?.username ?? null };
    }
    async getById(id) {
        if (!id)
            throw new common_1.BadRequestException('id is required');
        const shift = await this.prisma.shift.findUnique({ where: { id } });
        if (!shift)
            return null;
        const ids = [shift.openedById, shift.closedById].filter(Boolean);
        let usersById = {};
        if (ids.length) {
            const users = await this.prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, username: true } });
            usersById = users.reduce((acc, u) => { acc[u.id] = u.username; return acc; }, {});
        }
        return {
            ...shift,
            openedByUsername: shift.openedById ? usersById[shift.openedById] ?? null : null,
            closedByUsername: shift.closedById ? usersById[shift.closedById] ?? null : null,
        };
    }
    async findOpenShiftForUser(userId) {
        if (!userId)
            throw new common_1.BadRequestException('userId is required');
        const shift = await this.prisma.shift.findFirst({ where: { openedById: userId, status: 'OPEN' } });
        if (!shift)
            return null;
        const ids = [shift.openedById, shift.closedById].filter(Boolean);
        let usersById = {};
        if (ids.length) {
            const users = await this.prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, username: true } });
            usersById = users.reduce((acc, u) => { acc[u.id] = u.username; return acc; }, {});
        }
        return {
            ...shift,
            openedByUsername: shift.openedById ? usersById[shift.openedById] ?? null : null,
            closedByUsername: shift.closedById ? usersById[shift.closedById] ?? null : null,
        };
    }
    async findOpenShiftForBranch(branchId) {
        if (!branchId) {
            const first = await this.prisma.branch.findFirst({ select: { id: true }, orderBy: { createdAt: 'asc' } });
            branchId = first?.id || undefined;
        }
        if (!branchId)
            throw new common_1.BadRequestException('branchId is required');
        const shift = await this.prisma.shift.findFirst({ where: { branchId, status: 'OPEN' }, orderBy: { openedAt: 'desc' } });
        if (!shift)
            return null;
        const ids = [shift.openedById, shift.closedById].filter(Boolean);
        let usersById = {};
        if (ids.length) {
            const users = await this.prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, username: true } });
            usersById = users.reduce((acc, u) => { acc[u.id] = u.username; return acc; }, {});
        }
        return {
            ...shift,
            openedByUsername: shift.openedById ? usersById[shift.openedById] ?? null : null,
            closedByUsername: shift.closedById ? usersById[shift.closedById] ?? null : null,
        };
    }
    async getCurrentShift(params) {
        let { branchId, sectionId } = params;
        if (!sectionId)
            throw new common_1.BadRequestException('sectionId is required');
        if (!branchId) {
            const sec = await this.prisma.section.findUnique({ where: { id: sectionId }, select: { branchId: true } });
            branchId = sec?.branchId || undefined;
        }
        if (!branchId)
            throw new common_1.BadRequestException('branchId is required');
        const shift = await this.prisma.shift.findFirst({ where: { branchId, sectionId, status: 'OPEN' } });
        if (!shift)
            return null;
        const ids = [shift.openedById, shift.closedById].filter(Boolean);
        let usersById = {};
        if (ids.length) {
            const users = await this.prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, username: true } });
            usersById = users.reduce((acc, u) => { acc[u.id] = u.username; return acc; }, {});
        }
        return {
            ...shift,
            openedByUsername: shift.openedById ? usersById[shift.openedById] ?? null : null,
            closedByUsername: shift.closedById ? usersById[shift.closedById] ?? null : null,
        };
    }
    async closeShift(params) {
        const { shiftId, closingCash, closedById } = params;
        const shift = await this.prisma.shift.findUnique({ where: { id: shiftId } });
        if (!shift)
            throw new common_1.NotFoundException('Shift not found');
        if (shift.status === 'CLOSED') {
            const ids = [shift.openedById, shift.closedById].filter(Boolean);
            let usersById = {};
            if (ids.length) {
                const users = await this.prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, username: true } });
                usersById = users.reduce((acc, u) => { acc[u.id] = u.username; return acc; }, {});
            }
            return {
                ...shift,
                openedByUsername: shift.openedById ? usersById[shift.openedById] ?? null : null,
                closedByUsername: shift.closedById ? usersById[shift.closedById] ?? null : null,
            };
        }
        const paymentsAgg = await this.prisma.payment.aggregate({
            where: {
                order: { branchId: shift.branchId },
                createdAt: { gte: shift.openedAt },
                method: { in: ['cash', 'CASH', 'Cash'] },
            },
            _sum: { amount: true },
        });
        const expectedFromSales = parseFloat(String(paymentsAgg._sum.amount ?? 0));
        const expectedCash = shift.openingCash + expectedFromSales;
        const difference = (closingCash ?? 0) - expectedCash;
        const closed = await this.prisma.shift.update({
            where: { id: shift.id },
            data: {
                closedAt: new Date(),
                closingCash: closingCash,
                expectedCash: expectedCash,
                difference: difference,
                status: 'CLOSED',
                ...(closedById ? { closedById } : {}),
            },
        });
        const ids = [closed.openedById, closed.closedById].filter(Boolean);
        let usersById = {};
        if (ids.length) {
            const users = await this.prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, username: true } });
            usersById = users.reduce((acc, u) => { acc[u.id] = u.username; return acc; }, {});
        }
        return {
            ...closed,
            openedByUsername: closed.openedById ? usersById[closed.openedById] ?? null : null,
            closedByUsername: closed.closedById ? usersById[closed.closedById] ?? null : null,
        };
    }
    async listShifts(params) {
        let { branchId, sectionId, status = 'ALL', limit = 50, offset = 0 } = params;
        if (!branchId) {
            const first = await this.prisma.branch.findFirst({ select: { id: true }, orderBy: { createdAt: 'asc' } });
            branchId = first?.id || undefined;
        }
        if (!branchId)
            throw new common_1.BadRequestException('branchId is required');
        const where = { branchId };
        if (sectionId)
            where.sectionId = sectionId;
        if (status && status !== 'ALL')
            where.status = status;
        const [items, total] = await Promise.all([
            this.prisma.shift.findMany({
                where,
                orderBy: { openedAt: 'desc' },
                skip: offset,
                take: limit,
            }),
            this.prisma.shift.count({ where }),
        ]);
        const ids = Array.from(new Set([
            ...items.map((s) => s.openedById).filter(Boolean),
            ...items.map((s) => s.closedById).filter(Boolean),
        ]));
        let usersById = {};
        if (ids.length) {
            const users = await this.prisma.user.findMany({
                where: { id: { in: ids } },
                select: { id: true, username: true },
            });
            usersById = users.reduce((acc, u) => {
                acc[u.id] = u.username;
                return acc;
            }, {});
        }
        const mapped = items.map((s) => ({
            ...s,
            openedByUsername: s.openedById ? usersById[s.openedById] ?? null : null,
            closedByUsername: s.closedById ? usersById[s.closedById] ?? null : null,
        }));
        return { items: mapped, total };
    }
};
exports.ShiftsService = ShiftsService;
exports.ShiftsService = ShiftsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ShiftsService);
//# sourceMappingURL=shifts.service.js.map