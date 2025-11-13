"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaxRatesModule = void 0;
const common_1 = require("@nestjs/common");
const taxrates_controller_1 = require("./taxrates.controller");
const taxrates_service_1 = require("./taxrates.service");
let TaxRatesModule = class TaxRatesModule {
};
exports.TaxRatesModule = TaxRatesModule;
exports.TaxRatesModule = TaxRatesModule = __decorate([
    (0, common_1.Module)({
        controllers: [taxrates_controller_1.TaxRatesController],
        providers: [taxrates_service_1.TaxRatesService],
    })
], TaxRatesModule);
//# sourceMappingURL=taxrates.module.js.map