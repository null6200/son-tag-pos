"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SectionFunctionsModule = void 0;
const common_1 = require("@nestjs/common");
const section_functions_controller_1 = require("./section-functions.controller");
const section_functions_service_1 = require("./section-functions.service");
let SectionFunctionsModule = class SectionFunctionsModule {
};
exports.SectionFunctionsModule = SectionFunctionsModule;
exports.SectionFunctionsModule = SectionFunctionsModule = __decorate([
    (0, common_1.Module)({
        controllers: [section_functions_controller_1.SectionFunctionsController],
        providers: [section_functions_service_1.SectionFunctionsService],
        exports: [section_functions_service_1.SectionFunctionsService],
    })
], SectionFunctionsModule);
//# sourceMappingURL=section-functions.module.js.map