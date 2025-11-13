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
exports.BranchesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let BranchesService = class BranchesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll() {
        return this.prisma.branch.findMany({
            orderBy: { name: 'asc' },
            include: {
                sections: { select: { id: true, name: true } },
                _count: { select: { sections: true, users: true } },
            },
        });
    }
    async findPublic() {
        return this.prisma.branch.findMany({
            orderBy: { name: 'asc' },
            select: { id: true, name: true },
        });
    }
    async create(dto, role) {
        if (role !== 'ADMIN' && role !== 'MANAGER')
            throw new common_1.ForbiddenException('Insufficient role');
        return this.prisma.branch.create({ data: dto });
    }
    async update(id, dto, role) {
        if (role !== 'ADMIN' && role !== 'MANAGER')
            throw new common_1.ForbiddenException('Insufficient role');
        const existing = await this.prisma.branch.findUnique({ where: { id } });
        if (!existing)
            throw new common_1.NotFoundException('Branch not found');
        return this.prisma.branch.update({ where: { id }, data: dto });
    }
    async remove(id, role) {
        if (role !== 'ADMIN' && role !== 'MANAGER')
            throw new common_1.ForbiddenException('Insufficient role');
        const existing = await this.prisma.branch.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        sections: true,
                        users: true,
                        products: true,
                        orders: true,
                        inventory: true,
                        drafts: true,
                        priceLists: true,
                        expenses: true,
                        suppliers: true,
                        purchases: true,
                        customers: true,
                        brands: true,
                        categories: true,
                        subcategories: true,
                        sectionFunctions: true,
                        productTypes: true,
                        serviceTypes: true,
                        appRoles: true,
                    },
                },
            },
        });
        if (!existing)
            throw new common_1.NotFoundException('Branch not found');
        const c = existing._count;
        const blockers = [];
        const check = (key, label) => { if (c?.[key] && c[key] > 0)
            blockers.push(`${label} (${c[key]})`); };
        check('sections', 'sections');
        check('users', 'users');
        check('products', 'products');
        check('orders', 'orders');
        check('inventory', 'inventory');
        check('drafts', 'drafts');
        check('priceLists', 'price lists');
        check('expenses', 'expenses');
        check('suppliers', 'suppliers');
        check('purchases', 'purchases');
        check('customers', 'customers');
        check('brands', 'brands');
        check('categories', 'categories');
        check('subcategories', 'subcategories');
        check('sectionFunctions', 'section functions');
        check('productTypes', 'product types');
        check('serviceTypes', 'service types');
        if (blockers.length > 0) {
            throw new common_1.BadRequestException(`Cannot delete branch because it has related data: ${blockers.join(', ')}. Please move or delete these items first.`);
        }
        return await this.prisma.$transaction(async (tx) => {
            await tx.setting.updateMany({ where: { branchId: id }, data: { branchId: null } });
            await tx.appRole.deleteMany({ where: { branchId: id } });
            return tx.branch.delete({ where: { id } });
        });
    }
};
exports.BranchesService = BranchesService;
exports.BranchesService = BranchesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], BranchesService);
//# sourceMappingURL=branches.service.js.map