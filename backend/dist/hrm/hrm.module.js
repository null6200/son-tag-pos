"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HrmModule = void 0;
const common_1 = require("@nestjs/common");
const prisma_module_1 = require("../prisma/prisma.module");
const employees_service_1 = require("./employees.service");
const employees_controller_1 = require("./employees.controller");
const shifts_service_1 = require("./shifts.service");
const shifts_controller_1 = require("./shifts.controller");
const override_pin_service_1 = require("./override-pin.service");
const override_pin_controller_1 = require("./override-pin.controller");
const leaves_service_1 = require("./leaves.service");
const leaves_controller_1 = require("./leaves.controller");
let HrmModule = class HrmModule {
};
exports.HrmModule = HrmModule;
exports.HrmModule = HrmModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule],
        providers: [employees_service_1.EmployeesService, shifts_service_1.HrmShiftsService, override_pin_service_1.OverridePinService, leaves_service_1.HrmLeavesService],
        controllers: [employees_controller_1.EmployeesController, shifts_controller_1.ShiftsController, override_pin_controller_1.OverridePinController, leaves_controller_1.LeavesController],
        exports: [employees_service_1.EmployeesService, shifts_service_1.HrmShiftsService, override_pin_service_1.OverridePinService, leaves_service_1.HrmLeavesService],
    })
], HrmModule);
//# sourceMappingURL=hrm.module.js.map