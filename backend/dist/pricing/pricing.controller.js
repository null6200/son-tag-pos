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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PriceListsController = exports.PricingController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const permissions_guard_1 = require("../auth/permissions.guard");
const permissions_decorator_1 = require("../auth/permissions.decorator");
const pricing_service_1 = require("./pricing.service");
let PricingController = class PricingController {
    pricing;
    constructor(pricing) {
        this.pricing = pricing;
    }
    async effective(branchId, sectionId) {
        return this.pricing.getEffectivePrices(branchId, sectionId);
    }
};
exports.PricingController = PricingController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('branchId')),
    __param(1, (0, common_1.Query)('sectionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PricingController.prototype, "effective", null);
exports.PricingController = PricingController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('prices'),
    __metadata("design:paramtypes", [pricing_service_1.PricingService])
], PricingController);
let PriceListsController = class PriceListsController {
    pricing;
    constructor(pricing) {
        this.pricing = pricing;
    }
    async create(body, req) {
        return this.pricing.createPriceList(body, req.user?.role);
    }
    async upsertEntries(body, req) {
        let priceListId = body.priceListId;
        if (!priceListId) {
            const pl = await this.pricing.ensureActivePriceList(body.branchId, body.sectionId, req.user?.role);
            priceListId = pl.id;
        }
        const results = [];
        for (const e of (body.entries || [])) {
            results.push(await this.pricing.upsertPriceEntry({ priceListId, productId: e.productId, price: e.price }, req.user?.role));
        }
        return { priceListId, entries: results };
    }
    async remove(id) {
        return { ok: true, id };
    }
};
exports.PriceListsController = PriceListsController;
__decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Post)(),
    (0, permissions_decorator_1.Permissions)('section_pricing'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PriceListsController.prototype, "create", null);
__decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Post)('entries'),
    (0, permissions_decorator_1.Permissions)('section_pricing'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PriceListsController.prototype, "upsertEntries", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PriceListsController.prototype, "remove", null);
exports.PriceListsController = PriceListsController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('price-lists'),
    __metadata("design:paramtypes", [pricing_service_1.PricingService])
], PriceListsController);
//# sourceMappingURL=pricing.controller.js.map