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
exports.RolesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let RolesService = class RolesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(branchId, includeArchived) {
        if (!branchId)
            throw new common_1.BadRequestException('branchId required');
        return this.prisma.appRole.findMany({
            where: {
                branchId,
                ...(includeArchived ? {} : { archived: false }),
            },
            orderBy: { name: 'asc' },
        });
    }
    async create(dto, actorRole) {
        if (actorRole !== 'ADMIN' && actorRole !== 'MANAGER')
            throw new common_1.ForbiddenException('Insufficient role');
        if (!dto.branchId || !dto.name)
            throw new common_1.BadRequestException('branchId and name required');
        const exists = await this.prisma.appRole.findFirst({ where: { branchId: dto.branchId, name: dto.name } });
        if (exists)
            throw new common_1.BadRequestException('Role name already exists in branch');
        return this.prisma.appRole.create({ data: { branchId: dto.branchId, name: dto.name, permissions: dto.permissions || [] } });
    }
    async update(id, dto, actorRole) {
        if (actorRole !== 'ADMIN' && actorRole !== 'MANAGER')
            throw new common_1.ForbiddenException('Insufficient role');
        const role = await this.prisma.appRole.findUnique({ where: { id } });
        if (!role)
            throw new common_1.NotFoundException('Role not found');
        if (dto.name && dto.name !== role.name) {
            const dup = await this.prisma.appRole.findFirst({ where: { branchId: role.branchId, name: dto.name } });
            if (dup)
                throw new common_1.BadRequestException('Role name already exists in branch');
        }
        return this.prisma.appRole.update({ where: { id }, data: { name: dto.name ?? undefined, permissions: dto.permissions ?? undefined, archived: dto.archived ?? undefined } });
    }
    async remove(id, actorRole) {
        if (actorRole !== 'ADMIN' && actorRole !== 'MANAGER')
            throw new common_1.ForbiddenException('Insufficient role');
        const role = await this.prisma.appRole.findUnique({ where: { id }, include: { users: true } });
        if (!role)
            throw new common_1.NotFoundException('Role not found');
        if (role.archived) {
            await this.prisma.user.updateMany({ where: { appRoleId: id }, data: { appRoleId: null } });
            return this.prisma.appRole.delete({ where: { id } });
        }
        if ((role.users?.length || 0) > 0) {
            return this.prisma.appRole.update({ where: { id }, data: { archived: true } });
        }
        return this.prisma.appRole.delete({ where: { id } });
    }
};
exports.RolesService = RolesService;
exports.RolesService = RolesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RolesService);
//# sourceMappingURL=roles.service.js.map