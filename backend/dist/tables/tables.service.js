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
exports.TablesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let TablesService = class TablesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async listBySection(sectionId) {
        return this.prisma.table.findMany({
            where: { sectionId },
            orderBy: { name: 'asc' },
        });
    }
    async create(sectionId, name, capacity, status, role) {
        if (!sectionId || !name)
            throw new common_1.BadRequestException('Missing fields');
        const section = await this.prisma.section.findUnique({ where: { id: sectionId } });
        if (!section)
            throw new common_1.BadRequestException('Section not found');
        try {
            return await this.prisma.table.create({
                data: {
                    sectionId,
                    name,
                    status: (status === 'available' || status === 'occupied' || status === 'reserved' || status === 'locked') ? status : 'available',
                    ...(typeof capacity === 'number' && !Number.isNaN(capacity) ? { capacity } : {}),
                },
            });
        }
        catch (e) {
            if (e instanceof client_1.Prisma.PrismaClientKnownRequestError) {
                if (e.code === 'P2002') {
                    throw new common_1.BadRequestException('A table with this name already exists in this section');
                }
                if (e.code === 'P2003') {
                    throw new common_1.BadRequestException('Invalid section specified');
                }
            }
            throw e;
        }
    }
    async update(id, name, sectionId, capacity, status, role) {
        const t = await this.prisma.table.findUnique({ where: { id } });
        if (!t)
            throw new common_1.NotFoundException('Table not found');
        if (sectionId && sectionId !== t.sectionId) {
            const s = await this.prisma.section.findUnique({ where: { id: sectionId } });
            if (!s)
                throw new common_1.BadRequestException('Section not found');
        }
        try {
            return await this.prisma.table.update({
                where: { id },
                data: {
                    name: name ?? t.name,
                    sectionId: sectionId ?? t.sectionId,
                    ...(typeof capacity === 'number' && !Number.isNaN(capacity) ? { capacity } : {}),
                    ...(status ? { status } : {}),
                },
            });
        }
        catch (e) {
            if (e instanceof client_1.Prisma.PrismaClientKnownRequestError) {
                if (e.code === 'P2002') {
                    throw new common_1.BadRequestException('A table with this name already exists in this section');
                }
                if (e.code === 'P2003') {
                    throw new common_1.BadRequestException('Invalid section specified');
                }
            }
            throw e;
        }
    }
    async remove(id, role) {
        const t = await this.prisma.table.findUnique({ where: { id } });
        if (!t)
            throw new common_1.NotFoundException('Table not found');
        if (t.status === 'occupied' || t.status === 'locked')
            throw new common_1.BadRequestException('Cannot delete an in-use table');
        return this.prisma.table.delete({ where: { id } });
    }
    async lock(id, role) {
        const t = await this.prisma.table.findUnique({ where: { id } });
        if (!t)
            throw new common_1.NotFoundException('Table not found');
        if (t.status === 'locked')
            throw new common_1.BadRequestException('Already locked');
        return this.prisma.table.update({
            where: { id },
            data: { status: 'locked' },
        });
    }
    async unlock(id, role) {
        const t = await this.prisma.table.findUnique({ where: { id } });
        if (!t)
            throw new common_1.NotFoundException('Table not found');
        if (t.status !== 'locked')
            throw new common_1.BadRequestException('Not locked');
        return this.prisma.table.update({
            where: { id },
            data: { status: 'available' },
        });
    }
};
exports.TablesService = TablesService;
exports.TablesService = TablesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TablesService);
//# sourceMappingURL=tables.service.js.map