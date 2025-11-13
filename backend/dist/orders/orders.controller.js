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
exports.OrdersController = void 0;
const common_1 = require("@nestjs/common");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const permissions_guard_1 = require("../auth/permissions.guard");
const permissions_decorator_1 = require("../auth/permissions.decorator");
const orders_service_1 = require("./orders.service");
class CreateOrderItemDto {
    productId;
    qty;
    price;
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateOrderItemDto.prototype, "productId", void 0);
__decorate([
    (0, class_validator_1.IsNumberString)(),
    __metadata("design:type", String)
], CreateOrderItemDto.prototype, "qty", void 0);
__decorate([
    (0, class_validator_1.IsNumberString)(),
    __metadata("design:type", String)
], CreateOrderItemDto.prototype, "price", void 0);
class PaymentDto {
    method;
    amount;
    reference;
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PaymentDto.prototype, "method", void 0);
__decorate([
    (0, class_validator_1.IsNumberString)(),
    __metadata("design:type", String)
], PaymentDto.prototype, "amount", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PaymentDto.prototype, "reference", void 0);
class CreateOrderDto {
    branchId;
    sectionId;
    sectionName;
    tableId;
    status;
    items;
    payment;
    allowOverselling;
    subtotal;
    discount;
    tax;
    total;
    taxRate;
    serviceType;
    waiterId;
    reservationKey;
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateOrderDto.prototype, "branchId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateOrderDto.prototype, "sectionId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateOrderDto.prototype, "sectionName", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], CreateOrderDto.prototype, "tableId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['DRAFT', 'ACTIVE', 'PENDING_PAYMENT', 'SUSPENDED', 'PAID', 'CANCELLED', 'VOIDED', 'REFUNDED']),
    __metadata("design:type", String)
], CreateOrderDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => CreateOrderItemDto),
    __metadata("design:type", Array)
], CreateOrderDto.prototype, "items", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => PaymentDto),
    __metadata("design:type", PaymentDto)
], CreateOrderDto.prototype, "payment", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateOrderDto.prototype, "allowOverselling", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumberString)(),
    __metadata("design:type", String)
], CreateOrderDto.prototype, "subtotal", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumberString)(),
    __metadata("design:type", String)
], CreateOrderDto.prototype, "discount", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumberString)(),
    __metadata("design:type", String)
], CreateOrderDto.prototype, "tax", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumberString)(),
    __metadata("design:type", String)
], CreateOrderDto.prototype, "total", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumberString)(),
    __metadata("design:type", String)
], CreateOrderDto.prototype, "taxRate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateOrderDto.prototype, "serviceType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateOrderDto.prototype, "waiterId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateOrderDto.prototype, "reservationKey", void 0);
class UpdateOrderStatusDto {
    status;
}
let OrdersController = class OrdersController {
    orders;
    constructor(orders) {
        this.orders = orders;
    }
    async list(branchId, from, to, req) {
        const userId = req?.user?.userId;
        const perms = Array.isArray(req?.user?.permissions) ? req.user.permissions : [];
        return this.orders.list(branchId, from, to, userId, perms);
    }
    async get(id) {
        return this.orders.getOne(id);
    }
    async create(dto, req) {
        const userId = req.user?.userId;
        return this.orders.create(dto, userId);
    }
    async updateStatus(id, dto) {
        return this.orders.updateStatus(id, dto.status);
    }
    async refund(id) {
        return this.orders.refund(id);
    }
    async refundItems(id, body) {
        return this.orders.refundItems(id, Array.isArray(body?.items) ? body.items : []);
    }
    async addPayment(id, body) {
        return this.orders.addPayment(id, body);
    }
};
exports.OrdersController = OrdersController;
__decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Get)(),
    (0, permissions_decorator_1.Permissions)('view_pos_sell'),
    __param(0, (0, common_1.Query)('branchId')),
    __param(1, (0, common_1.Query)('from')),
    __param(2, (0, common_1.Query)('to')),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "list", null);
__decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Get)(':id'),
    (0, permissions_decorator_1.Permissions)('view_pos_sell'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "get", null);
__decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Post)(),
    (0, permissions_decorator_1.Permissions)('add_pos_sell'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateOrderDto, Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "create", null);
__decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Patch)(':id/status'),
    (0, permissions_decorator_1.Permissions)('add_pos_sell', 'add_payment'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, UpdateOrderStatusDto]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Post)(':id/refund'),
    (0, permissions_decorator_1.Permissions)('access_all_sale_returns'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "refund", null);
__decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Post)(':id/refund-items'),
    (0, permissions_decorator_1.Permissions)('access_all_sale_returns'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "refundItems", null);
__decorate([
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, common_1.Post)(':id/payments'),
    (0, permissions_decorator_1.Permissions)('add_pos_sell', 'add_payment'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, PaymentDto]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "addPayment", null);
exports.OrdersController = OrdersController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('orders'),
    __metadata("design:paramtypes", [orders_service_1.OrdersService])
], OrdersController);
//# sourceMappingURL=orders.controller.js.map