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
var BranchBootstrapService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BranchBootstrapService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let BranchBootstrapService = BranchBootstrapService_1 = class BranchBootstrapService {
    prisma;
    logger = new common_1.Logger(BranchBootstrapService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async onModuleInit() {
        const enabled = (process.env.BRANCH_BOOTSTRAP_ENABLED ?? 'true').toLowerCase() !== 'false';
        if (!enabled)
            return;
        try {
            const count = await this.prisma.branch.count();
            if (count === 0) {
                const name = process.env.BRANCH_BOOTSTRAP_NAME || 'Main Branch';
                const location = process.env.BRANCH_BOOTSTRAP_LOCATION || 'Default';
                await this.prisma.branch.create({ data: { name, location } });
                this.logger.log(`Bootstrapped default branch: ${name}`);
            }
        }
        catch (e) {
            this.logger.warn(`Branch bootstrap skipped: ${e?.message || e}`);
        }
    }
};
exports.BranchBootstrapService = BranchBootstrapService;
exports.BranchBootstrapService = BranchBootstrapService = BranchBootstrapService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], BranchBootstrapService);
//# sourceMappingURL=branches.bootstrap.js.map