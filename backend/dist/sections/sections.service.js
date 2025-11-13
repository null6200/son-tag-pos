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
exports.SectionsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let SectionsService = class SectionsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async listByBranch(branchId) {
        const rows = await this.prisma.section.findMany({
            where: { branchId },
            orderBy: { name: 'asc' },
        });
        if (rows.length === 0) {
            const created = await this.prisma.section.create({
                data: { branchId, name: 'Main' },
            });
            return [created];
        }
        return rows;
    }
    async create(dto, role) {
        if (role !== 'ADMIN' && role !== 'MANAGER')
            throw new common_1.ForbiddenException('Insufficient role');
        let sectionFunctionId = dto.sectionFunctionId;
        if (sectionFunctionId) {
            const fn = await this.prisma.sectionFunction.findUnique({ where: { id: sectionFunctionId } });
            if (!fn)
                throw new common_1.NotFoundException('Section function not found');
            if (fn.branchId !== dto.branchId)
                throw new common_1.ForbiddenException('Section function belongs to a different branch');
        }
        return this.prisma.section.create({ data: {
                branchId: dto.branchId,
                name: dto.name,
                description: dto.description ?? null,
                sectionFunctionId: sectionFunctionId ?? null,
                function: dto.function ?? null,
            } });
    }
    async update(id, dto, role) {
        if (role !== 'ADMIN' && role !== 'MANAGER')
            throw new common_1.ForbiddenException('Insufficient role');
        const existing = await this.prisma.section.findUnique({ where: { id } });
        if (!existing)
            throw new common_1.NotFoundException('Section not found');
        let sectionFunctionId = undefined;
        if (dto.sectionFunctionId !== undefined) {
            if (dto.sectionFunctionId === null || dto.sectionFunctionId === '') {
                sectionFunctionId = null;
            }
            else {
                const fn = await this.prisma.sectionFunction.findUnique({ where: { id: dto.sectionFunctionId } });
                if (!fn)
                    throw new common_1.NotFoundException('Section function not found');
                if (fn.branchId !== existing.branchId)
                    throw new common_1.ForbiddenException('Section function belongs to a different branch');
                sectionFunctionId = fn.id;
            }
        }
        return this.prisma.section.update({ where: { id }, data: {
                ...(dto.name !== undefined ? { name: dto.name } : {}),
                ...(dto.description !== undefined ? { description: dto.description } : {}),
                ...(dto.function !== undefined ? { function: dto.function } : {}),
                ...(sectionFunctionId !== undefined ? { sectionFunctionId } : {}),
            } });
    }
    async remove(id, role) {
        if (role !== 'ADMIN' && role !== 'MANAGER')
            throw new common_1.ForbiddenException('Insufficient role');
        const existing = await this.prisma.section.findUnique({ where: { id } });
        if (!existing)
            throw new common_1.NotFoundException('Section not found');
        return this.prisma.section.delete({ where: { id } });
    }
    async allowedForProductType(branchId, productTypeId) {
        if (!productTypeId) {
            return this.prisma.section.findMany({ where: { branchId }, orderBy: { name: 'asc' } });
        }
        const links = await this.prisma.productTypeAllowedFunction.findMany({
            where: { productTypeId },
            select: { sectionFunctionId: true },
        });
        const allowed = links.map(l => l.sectionFunctionId).filter(Boolean);
        if (allowed.length === 0) {
            return this.prisma.section.findMany({ where: { branchId }, orderBy: { name: 'asc' } });
        }
        const funcs = await this.prisma.sectionFunction.findMany({
            where: { id: { in: allowed }, branchId },
            select: { id: true, name: true },
        });
        const allowedNames = funcs.map(f => (f.name || '').trim()).filter(Boolean);
        const orConds = [];
        if (allowed.length > 0)
            orConds.push({ sectionFunctionId: { in: allowed } });
        const nameVariants = new Set();
        for (const nm of allowedNames) {
            const base = nm.replace(/\s*production\s*$/i, '').trim();
            const baseLc = base.toLowerCase();
            const prodForm = `${base} production`;
            const revProdForm = `production ${base}`;
            const underscore = (s) => s.replace(/\s+/g, '_');
            const hyphen = (s) => s.replace(/\s+/g, '-');
            [nm, base, prodForm, revProdForm].forEach(v => { if (v)
                nameVariants.add(v); });
            [nm.toLowerCase(), baseLc, prodForm.toLowerCase(), revProdForm.toLowerCase()].forEach(v => { if (v)
                nameVariants.add(v); });
            [underscore(baseLc), underscore(prodForm.toLowerCase()), underscore(revProdForm.toLowerCase())].forEach(v => { if (v)
                nameVariants.add(v); });
            [hyphen(baseLc), hyphen(prodForm.toLowerCase()), hyphen(revProdForm.toLowerCase())].forEach(v => { if (v)
                nameVariants.add(v); });
        }
        for (const v of nameVariants) {
            if (v) {
                orConds.push({ function: { equals: v, mode: 'insensitive' } });
                orConds.push({ function: { contains: v, mode: 'insensitive' } });
                orConds.push({ name: { contains: v, mode: 'insensitive' } });
            }
        }
        const rows = await this.prisma.section.findMany({
            where: {
                branchId,
                OR: orConds.length > 0 ? orConds : undefined,
            },
            orderBy: { name: 'asc' },
        });
        try {
            console.log('[sections.allowedForProductType]', {
                branchId,
                productTypeId,
                allowedFunctionIds: allowed,
                allowedFunctionNames: Array.from(nameVariants),
                resultCount: rows.length,
                sectionIds: rows.map(r => r.id),
            });
        }
        catch { }
        return rows;
    }
};
exports.SectionsService = SectionsService;
exports.SectionsService = SectionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SectionsService);
//# sourceMappingURL=sections.service.js.map