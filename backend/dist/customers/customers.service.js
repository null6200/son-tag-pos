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
exports.CustomersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let CustomersService = class CustomersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async listAll(branchId) {
        const where = {};
        if (branchId)
            where.branchId = branchId;
        const rows = await this.prisma.customer.findMany({ where, orderBy: { name: 'asc' } });
        return rows;
    }
    async create(dto) {
        const name = dto.name || dto.contactName || dto.contact_person || dto.username || 'Customer';
        const branchId = dto.branchId;
        if (!branchId)
            throw new common_1.BadRequestException('branchId is required');
        const data = {
            name,
            branchId,
            phone: dto.phone ?? dto.phoneNumber ?? null,
            email: dto.email ?? null,
            notes: dto.address ?? dto.notes ?? null,
        };
        return this.prisma.customer.create({ data });
    }
    async update(id, dto) {
        const exists = await this.prisma.customer.findUnique({ where: { id } });
        if (!exists)
            throw new common_1.NotFoundException('Customer not found');
        if (dto && dto.branchId !== undefined)
            throw new common_1.BadRequestException('branchId cannot be changed');
        const data = {};
        let provided = 0;
        if (dto && dto.name !== undefined) {
            if (dto.name !== null && typeof dto.name !== 'string')
                throw new common_1.BadRequestException('name must be a string or null');
            data.name = dto.name;
            provided++;
        }
        if (dto && dto.phone !== undefined) {
            if (dto.phone !== null && typeof dto.phone !== 'string')
                throw new common_1.BadRequestException('phone must be a string or null');
            data.phone = dto.phone;
            provided++;
        }
        if (dto && dto.email !== undefined) {
            if (dto.email !== null && typeof dto.email !== 'string')
                throw new common_1.BadRequestException('email must be a string or null');
            data.email = dto.email;
            provided++;
        }
        if (dto && (dto.address !== undefined || dto.notes !== undefined)) {
            const notes = dto.address ?? dto.notes;
            if (notes !== null && notes !== undefined && typeof notes !== 'string')
                throw new common_1.BadRequestException('notes must be a string or null');
            data.notes = notes ?? null;
            provided++;
        }
        if (provided === 0)
            throw new common_1.BadRequestException('No fields to update');
        return this.prisma.customer.update({ where: { id }, data });
    }
    async remove(id) {
        const exists = await this.prisma.customer.findUnique({ where: { id } });
        if (!exists)
            throw new common_1.NotFoundException('Customer not found');
        return this.prisma.customer.delete({ where: { id } });
    }
    notImplemented() { throw new common_1.NotImplementedException(); }
};
exports.CustomersService = CustomersService;
exports.CustomersService = CustomersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CustomersService);
//# sourceMappingURL=customers.service.js.map