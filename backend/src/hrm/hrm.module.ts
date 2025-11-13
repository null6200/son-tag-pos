import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EmployeesService } from './employees.service';
import { EmployeesController } from './employees.controller';
import { HrmShiftsService } from './shifts.service';
import { ShiftsController } from './shifts.controller';
import { OverridePinService } from './override-pin.service';
import { OverridePinController } from './override-pin.controller';
import { HrmLeavesService } from './leaves.service';
import { LeavesController } from './leaves.controller';

@Module({
  imports: [PrismaModule],
  providers: [EmployeesService, HrmShiftsService, OverridePinService, HrmLeavesService],
  controllers: [EmployeesController, ShiftsController, OverridePinController, LeavesController],
  exports: [EmployeesService, HrmShiftsService, OverridePinService, HrmLeavesService],
})
export class HrmModule {}
